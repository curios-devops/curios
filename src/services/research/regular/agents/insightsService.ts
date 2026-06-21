// InsightsService - Regular/Free-tier Insights (Stories) ONLY
// Thin wrapper around the single-agent InsightAgent pipeline.

import { InsightAgent, InsightRequest, InsightResult } from './insightAgent';
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
  // Lazily created on first use — keeps module evaluation side-effect free to
  // avoid the cross-chunk TDZ crash that previously took down this route.
  private agent: InsightAgent | null = null;

  private getAgent(): InsightAgent {
    if (!this.agent) {
      this.agent = new InsightAgent();
      logger.info('InsightsService initialized (Free-tier workflow)');
    }
    return this.agent;
  }

  async performInsightAnalysis(
    query: string,
    onProgress?: InsightProgressCallback,
    focusCategory?: string
  ): Promise<InsightResult> {
    try {
      logger.info('InsightsService: Starting insight analysis', { query, focusCategory });

      const request: InsightRequest = {
        query: query.trim(),
        isPro: false, // Always false for insights service
        focusCategory: focusCategory // No default - let auto-detection work
      };

      const result = await this.getAgent().process(request, onProgress);

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
export type { InsightResult, InsightRequest } from './insightAgent';
