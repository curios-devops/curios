import { InsightAnalyzerAgent, InsightAnalysisRequest as _InsightAnalysisRequest, InsightAnalysisResult } from './insightAnalyzerAgent';
import { InsightWriterAgent, InsightWriterRequest as _InsightWriterRequest, InsightWriterResult } from './insightWriterAgent';
import { InsightsRetrieverAgent, InsightsRetrieverResult } from './InsightsRetrieverAgent';
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
  private retrieverAgent: InsightsRetrieverAgent;
  private writerAgent: InsightWriterAgent;
  private healthMonitor: ServiceHealthMonitor;

  constructor() {
    this.analyzerAgent = new InsightAnalyzerAgent();
    this.retrieverAgent = new InsightsRetrieverAgent();
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

      // Step 2: Search Phase - Simple single search
      const allResults: SearchResult[] = [];
      const allImages: ImageResult[] = [];
      
      try {
        onStatusUpdate?.(
          'Searching for Insights',
          'About 30 seconds remaining',
          40,
          `Tavily search with ${searchQueries.length} combined queries`,
          searchQueries,
          [],
          'RetrieverAgent',
          `Single Tavily call (Brave fallback)`,
          'searching'
        );

        const searchResponse = await this.executeWithHealthCheck(
          () => this.retrieverAgent.execute(searchQueries),
          'RetrieverAgent'
        ) as AgentResponse<InsightsRetrieverResult>;

        if (searchResponse.data) {
          logger.info('InsightSwarmController: Single search completed', {
            resultsCount: searchResponse.data.results.length,
            imagesCount: searchResponse.data.images.length,
            queriesCount: searchQueries.length
          });
          allResults.push(...searchResponse.data.results);
          allImages.push(...searchResponse.data.images);
        }
        
      } catch (error) {
        logger.error('Search failed', { 
          error: error instanceof Error ? error.message : error
        });
      }
      
      logger.info('InsightSwarmController: Search phase completed', {
        totalAPICalls: 1,
        resultsCount: allResults.length,
        targetCount: 10
      });

      // Use results directly (already filtered to top 10)
      const uniqueResults = allResults;

      logger.info('InsightSwarmController: Final results prepared', {
        resultsCount: uniqueResults.length,
        targetCount: 10
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

      // Call WriterAgent DIRECTLY (same as Pro Search pattern) - NO health check wrapper
      let writerResponse: AgentResponse<InsightWriterResult>;
      try {
        logger.info('🔍 [SWARM] Calling InsightWriterAgent', {
          query,
          resultsCount: uniqueResults.length,
          insightAreasCount: insightAreas.length
        });

        // DIRECT CALL (no health check wrapper) - same pattern as Pro Search
        writerResponse = await this.writerAgent.execute({
          query,
          insight_areas: insightAreas,
          search_queries: searchQueries,
          results: uniqueResults,
          analysis_strategy: analysisStrategy
        });

        logger.info('🟢 [SWARM] InsightWriterAgent completed successfully', {
          success: writerResponse.success,
          hasData: !!writerResponse.data,
          reportLength: writerResponse.data?.markdown_report?.length || 0
        });
      } catch (error) {
        logger.error('🔴 [SWARM] InsightWriterAgent failed, using fallback', { 
          error: error instanceof Error ? error.message : error,
          query
        });
        // Provide fallback response when WriterAgent fails (same as Pro Search)
        writerResponse = {
          success: true,
          data: {
            headline: `Strategic Insights: ${query}`,
            subtitle: 'Market Analysis and Strategic Recommendations',
            short_summary: `Strategic analysis of ${query} based on comprehensive research.`,
            markdown_report: this.generateFallbackReport(query, uniqueResults),
            follow_up_questions: this.generateFallbackQuestions(query),
            citations: uniqueResults.slice(0, 5).map((result) => ({
              text: `${result.title} - ${result.content.slice(0, 100)}...`,
              source: {
                title: result.title,
                url: result.url,
                snippet: result.content.slice(0, 200)
              }
            })),
            confidence_level: uniqueResults.length >= 6 ? 75 : 65
          }
        };
      }

      // Build result immediately (same as Pro Search - no delays!)
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
        images: allImages,
        videos: [],
        insight_areas: insightAreas,
        confidence_level: writerResponse.data?.confidence_level || 75
      };

      logger.info('🟢 [SWARM] Insight processing completed', {
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length,
        insightAreasCount: result.insight_areas.length
      });

      // Signal completion AFTER building result - no delays! (same as Pro Search)
      onStatusUpdate?.(
        'Complete',
        'Complete',
        100,
        'Insight generation complete',
        searchQueries,
        uniqueResults.slice(0, 5),
        'Complete',
        'Ready',
        'finalizing'
      );

      return result;

    } catch (error) {
      logger.error('🔴 [SWARM] Insight processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Build error result immediately (same as Pro Search)
      const errorResult = this.getFallbackResult(request.query);
      
      // Signal completion - no delays! (same as Pro Search)
      onStatusUpdate?.(
        'Complete',
        'Complete',
        100,
        'Error occurred',
        [],
        [],
        'Complete',
        'Error',
        'finalizing'
      );
      
      return errorResult;
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

  private generateFallbackReport(query: string, results: SearchResult[]): string {
    const sections = [
      `## Strategic Overview\n\nAnalysis of ${query} identifies actionable opportunities and strategic implications.`,
      `## Key Insights\n\n${results.slice(0, 3).map((r, i) => `### ${i + 1}. ${r.title}\n\n${r.content.slice(0, 120)}...\n\n**Source**: [${r.title}](${r.url})`).join('\n\n')}`,
      `## Strategic Implications\n\n${query} presents several strategic opportunities worth exploring further.`,
      `## Recommendations\n\n- Monitor emerging trends\n- Evaluate competitive positioning\n- Consider strategic partnerships\n- Assess market opportunities`,
      `## Next Steps\n\nContinue monitoring developments and deeper analysis of specific opportunity areas.`
    ];

    return sections.join('\n\n');
  }

  private generateFallbackQuestions(query: string): string[] {
    return [
      `Emerging trends shaping ${query}?`,
      `How to capitalize on ${query} opportunities?`,
      `Competitive advantages in ${query}?`,
      `Strategic risks with ${query}?`,
      `Preparation for ${query} developments?`
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