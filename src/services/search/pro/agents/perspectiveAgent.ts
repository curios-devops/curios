// Environment variables are loaded by the parent process
import { logger } from '../../../../utils/logger.ts';
import { ApifySearchTool } from '../../../../common/tools/search/apifySearch.ts';

// Type for Tavily API response
interface TavilySearchResponse {
  results: Array<{
    title?: string;
    url?: string;
    content?: string;
    snippet?: string;
    score?: number;
    published_date?: string;
  }>;
}


interface SearchResult {
  title: string;
  url: string;
  content: string;
  source: string;
  score?: number;
  publishedDate?: string;
}

interface Perspective {
  id: string;
  title: string;
  content: string;
  source: string;
  relevance: number;
}

/**
 * Unified PerspectiveAgent that combines Apify and Tavily search results
 * to provide comprehensive search perspectives.
 */
export class PerspectiveAgent {
  private apifyTool: ApifySearchTool | null = null;
  private tavilyApiKey: string;
  private apiKeys: {
    apify: string;
    tavily: string;
  };
  private isServer: boolean;

  constructor() {
    this.isServer = typeof window === 'undefined';
    this.apiKeys = {
      apify: import.meta.env.VITE_APIFY_API_KEY || '',
      tavily: import.meta.env.VITE_TAVILY_API_KEY || ''
    };
    
    // Only initialize Apify on the server side
    if (this.isServer && this.apiKeys.apify) {
      try {
        this.apifyTool = new ApifySearchTool(this.apiKeys.apify);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Failed to initialize Apify:', errorMessage);
        this.apifyTool = null;
      }
    }
    
    this.tavilyApiKey = this.apiKeys.tavily;
  }

  /**
   * Executes search with appropriate provider based on Pro status
   * APify is only used for Pro searches, regular searches use only Tavily
   */
  async search(query: string, options: { maxResults?: number; isPro?: boolean } = {}): Promise<SearchResult[]> {
    try {
      logger.info('PerspectiveAgent: Starting search', { query, isPro: options.isPro });
      
      if (options.isPro) {
        // Pro mode: Execute both searches in parallel
        const [apifyResults, tavilyResults] = await Promise.all([
          this.searchWithApify(query, options),
          this.searchWithTavily(query, options)
        ]);

        // Combine and deduplicate results
        const allResults = [...apifyResults, ...tavilyResults];
        const uniqueResults = Array.from(new Map(allResults.map(item => [item.url, item])).values());

        // Sort by score (if available) or relevance
        return uniqueResults.sort((a, b) => (b.score || 0.5) - (a.score || 0.5));
      } else {
        // Regular mode: Only use Tavily, skip APify completely
        logger.info('PerspectiveAgent: Regular search mode - using Tavily only');
        const tavilyResults = await this.searchWithTavily(query, options);
        return tavilyResults.sort((a, b) => (b.score || 0.5) - (a.score || 0.5));
      }
    } catch (error) {
      logger.error('PerspectiveAgent search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates perspectives based on search results
   */
  async generatePerspectives(query: string, isPro: boolean = false): Promise<Perspective[]> {
    const results = await this.search(query, { maxResults: 10, isPro });
    
    return results.map((result, index) => ({
      id: `perspective-${index}`,
      title: result.title,
      content: result.content,
      source: result.source || 'web',
      relevance: result.score || 0.5
    }));
  }

  /**
   * Search using Apify's Google Search Scraper
   */
  private async searchWithApify(query: string, options: { maxResults?: number } = {}): Promise<SearchResult[]> {
    if (!this.isServer || !this.apiKeys.apify) {
      logger.debug('Skipping Apify search - not available in this environment');
      return [];
    }

    try {
      if (!this.apifyTool) {
        // Lazy initialization if not done in constructor
        this.apifyTool = new ApifySearchTool(this.apiKeys.apify);
      }

      const results = await this.apifyTool.search({
        queries: query,
        resultsPerPage: options.maxResults || 5,
        apiKey: this.apiKeys.apify
      });

      return results.map(result => ({
        ...result,
        content: result.content || result.snippet || '',
        source: 'apify',
        publishedDate: new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Apify search failed:', error);
      return [];
    }
  }

  /**
   * Search using Tavily's Search API
   */
  private async searchWithTavily(
    query: string, 
    options: { maxResults?: number } = {}
  ): Promise<SearchResult[]> {
    if (!this.tavilyApiKey) {
      logger.warn('Tavily API key not configured, skipping Tavily search');
      return [];
    }

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tavilyApiKey}`
        },
        body: JSON.stringify({
          query,
          max_results: options.maxResults || 10,
          include_answer: true,
          include_raw_content: true,
        })
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      const data: TavilySearchResponse = await response.json();

return (data.results || []).map((result) => ({
        title: result.title || '',
        url: result.url || '',
        content: result.content || result.snippet || '',
        source: 'tavily',
        score: result.score || 0.5,
        publishedDate: result.published_date,
      }));
    } catch (error) {
      logger.error('Tavily search failed:', error);
      return []; // Return empty array to continue with other providers
    }
  }
}