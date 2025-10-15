import { ResearchSwarmController, ResearchRequest, ResearchResult } from './researchSwarmController';
import { InsightSwarmController, InsightRequest, InsightResult } from '../../regular/agents/insightSwarmController';
import { logger } from '../../../../utils/logger';

export type ResearchProgressCallback = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    [key: string]: unknown;
  }>,
  currentAgent?: string,
  agentAction?: string,
  researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing'
) => void;

export type InsightProgressCallback = (
  stage: string,
  timeRemaining: string,
  progress: number,
  thinkingStep: string,
  searchTerms?: string[],
  sources?: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    [key: string]: unknown;
  }>,
  currentAgent?: string,
  agentAction?: string,
  insightPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
) => void;

class ResearchService {
  private researchSwarmController: ResearchSwarmController;
  private insightSwarmController: InsightSwarmController;

  constructor() {
    this.researchSwarmController = new ResearchSwarmController();
    this.insightSwarmController = new InsightSwarmController();
  }

  async performResearch(
    query: string,
    isPro: boolean = true,
    onProgress?: ResearchProgressCallback
  ): Promise<ResearchResult> {
    try {
      logger.info('ResearchService: Starting research', { query, isPro });

      const request: ResearchRequest = {
        query: query.trim(),
        isPro
      };

      const result = await this.researchSwarmController.processResearchQuery(request, onProgress);
      
      logger.info('ResearchService: Research completed successfully', {
        query,
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length
      });

      return result;
    } catch (error) {
      logger.error('ResearchService: Research failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async performInsightAnalysis(
    query: string,
    isPro: boolean = false,
    onProgress?: InsightProgressCallback
  ): Promise<InsightResult> {
    try {
      logger.info('ResearchService: Starting insight analysis', { query, isPro });

      const request: InsightRequest = {
        query: query.trim(),
        isPro
      };

      const result = await this.insightSwarmController.processInsightQuery(request, onProgress);
      
      logger.info('ResearchService: Insight analysis completed successfully', {
        query,
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length,
        confidenceLevel: result.confidence_level
      });

      return result;
    } catch (error) {
      logger.error('ResearchService: Insight analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      
      throw new Error(`Insight analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const researchService = new ResearchService();

// Export types for external use
export type { ResearchResult } from './researchSwarmController';
export type { InsightResult } from '../../regular/agents/insightSwarmController';