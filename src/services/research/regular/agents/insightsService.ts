// InsightsService - Regular/Free-tier Insights ONLY
// Maintains strict isolation from pro research workflow
// Independent service for insights analysis

import { InsightSwarmController, InsightRequest, InsightResult } from './insightSwarmController';
import { logger } from '../../../../utils/logger';

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

class InsightsService {
  private insightSwarmController: InsightSwarmController;

  constructor() {
    this.insightSwarmController = new InsightSwarmController();
    logger.info('InsightsService initialized (Free-tier workflow)');
  }

  async performInsightAnalysis(
    query: string,
    onProgress?: InsightProgressCallback
  ): Promise<InsightResult> {
    try {
      logger.info('InsightsService: Starting insight analysis', { query });

      const request: InsightRequest = {
        query: query.trim(),
        isPro: false // Always false for insights service
      };

      const result = await this.insightSwarmController.processInsightQuery(request, onProgress);
      
      logger.info('InsightsService: Insight analysis completed successfully', {
        query,
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length,
        confidenceLevel: result.confidence_level
      });

      return result;
    } catch (error) {
      logger.error('InsightsService: Insight analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      
      throw new Error(`Insight analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const insightsService = new InsightsService();

// Export types for external use
export type { InsightResult, InsightRequest } from './insightSwarmController';
