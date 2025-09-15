import { ResearchRequest, ResearchResult, ResearchProgressCallback, InsightProgressCallback } from './types';
import { ResearchManager } from './pro/agents/researchManager.ts';
import { logger } from '../../utils/logger.ts';

class ResearchService {
  private researchManager: ResearchManager;

  constructor() {
    this.researchManager = new ResearchManager();
  }

  async performResearch(
    query: string,
    searchType: 'web' | 'news' | 'academic' = 'web',
    useProFeatures: boolean = false,
    onProgress?: ResearchProgressCallback
  ): Promise<ResearchResult> {
    try {
      const request: ResearchRequest = {
        query,
        searchType,
        useProFeatures,
        maxResults: 10
      };

      const updateProgress = onProgress || (() => {});
      
      const result = await this.researchManager.conductResearch(
        query,
        (agent, status, progress) => {
          updateProgress(agent, status, progress, '', [], []);
        }
      );

      return {
        success: true,
        data: result,
        metadata: {
          sourcesUsed: result.sources.length,
          modelUsed: useProFeatures ? 'gpt-4' : 'gpt-3.5-turbo'
        }
      };
    } catch (error) {
      logger.error('Research failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      };
    }
  }

  performInsightAnalysis(
    query: string,
    searchType: 'web' | 'news' | 'academic' = 'web',
    useProFeatures: boolean = false,
    onProgress?: InsightProgressCallback
  ): Promise<ResearchResult> {
    // For now, we'll use the same implementation as performResearch
    // but this can be updated to use a different workflow for insights
    return this.performResearch(query, searchType, useProFeatures, onProgress as ResearchProgressCallback);
  }
}

// Export a singleton instance
export const researchService = new ResearchService();
