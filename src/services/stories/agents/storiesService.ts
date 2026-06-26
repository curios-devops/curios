// StoriesService - Regular/Free-tier Insights (Stories) ONLY
// Thin wrapper around the single-agent StoryAgent pipeline.

import { StoryAgent, StoryRequest, StoryResult } from './storyAgent';
import { logger } from '../../../utils/logger';

export type StoryProgressCallback = (
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
  storyPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
) => void;

class StoriesService {
  // Lazily created on first use — keeps module evaluation side-effect free to
  // avoid the cross-chunk TDZ crash that previously took down this route.
  private agent: StoryAgent | null = null;

  private getAgent(): StoryAgent {
    if (!this.agent) {
      this.agent = new StoryAgent();
      logger.info('StoriesService initialized (Free-tier workflow)');
    }
    return this.agent;
  }

  async performStoryAnalysis(
    query: string,
    onProgress?: StoryProgressCallback,
    focusCategory?: string
  ): Promise<StoryResult> {
    try {
      logger.info('StoriesService: Starting insight analysis', { query, focusCategory });

      const request: StoryRequest = {
        query: query.trim(),
        isPro: false, // Always false for insights service
        focusCategory: focusCategory // No default - let auto-detection work
      };

      const result = await this.getAgent().process(request, onProgress);

      logger.info('StoriesService: Insight analysis completed successfully', {
        query,
        reportLength: result.markdown_report.length,
        sourcesCount: result.sources.length,
        confidenceLevel: result.confidence_level
      });

      return result;
    } catch (error) {
      logger.error('StoriesService: Insight analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });

      throw new Error(`Insight analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const storiesService = new StoriesService();

// Export types for external use
export type { StoryResult, StoryRequest } from './storyAgent';
