import { SearchRetrieverAgent } from '../../regular/agents/searchRetrieverAgent.ts';
import { SearchWriterAgent } from '../../regular/agents/searchWriterAgent.ts';
import { ResearchResult, ArticleResult, AgentResponse, SearchResult, Perspective } from '../../../../commonApp/types/index.ts';
import { logger } from '../../../../utils/logger.ts';
import { ServiceHealthMonitor } from '../../../../commonService/utils/serviceHealth.ts';
import type { ImageResult, VideoResult } from '../../../../commonApp/types/index.ts';
import { PerspectiveAgent } from './perspectiveAgent.ts';

// Environment variables are loaded by the parent process

export class SwarmController {
  private writerAgent: SearchWriterAgent;
  private retrieverAgent: SearchRetrieverAgent;
  private perspectiveAgent: PerspectiveAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.writerAgent = new SearchWriterAgent();
    this.retrieverAgent = new SearchRetrieverAgent();
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
      logger.info('SwarmController: Starting RetrieverAgent execution');
      
      // Note: SearchRetrieverAgent.execute signature is: (query, onStatusUpdate, imageUrls)
      // It does not accept isPro parameter - the agent automatically handles Brave + Apify fallback
      const searchResponse = await this.executeWithHealthCheck(
        () => this.retrieverAgent.execute(query, onStatusUpdate, []),
        'RetrieverAgent'
      ) as AgentResponse<{
        results: SearchResult[];
        images: ImageResult[];
        videos: VideoResult[];
      }>;

      logger.info('SwarmController: RetrieverAgent completed', {
        hasResults: !!searchResponse.data,
        resultsCount: searchResponse.data?.results?.length || 0
      });

      // For Pro searches, generate perspectives
      let perspectives: Perspective[] = [];
      if (isPro) {
        onStatusUpdate?.('Analyzing different perspectives...');
        logger.info('SwarmController: Starting PerspectiveAgent execution');
        
        try {
          perspectives = await this.getPerspectives(query, isPro);
        } catch (error) {
          logger.warn('Perspective generation failed:', error);
          // Continue without perspectives
        }
      }

      // Generate article using WriterAgent based on the main query and retrieved perspectives.
      onStatusUpdate?.('Crafting a comprehensive answer...');
      logger.info('SwarmController: Starting WriterAgent execution', {
        query,
        perspectivesCount: perspectives.length,
        resultsCount: searchResponse.data?.results?.length || 0,
        imagesCount: searchResponse.data?.images?.length || 0,
        videosCount: searchResponse.data?.videos?.length || 0
      });

      // Call WriterAgent DIRECTLY (same as regular search does)
      // Remove the executeWithHealthCheck wrapper to match regular search pattern
      let writerResponse: AgentResponse<ArticleResult>;
      try {
        // 🔍 IMPORTANT: Pass complete research data to WriterAgent
        // Must match regular search format: query, perspectives, results, images, videos, isReverseImageSearch
        const researchData = {
          query,
          perspectives,
          results: searchResponse.data?.results || [],
          images: searchResponse.data?.images || [],
          videos: searchResponse.data?.videos || [],
          isReverseImageSearch: false // Pro search doesn't support image upload yet
        };

        console.log('🔍 [SWARM] Calling WriterAgent with research data:', {
          query: researchData.query,
          resultsCount: researchData.results.length,
          imagesCount: researchData.images.length,
          videosCount: researchData.videos.length,
          perspectivesCount: researchData.perspectives.length
        });

        // DIRECT CALL (no health check wrapper) - same pattern as regular search
        writerResponse = await this.writerAgent.execute({
          query,
          researchResult: researchData
        });

        logger.info('SwarmController: WriterAgent completed successfully', {
          success: writerResponse.success,
          hasData: !!writerResponse.data,
          contentLength: writerResponse.data?.content?.length || 0
        });
      } catch (error) {
        logger.error('WriterAgent failed, using fallback response', { 
          error: error instanceof Error ? error.message : error,
          query
        });
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
            citations: searchResponse.data?.results?.map((r: SearchResult) => ({
              url: r.url,
              title: r.title,
              siteName: this.extractSiteName(r.url)
            })) || []
          }
        };
      }

      logger.info('Query processing completed', {
        hasResults: (searchResponse.data?.results?.length || 0) > 0,
        hasPerspectives: perspectives.length > 0,
        hasImages: (searchResponse.data?.images?.length || 0) > 0,
        hasVideos: (searchResponse.data?.videos?.length || 0) > 0
      });

      // Critical: Signal completion to frontend with explicit completion status
      onStatusUpdate?.('Search completed successfully!');
      
      // Add small delay to ensure status update is processed by the frontend
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = {
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
      
      return result;
    } catch (error) {
      logger.error('Query processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      
      // Ensure completion status is sent even on error
      onStatusUpdate?.('Search completed with errors - showing available results');
      
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

  private async getPerspectives(query: string, isPro: boolean = false): Promise<Perspective[]> {
    try {
      logger.info('Fetching perspectives for query:', { query, isPro });
      
      // Use the unified perspective agent to get combined results, passing Pro status
      const perspectives = await this.perspectiveAgent.generatePerspectives(query, isPro);
      
      // Convert to the expected Perspective format
      return perspectives.map(p => ({
        id: p.id,
        title: p.title,
        content: p.content,
        description: p.content.substring(0, 200), // Add description field
        source: p.source,
        relevance: p.relevance,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Failed to get perspectives:', error);
      return [];
    }
  }

  private extractSiteName(url: string): string {
    const urlObject = new URL(url);
    return urlObject.hostname.replace('www.', '');
  }
}
