// ResearchService - Pro Research ONLY
// Maintains strict isolation from regular/insights workflow
// For insights, use insightsService from regular/agents

import { ResearchSwarmController, ResearchRequest, ResearchResult } from './researchSwarmController';
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

class ResearchService {
  private researchSwarmController: ResearchSwarmController;

  constructor() {
    this.researchSwarmController = new ResearchSwarmController();
    logger.info('ResearchService initialized (Pro workflow)');
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

}

// Export singleton instance
export const researchService = new ResearchService();

// Export types for external use
export type { ResearchResult, ResearchRequest } from './researchSwarmController';