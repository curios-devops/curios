import { RetrieverAgent } from '../search/regular/agents/retrieverAgent';
import { ResearchPlannerAgent } from './pro/agents/researchPlannerAgent';
import { ResearchWriterAgent } from './pro/agents/researchWriterAgent';
import { AgentResponse, SearchResult, Perspective } from '../../commonApp/types/index';
import { logger } from '../../utils/logger';
import { ServiceHealthMonitor } from '../../commonService/utils/serviceHealth';
import type { ImageResult, VideoResult } from '../../commonApp/types/index';

export interface ResearchRequest {
  query: string;
  focusMode?: string;
  isPro?: boolean;
}

export interface ResearchResult {
  query: string;
  headline: string;
  subtitle: string;
  short_summary: string;
  markdown_report: string;
  follow_up_questions: string[];
  thinking_process: string;
  progress_updates: string[];
  search_queries: string[];
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    image?: string;
    relevance_score?: number;
  }>;
  agent_contributions: Record<string, unknown>;
  citations: Array<{ text: string; source: any }>;
  images?: ImageResult[];
  videos?: VideoResult[];
}

export class ResearchSwarmController {
  private plannerAgent: ResearchPlannerAgent;
  private retrieverAgent: RetrieverAgent;
  private writerAgent: ResearchWriterAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.plannerAgent = new ResearchPlannerAgent();
    this.retrieverAgent = new RetrieverAgent();
    this.writerAgent = new ResearchWriterAgent();
    this.healthMonitor = ServiceHealthMonitor.getInstance();
  }

  async processResearchQuery(
    request: ResearchRequest,
    onStatusUpdate?: (
      stage: string,
      timeRemaining: string,
      progress: number,
      thinkingStep: string,
      searchTerms?: string[],
      sources?: any[],
      currentAgent?: string,
      agentAction?: string,
      researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing'
    ) => void
  ): Promise<ResearchResult> {
    try {
      const { query, focusMode = 'web', isPro = true } = request;

      // Validate the query
      if (!query?.trim()) {
        throw new Error('Research query cannot be empty');
      }

      logger.info('Starting research query processing', { query, focusMode, isPro });

      // Step 1: Planning Phase
      onStatusUpdate?.(
        'Analyzing Query Complexity',
        'About 3-5 minutes remaining',
        10,
        'Research Planner analyzing query and creating research strategy',
        [],
        [],
        'ResearchPlanner',
        'Analyzing query complexity and planning research approach',
        'planning'
      );

      const planResponse = await this.executeWithHealthCheck(
        () => this.plannerAgent.execute({ query, focusMode }),
        'ResearchPlannerAgent'
      ) as AgentResponse<{
        complexity: string;
        search_queries: string[];
        research_strategy: string;
        thinking_process: string;
      }>;

      const searchQueries = planResponse.data?.search_queries || [query];
      const thinkingProcess = planResponse.data?.thinking_process || '';

      logger.info('ResearchSwarmController: Planning completed', {
        searchQueriesCount: searchQueries.length,
        complexity: planResponse.data?.complexity
      });

      // Step 2: Search Phase
      onStatusUpdate?.(
        'Conducting Comprehensive Research',
        'About 2-3 minutes remaining',
        30,
        'Retriever Agent executing multi-query search strategy',
        searchQueries,
        [],
        'RetrieverAgent',
        'Executing comprehensive search across multiple reliable sources',
        'searching'
      );

      // Execute searches for all planned queries
      const allResults: SearchResult[] = [];
      const allImages: ImageResult[] = [];
      const allVideos: VideoResult[] = [];

      for (const searchQuery of searchQueries.slice(0, 3)) { // Limit to 3 queries
        try {
          const searchResponse = await this.executeWithHealthCheck(
            () => this.retrieverAgent.execute(searchQuery, [], isPro, 
              (status: string) => onStatusUpdate?.(
                'Searching Sources',
                'About 2-3 minutes remaining',
                40 + (searchQueries.indexOf(searchQuery) * 10),
                `Searching for: ${searchQuery}`,
                searchQueries,
                [],
                'RetrieverAgent',
                `Searching: ${searchQuery}`,
                'searching'
              )
            ),
            'RetrieverAgent'
          ) as AgentResponse<{
            results: SearchResult[];
            images: ImageResult[];
            videos: VideoResult[];
          }>;

          if (searchResponse.data) {
            allResults.push(...(searchResponse.data.results || []));
            allImages.push(...(searchResponse.data.images || []));
            allVideos.push(...(searchResponse.data.videos || []));
          }
        } catch (error) {
          logger.warn(`Search failed for query: ${searchQuery}`, error);
        }
      }

      // Remove duplicates and limit results
      const uniqueResults = this.deduplicateResults(allResults).slice(0, 15);
      const uniqueImages = this.deduplicateImages(allImages).slice(0, 10);
      const uniqueVideos = this.deduplicateVideos(allVideos).slice(0, 5);

      logger.info('ResearchSwarmController: Search phase completed', {
        totalResults: uniqueResults.length,
        totalImages: uniqueImages.length,
        totalVideos: uniqueVideos.length
      });

      // Step 3: Analysis & Synthesis Phase
      onStatusUpdate?.(
        'Analyzing and Synthesizing Research',
        'About 1-2 minutes remaining',
        70,
        'Research Writer analyzing findings and creating comprehensive report',
        searchQueries,
        uniqueResults.slice(0, 5),
        'ResearchWriter',
        'Analyzing research findings and synthesizing comprehensive report',
        'synthesizing'
      );

      const writerResponse = await this.executeWithHealthCheck(
        () => this.writerAgent.execute({
          query,
          focusMode,
          search_queries: searchQueries,
          results: uniqueResults,
          thinking_process: thinkingProcess
        }),
        'ResearchWriterAgent'
      ) as AgentResponse<{
        headline: string;
        subtitle: string;
        short_summary: string;
        markdown_report: string;
        follow_up_questions: string[];
        citations: Array<{ text: string; source: any }>;
      }>;

      // Step 4: Final Assembly
      onStatusUpdate?.(
        'Finalizing Research Report',
        'Almost complete',
        90,
        'Assembling final research report with citations and metadata',
        searchQueries,
        uniqueResults.slice(0, 5),
        'ResearchSwarmController',
        'Finalizing research report and citations',
        'citing'
      );

      const result: ResearchResult = {
        query,
        headline: writerResponse.data?.headline || `Research Report: ${query}`,
        subtitle: writerResponse.data?.subtitle || 'Comprehensive Analysis',
        short_summary: writerResponse.data?.short_summary || 'Research summary not available',
        markdown_report: writerResponse.data?.markdown_report || 'Report content not available',
        follow_up_questions: writerResponse.data?.follow_up_questions || [],
        thinking_process: thinkingProcess,
        progress_updates: [],
        search_queries: searchQueries,
        sources: uniqueResults.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          image: r.image
        })),
        agent_contributions: {
          planner: planResponse.data || {},
          writer: writerResponse.data || {}
        },
        citations: writerResponse.data?.citations || [],
        images: uniqueImages,
        videos: uniqueVideos
      };

      onStatusUpdate?.(
        'Research Complete',
        'Complete',
        100,
        'Research report ready for review',
        searchQueries,
        uniqueResults.slice(0, 5),
        'Complete',
        'Research completed successfully',
        'citing'
      );

      logger.info('Research query processing completed successfully');
      return result;

    } catch (error) {
      logger.error('Research query processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });
      
      // Return error fallback
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = result.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private deduplicateImages(images: ImageResult[]): ImageResult[] {
    const seen = new Set<string>();
    return images.filter(image => {
      const key = image.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private deduplicateVideos(videos: VideoResult[]): VideoResult[] {
    const seen = new Set<string>();
    return videos.filter(video => {
      const key = video.url.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}