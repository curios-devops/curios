import { BaseAgent } from './baseAgent';
import { AgentResponse, SearchResult, Perspective } from './types';
import { searchWithBrave } from '../braveService';
import { searchWithTavily } from '../tavilyService';
import { searchWithDuckDuckGo } from '../duckduckgoService';
import { getFallbackResults } from '../fallbackService';

export class RetrieverAgent extends BaseAgent {
  constructor() {
    super(
      'Information Retriever',
      'Collect and compile information from multiple sources'
    );
  }

  async execute(
    query: string, 
    perspectives: Perspective[],
    onStatusUpdate?: (status: string) => void
  ): Promise<AgentResponse> {
    try {
      // Search for main query with retries and fallbacks
      const mainResults = await this.searchWithFallback(query, onStatusUpdate);

      // If no results found for main query, use a more general search
      if (mainResults.length === 0) {
        const generalQuery = this.generateGeneralQuery(query);
        onStatusUpdate?.('Trying broader search terms...');
        const generalResults = await this.searchWithFallback(generalQuery, onStatusUpdate);
        if (generalResults.length > 0) {
          mainResults.push(...generalResults);
        }
      }

      // Search for each perspective in parallel with fallback
      const perspectiveResults = await Promise.all(
        perspectives.map(async (perspective) => {
          onStatusUpdate?.(`Exploring perspective: ${perspective.title}...`);
          const results = await this.searchWithFallback(perspective.title, onStatusUpdate);
          return {
            ...perspective,
            results: results.map(result => ({
              title: result.title,
              url: result.url,
              content: result.content
            }))
          };
        })
      );

      // If we still have no results, use the fallback content
      if (mainResults.length === 0 && perspectiveResults.every(p => p.results.length === 0)) {
        onStatusUpdate?.('Using fallback content sources...');
        return {
          success: true,
          data: this.getFallbackData(query)
        };
      }

      return {
        success: true,
        data: {
          query,
          perspectives: perspectiveResults,
          results: mainResults
        }
      };
    } catch (error) {
      console.error('Retriever error:', error);
      return {
        success: true,
        data: this.getFallbackData(query)
      };
    }
  }

  private generateGeneralQuery(query: string): string {
    return query
      .replace(/\d+/g, '')
      .replace(/['"]/g, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 3)
      .join(' ')
      .trim();
  }

  private async searchWithFallback(
    query: string,
    onStatusUpdate?: (status: string) => void
  ): Promise<SearchResult[]> {
    const errors: Error[] = [];

    // Try Brave first
    try {
      onStatusUpdate?.('Searching with Brave...');
      const { results } = await searchWithBrave(query);
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      errors.push(error as Error);
      onStatusUpdate?.('Brave search failed, trying Tavily...');
    }

    // Try Tavily as first fallback
    try {
      const { results } = await searchWithTavily(query);
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      errors.push(error as Error);
      onStatusUpdate?.('Tavily search failed, trying DuckDuckGo...');
    }

    // Try DuckDuckGo as second fallback
    try {
      const { results } = await searchWithDuckDuckGo(query);
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      errors.push(error as Error);
      onStatusUpdate?.('DuckDuckGo search failed, trying Wikipedia...');
    }

    // Try Wikipedia as final fallback
    try {
      const { results } = await getFallbackResults(query);
      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      errors.push(error as Error);
      onStatusUpdate?.('All search attempts failed, using fallback content...');
    }

    // Log errors without throwing
    if (errors.length > 0) {
      console.log('Search attempts completed with fallbacks');
    }

    return [];
  }

  protected getFallbackData(query: string = ''): any {
    return {
      query,
      perspectives: [],
      results: [{
        title: 'General Information',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        content: `We're currently experiencing high traffic. Please try your search again in a moment.`
      }]
    };
  }
}