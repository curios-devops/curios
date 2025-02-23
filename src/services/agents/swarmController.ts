import { UIAgent } from './uiAgent';
import { PerspectiveAgent } from './perspectiveAgent';
import { RetrieverAgent } from './retrieverAgent';
import { WriterAgent } from './writerAgent';
import { ResearchResult, ArticleResult } from './types';
import { logger } from '../../utils/logger';
import { ServiceHealthMonitor } from '../serviceHealth';

export class SwarmController {
  private uiAgent: UIAgent;
  private writerAgent: WriterAgent;
  private retrieverAgent: RetrieverAgent;
  private perspectiveAgent: PerspectiveAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.uiAgent = new UIAgent();
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
    images: any[];
    videos: any[];
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
      );

      // For Pro searches, generate perspectives
      let perspectives = [];
      if (isPro) {
        onStatusUpdate?.('Analyzing different perspectives...');
        try {
          const perspectiveResponse = await this.executeWithHealthCheck(
            () => this.perspectiveAgent.execute(query),
            'PerspectiveAgent'
          );
          perspectives = perspectiveResponse.data?.perspectives || [];
        } catch (error) {
          logger.warn('Perspective generation failed:', error);
          // Continue without perspectives
        }
      }

      // Generate article using WriterAgent based on the main query and retrieved perspectives.
      onStatusUpdate?.('Crafting a comprehensive answer...');
      const writerResponse = await this.executeWithHealthCheck(
        () =>
          this.writerAgent.execute({
            query,
            perspectives,
            results: searchResponse.data?.results || []
          }),
        'WriterAgent'
      );

      logger.info('Query processing completed', {
        hasResults: searchResponse.data?.results?.length > 0,
        hasPerspectives: perspectives.length > 0,
        hasImages: searchResponse.data?.images?.length > 0,
        hasVideos: searchResponse.data?.videos?.length > 0
      });

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
