import { BaseAgent } from './baseAgent';
import { AgentResponse, SearchResult, Perspective } from './types';
import { searchAcrossInstances } from '../searxService';
import { searchWithTavily } from '../tavilyService';

export class RetrieverAgent extends BaseAgent {
  constructor() {
    super(
      'Information Retriever',
      'Collect and compile information from multiple sources'
    );
  }

  async execute(query: string, perspectives: Perspective[]): Promise<AgentResponse> {
    try {
      // Collect information for main query and each perspective in parallel
      const searchPromises = [
        this.searchWithFallback(query),
        ...perspectives.map(p => this.searchWithFallback(p.title))
      ];

      const results = await Promise.all(searchPromises);
      const combinedResults = results.flat();

      return {
        success: true,
        data: {
          query,
          perspectives,
          results: combinedResults
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async searchWithFallback(query: string): Promise<SearchResult[]> {
    try {
      return await searchAcrossInstances(query);
    } catch (error) {
      console.warn('SearxNG search failed, falling back to Tavily:', error);
      return await searchWithTavily(query);
    }
  }
}