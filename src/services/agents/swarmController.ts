import { PerspectiveAgent } from './perspectiveAgent';
import { RetrieverAgent } from './retrieverAgent';
import { WriterAgent } from './writerAgent';
import { ResearchResult, ArticleResult, AgentResponse, SearchResult, Perspective } from './types';
import { logger } from '../../utils/logger';
import { ServiceHealthMonitor } from '../serviceHealth';
import type { ImageResult, VideoResult } from '../../types';

export class SwarmController {
  private writerAgent: WriterAgent;
  private retrieverAgent: RetrieverAgent;
  private perspectiveAgent: PerspectiveAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.writerAgent = new WriterAgent();
    this.retrieverAgent = new RetrieverAgent();
    this.perspectiveAgent = new PerspectiveAgent();
    this.healthMonitor = ServiceHealthMonitor.getInstance();
  }

  async processQuery(
    query: string,
    onStatusUpdate?: (status: string) => void,
    isPro: boolean = false
  ): Promise<{
    research: ResearchResult;
    article: ArticleResult;
    images: ImageResult[];
    videos: VideoResult[];
  }> {
    try {
      // Validate the query
      if (!query?.trim()) {
        throw new Error('Search query cannot be empty');
      }
      logger.info('Starting query processing', { query, isPro });

      // Use RetrieverAgent to get research results
      onStatusUpdate?.('Searching through reliable sources...');
      const searchResponse = await this.executeWithHealthCheck(
        () => this.retrieverAgent.execute(query, [], isPro, onStatusUpdate),
        'RetrieverAgent'
      ) as AgentResponse<{
        results: SearchResult[];
        images: ImageResult[];
        videos: VideoResult[];
      }>;

      // For Pro searches, generate perspectives
      let perspectives: Perspective[] = [];
      if (isPro) {
        onStatusUpdate?.('Analyzing different perspectives...');
        try {
          const perspectiveResponse = await this.executeWithHealthCheck(
            () => this.perspectiveAgent.execute(query),
            'PerspectiveAgent'
          ) as AgentResponse<{ perspectives: Perspective[] }>;
          perspectives = perspectiveResponse.data?.perspectives || [];
        } catch (error) {
          logger.warn('Perspective generation failed:', error);
          // Continue without perspectives
        }
      }

      // Generate article using WriterAgent based on the main query and retrieved perspectives.
      onStatusUpdate?.('Crafting a comprehensive answer...');
      logger.info('SwarmController calling WriterAgent', {
        query,
        perspectivesCount: perspectives.length,
        resultsCount: searchResponse.data?.results?.length || 0
      });

      // Add explicit timeout for WriterAgent execution
      let writerResponse: AgentResponse<ArticleResult>;
      try {
        writerResponse = await Promise.race([
          this.executeWithHealthCheck(
            () =>
              this.writerAgent.execute({
                query,
                perspectives,
                results: searchResponse.data?.results || []
              }),
            'WriterAgent'
          ) as Promise<AgentResponse<ArticleResult>>,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('WriterAgent timeout after 45 seconds')), 45000) // Increased from 30 to 45 seconds
          )
        ]);

        logger.info('SwarmController received WriterAgent response', {
          success: writerResponse.success,
          hasData: !!writerResponse.data
        });
      } catch (error) {
        logger.warn('WriterAgent failed, using fallback response', { error });
        // Provide fallback response when WriterAgent fails
        writerResponse = {
          success: true,
          data: {
            content: `Based on the search results for "${query}", here are the key findings:\n\n${
              searchResponse.data?.results?.slice(0, 3)
                .map((result: SearchResult, index: number) => `${index + 1}. **${result.title}** - ${result.content.slice(0, 200)}...`)
                .join('\n\n') || 'No detailed results available.'
            }`,
            followUpQuestions: [
              `What are the latest developments regarding ${query}?`,
              `How does ${query} impact different industries?`,
              `What are the main challenges with ${query}?`
            ],
            citations: searchResponse.data?.results?.map((r: SearchResult) => r.url) || []
          }
        };
      }

      logger.info('Query processing completed', {
        hasResults: searchResponse.data?.results?.length > 0,
        hasPerspectives: perspectives.length > 0,
        hasImages: searchResponse.data?.images?.length > 0,
        hasVideos: searchResponse.data?.videos?.length > 0
      });

      // Final status update to indicate completion
      onStatusUpdate?.('Finalizing results...');

      return {
        research: {
          query,
          perspectives,
          results: searchResponse.data?.results || []
        },
        article: writerResponse.data || {
          content:
            'We apologize, but we could not process your search at this time. Please try again in a moment.',
          followUpQuestions: [],
          citations: []
        },
        images: searchResponse.data?.images || [],
        videos: searchResponse.data?.videos || []
      };
    } catch (error) {
      logger.error('Query processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      return {
        research: {
          query,
          perspectives: [],
          results: []
        },
        article: {
          content:
            'We apologize, but we could not process your search at this time. Please try again in a moment.',
          followUpQuestions: [],
          citations: []
        },
        images: [],
        videos: []
      };
    }
  }

  private async executeWithHealthCheck<T>(
    operation: () => Promise<T>,
    serviceName: string
  ): Promise<T> {
    try {
      if (!this.healthMonitor.isHealthy(serviceName)) {
        throw new Error(`Service ${serviceName} is currently unavailable`);
      }
      const result = await operation();
      this.healthMonitor.reportSuccess(serviceName);
      return result;
    } catch (error) {
      this.healthMonitor.reportFailure(serviceName);
      throw error;
    }
  }
}
