import { InsightAnalyzerAgent, InsightAnalysisRequest as _InsightAnalysisRequest, InsightAnalysisResult } from './insightAnalyzerAgent';
import { InsightWriterAgent, InsightWriterRequest as _InsightWriterRequest, InsightWriterResult } from './insightWriterAgent';
import { SearchRetrieverAgent } from '../../../search/regular/agents/searchRetrieverAgent';
import { AgentResponse, SearchResult, ImageResult, VideoResult } from '../../../../commonApp/types/index';
import { logger } from '../../../../utils/logger';
import { ServiceHealthMonitor } from '../../../../commonService/utils/serviceHealth';

export interface InsightRequest {
  query: string;
  isPro?: boolean;
}

export interface InsightResult {
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
  citations: Array<{ text: string; source: { url: string; title?: string } }>;
  images?: ImageResult[];
  videos?: VideoResult[];
  insight_areas: string[];
  confidence_level: number;
}

export class InsightSwarmController {
  private analyzerAgent: InsightAnalyzerAgent;
  private retrieverAgent: SearchRetrieverAgent;
  private writerAgent: InsightWriterAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.analyzerAgent = new InsightAnalyzerAgent();
    this.retrieverAgent = new SearchRetrieverAgent();
    this.writerAgent = new InsightWriterAgent();
    this.healthMonitor = ServiceHealthMonitor.getInstance();
  }

  async processInsightQuery(
    request: InsightRequest,
    onStatusUpdate?: (
      stage: string,
      timeRemaining: string,
      progress: number,
      thinkingStep: string,
      searchTerms?: string[],
      sources?: Array<{ url: string; title?: string; snippet?: string }>,
      currentAgent?: string,
      agentAction?: string,
      insightPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
    ) => void
  ): Promise<InsightResult> {
    try {
      const { query, isPro = false } = request;

      // Validate the query
      if (!query?.trim()) {
        throw new Error('Insight query cannot be empty');
      }

      logger.info('Starting insight query processing', { query, isPro });

      // Step 1: Analysis Phase
      onStatusUpdate?.(
        'Analyzing Query for Insight Opportunities',
        'About 2-3 minutes remaining',
        10,
        'Insight Analyzer identifying key areas for actionable insights',
        [],
        [],
        'InsightAnalyzer',
        'Analyzing query complexity and identifying insight opportunities',
        'analyzing'
      );

      const analysisResponse = await this.executeWithHealthCheck(
        () => this.analyzerAgent.execute({ query }),
        'InsightAnalyzerAgent'
      ) as AgentResponse<InsightAnalysisResult>;

      const searchQueries = analysisResponse.data?.search_queries || [query];
      const insightAreas = analysisResponse.data?.insight_areas || [];
      const analysisStrategy = analysisResponse.data?.analysis_strategy || '';

      logger.info('InsightSwarmController: Analysis completed', {
        searchQueriesCount: searchQueries.length,
        insightAreasCount: insightAreas.length
      });

      // Step 2: Search Phase
      onStatusUpdate?.(
        'Conducting Targeted Research for Insights',
        'About 1-2 minutes remaining',
        30,
        'Retriever Agent searching for trend data and analytical sources',
        searchQueries,
        [],
        'RetrieverAgent',
        'Executing targeted search for insight-rich sources',
        'searching'
      );

      // Execute searches for all planned queries
      const allResults: SearchResult[] = [];
      const allImages: ImageResult[] = [];
      const allVideos: VideoResult[] = [];

      for (const searchQuery of searchQueries.slice(0, 3)) {
        try {
          onStatusUpdate?.(
            'Searching Insight Sources',
            'About 1-2 minutes remaining',
            40 + (searchQueries.indexOf(searchQuery) * 10),
            `Searching for insights: ${searchQuery}`,
            searchQueries,
            [],
            'RetrieverAgent',
            `Searching: ${searchQuery}`,
            'searching'
          );

          const searchResponse = await this.executeWithHealthCheck(
            () => this.retrieverAgent.execute(
              searchQuery,
              (status: string) => logger.info('Search status:', status)
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
      const uniqueResults = this.deduplicateResults(allResults).slice(0, 12);
      const uniqueImages = this.deduplicateImages(allImages).slice(0, 8);
      const uniqueVideos = this.deduplicateVideos(allVideos).slice(0, 3);

      logger.info('InsightSwarmController: Search phase completed', {
        totalResults: uniqueResults.length,
        totalImages: uniqueImages.length,
        totalVideos: uniqueVideos.length
      });

      // Step 3: Synthesis & Insight Generation Phase
      onStatusUpdate?.(
        'Generating Actionable Insights',
        'Almost complete',
        70,
        'Insight Writer synthesizing data into actionable intelligence',
        searchQueries,
        uniqueResults.slice(0, 5),
        'InsightWriter',
        'Analyzing patterns and generating strategic insights',
        'synthesizing'
      );

      const writerResponse = await this.executeWithHealthCheck(
        () => this.writerAgent.execute({
          query,
          insight_areas: insightAreas,
          search_queries: searchQueries,
          results: uniqueResults,
          analysis_strategy: analysisStrategy
        }),
        'InsightWriterAgent'
      ) as AgentResponse<InsightWriterResult>;

      // Step 4: Final Assembly
      onStatusUpdate?.(
        'Finalizing Insight Report',
        'Complete',
        90,
        'Assembling final insight report with confidence assessment',
        searchQueries,
        uniqueResults.slice(0, 5),
        'InsightSwarmController',
        'Finalizing actionable insights and recommendations',
        'finalizing'
      );

      const result: InsightResult = {
        query,
        headline: writerResponse.data?.headline || `Strategic Insights: ${query}`,
        subtitle: writerResponse.data?.subtitle || 'Actionable Intelligence and Recommendations',
        short_summary: writerResponse.data?.short_summary || `Strategic analysis of ${query} with actionable recommendations.`,
        markdown_report: writerResponse.data?.markdown_report || this.generateFallbackReport(query, uniqueResults),
        follow_up_questions: writerResponse.data?.follow_up_questions || this.generateFallbackQuestions(query),
        thinking_process: analysisStrategy,
        progress_updates: [
          'Query analysis completed',
          'Strategic search executed',
          'Insights synthesized',
          'Recommendations generated'
        ],
        search_queries: searchQueries,
        sources: uniqueResults.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.content.slice(0, 200),
          image: result.image,
          relevance_score: 0.8
        })),
        agent_contributions: {
          InsightAnalyzer: { insight_areas: insightAreas, strategy: analysisStrategy },
          RetrieverAgent: { sources_found: uniqueResults.length },
          InsightWriter: { insights_generated: writerResponse.data?.follow_up_questions?.length || 0 }
        },
        citations: writerResponse.data?.citations || [],
        images: uniqueImages,
        videos: uniqueVideos,
        insight_areas: insightAreas,
        confidence_level: writerResponse.data?.confidence_level || 75
      };

      onStatusUpdate?.(
        'Insight Analysis Complete',
        'Ready to explore',
        100,
        'Strategic insights successfully generated with actionable recommendations',
        searchQueries,
        uniqueResults.slice(0, 5),
        'Complete',
        'Insight report ready for review',
        'finalizing'
      );

      logger.info('InsightSwarmController: Processing completed successfully', {
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length,
        insightAreasCount: result.insight_areas.length
      });

      return result;

    } catch (error) {
      logger.error('InsightSwarmController: Processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Return fallback result
      return this.getFallbackResult(request.query);
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
      const key = `${result.title}-${result.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateImages(images: ImageResult[]): ImageResult[] {
    const seen = new Set<string>();
    return images.filter(image => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
  }

  private deduplicateVideos(videos: VideoResult[]): VideoResult[] {
    const seen = new Set<string>();
    return videos.filter(video => {
      if (seen.has(video.url)) return false;
      seen.add(video.url);
      return true;
    });
  }

  private generateFallbackReport(query: string, results: SearchResult[]): string {
    const sections = [
      `## Strategic Overview\n\nThis insight analysis examines ${query} to identify actionable opportunities and strategic implications.`,
      `## Key Insights\n\n${results.slice(0, 3).map((r, i) => `### ${i + 1}. ${r.title}\n\n${r.content.slice(0, 150)}...\n\n**Source**: [${r.title}](${r.url})`).join('\n\n')}`,
      `## Strategic Implications\n\nBased on the analysis, ${query} presents several strategic opportunities worth exploring further.`,
      `## Recommendations\n\n- Monitor emerging trends in ${query}\n- Evaluate competitive positioning\n- Consider strategic partnerships\n- Assess market opportunities`,
      `## Next Steps\n\nContinue monitoring developments and consider deeper analysis of specific opportunity areas.`
    ];

    return sections.join('\n\n');
  }

  private generateFallbackQuestions(query: string): string[] {
    return [
      `What emerging trends are shaping ${query}?`,
      `How can organizations capitalize on ${query} opportunities?`,
      `What competitive advantages exist in ${query}?`,
      `What are the strategic risks associated with ${query}?`,
      `How should businesses prepare for ${query} developments?`
    ];
  }

  private getFallbackResult(query: string): InsightResult {
    return {
      query,
      headline: `Strategic Insights: ${query}`,
      subtitle: 'Analysis Based on Available Information',
      short_summary: `Strategic analysis of ${query} with focus on actionable insights and recommendations.`,
      markdown_report: this.generateFallbackReport(query, []),
      follow_up_questions: this.generateFallbackQuestions(query),
      thinking_process: `Strategic analysis approach for ${query}`,
      progress_updates: ['Analysis initiated', 'Data gathered', 'Insights generated'],
      search_queries: [query],
      sources: [],
      agent_contributions: {},
      citations: [],
      images: [],
      videos: [],
      insight_areas: [`Strategic analysis of ${query}`, 'Market opportunities', 'Competitive positioning'],
      confidence_level: 60
    };
  }
}