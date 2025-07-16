// Search Tools for Multi-Agent Researcher
// Provides real search capabilities for the SEARCH-R1 framework

import { searchWithTavily } from '../tavilyService';
import { performRapidAPISearch } from '../searxService';
import { logger } from '../../utils/logger';

export interface SearchQuery {
  query: string;
  reason: string;
  priority?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  relevance_score?: number;
  image?: string;
  domain?: string;
  publish_date?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  source: 'tavily' | 'rapidapi' | 'fallback';
  timestamp: Date;
  total_results: number;
}

class SearchTools {
  private static instance: SearchTools;
  private searchHistory: SearchResponse[] = [];
  private rateLimitDelay = 1000; // 1 second between searches

  static getInstance(): SearchTools {
    if (!SearchTools.instance) {
      SearchTools.instance = new SearchTools();
    }
    return SearchTools.instance;
  }

  async performSearch(searchQuery: SearchQuery): Promise<SearchResponse> {
    const { query, reason } = searchQuery;
    
    logger.info(`Performing search: "${query}" (Reason: ${reason})`);
    
    // Add rate limiting
    await this.enforceRateLimit();
    
    try {
      // Try Tavily first (usually more reliable for research)
      const tavilyResults = await this.searchWithTavily(query);
      if (tavilyResults.results.length > 0) {
        const response = this.formatSearchResponse(query, tavilyResults, 'tavily');
        this.addToHistory(response);
        return response;
      }
    } catch (error) {
      logger.warn('Tavily search failed, trying RapidAPI:', error);
    }

    try {
      // Fallback to RapidAPI
      const rapidAPIResults = await this.searchWithRapidAPI(query);
      if (rapidAPIResults.results.length > 0) {
        const response = this.formatSearchResponse(query, rapidAPIResults, 'rapidapi');
        this.addToHistory(response);
        return response;
      }
    } catch (error) {
      logger.warn('RapidAPI search failed:', error);
    }

    // Ultimate fallback - mock results for development
    const fallbackResponse = this.createFallbackResponse(query);
    this.addToHistory(fallbackResponse);
    return fallbackResponse;
  }

  async performParallelSearches(searchQueries: SearchQuery[]): Promise<SearchResponse[]> {
    logger.info(`Performing ${searchQueries.length} parallel searches`);
    
    // Sort by priority if specified
    const sortedQueries = searchQueries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Limit to 3 parallel searches to avoid rate limits
    const limitedQueries = sortedQueries.slice(0, 3);
    
    const searchPromises = limitedQueries.map(async (searchQuery, index) => {
      // Stagger the searches slightly
      await new Promise(resolve => setTimeout(resolve, index * 500));
      return this.performSearch(searchQuery);
    });

    try {
      const results = await Promise.all(searchPromises);
      return results.filter(result => result.results.length > 0);
    } catch (error) {
      logger.error('Parallel search failed:', error);
      // Return individual results that succeeded
      const fallbackPromises = limitedQueries.map(query => 
        this.performSearch(query).catch(() => this.createFallbackResponse(query.query))
      );
      return Promise.all(fallbackPromises);
    }
  }

  private async searchWithTavily(query: string): Promise<{ results: SearchResult[]; images: any[] }> {
    try {
      const tavilyResponse = await searchWithTavily(query);
      
      const results: SearchResult[] = tavilyResponse.results.map(result => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.content || '',
        content: result.content,
        relevance_score: (result as any).score || 0.5,
        domain: this.extractDomain(result.url || ''),
        image: (result as any).image_url
      }));

      return { results, images: tavilyResponse.images || [] };
    } catch (error) {
      logger.error('Tavily search error:', error);
      throw error;
    }
  }

  private async searchWithRapidAPI(query: string): Promise<{ results: SearchResult[]; images: any[] }> {
    try {
      const rapidAPIResponse = await performRapidAPISearch(query);
      
      const results: SearchResult[] = rapidAPIResponse.results.map(result => ({
        title: result.title || 'Untitled',
        url: result.url || '',
        snippet: result.content || '',
        content: result.content,
        relevance_score: 0.7, // Default score for RapidAPI
        domain: this.extractDomain(result.url || ''),
        image: (result as any).image_url
      }));

      return { results, images: rapidAPIResponse.images || [] };
    } catch (error) {
      logger.error('RapidAPI search error:', error);
      throw error;
    }
  }

  private formatSearchResponse(
    query: string, 
    searchData: { results: SearchResult[]; images: any[] }, 
    source: 'tavily' | 'rapidapi'
  ): SearchResponse {
    return {
      query,
      results: searchData.results.slice(0, 10), // Limit to top 10 results
      source,
      timestamp: new Date(),
      total_results: searchData.results.length
    };
  }

  private createFallbackResponse(query: string): SearchResponse {
    // Create mock results for development/fallback
    const mockResults: SearchResult[] = [
      {
        title: `Research Results for "${query}"`,
        url: 'https://example.com/research',
        snippet: `Comprehensive information about ${query}. This is a fallback result when search services are unavailable.`,
        content: `Detailed content about ${query} would appear here in a real search result.`,
        relevance_score: 0.8,
        domain: 'example.com'
      },
      {
        title: `Analysis of ${query}`,
        url: 'https://research.example.com/analysis',
        snippet: `In-depth analysis and insights related to ${query}.`,
        content: `Further analysis content about ${query}.`,
        relevance_score: 0.7,
        domain: 'research.example.com'
      },
      {
        title: `Latest Developments in ${query}`,
        url: 'https://news.example.com/latest',
        snippet: `Recent news and developments concerning ${query}.`,
        content: `Current news and updates about ${query}.`,
        relevance_score: 0.6,
        domain: 'news.example.com'
      }
    ];

    return {
      query,
      results: mockResults,
      source: 'fallback',
      timestamp: new Date(),
      total_results: mockResults.length
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown-domain.com';
    }
  }

  private addToHistory(response: SearchResponse): void {
    this.searchHistory.push(response);
    // Keep only last 50 searches
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(-50);
    }
  }

  private async enforceRateLimit(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, this.rateLimitDelay);
    });
  }

  getSearchHistory(): SearchResponse[] {
    return [...this.searchHistory];
  }

  clearHistory(): void {
    this.searchHistory = [];
  }

  // Advanced search strategies
  async performFocusedSearch(
    baseQuery: string, 
    focusMode: string
  ): Promise<SearchResponse[]> {
    const focusStrategies = this.getFocusSearchStrategies(baseQuery, focusMode);
    
    const searchQueries: SearchQuery[] = focusStrategies.map((strategy, index) => ({
      query: strategy.query,
      reason: strategy.reason,
      priority: strategy.priority || (3 - index) // Higher priority for earlier strategies
    }));

    return this.performParallelSearches(searchQueries);
  }

  private getFocusSearchStrategies(baseQuery: string, focusMode: string): Array<{
    query: string;
    reason: string;
    priority?: number;
  }> {
    const strategies = {
      health: [
        { query: `${baseQuery} medical research studies`, reason: 'Find medical research and studies', priority: 3 },
        { query: `${baseQuery} health implications effects`, reason: 'Understand health implications', priority: 2 },
        { query: `${baseQuery} clinical trials evidence`, reason: 'Look for clinical evidence', priority: 1 }
      ],
      academic: [
        { query: `${baseQuery} academic research papers`, reason: 'Find scholarly articles', priority: 3 },
        { query: `${baseQuery} peer reviewed studies`, reason: 'Locate peer-reviewed research', priority: 2 },
        { query: `${baseQuery} university research findings`, reason: 'Find university research', priority: 1 }
      ],
      finance: [
        { query: `${baseQuery} financial analysis market`, reason: 'Financial market analysis', priority: 3 },
        { query: `${baseQuery} economic impact trends`, reason: 'Economic implications', priority: 2 },
        { query: `${baseQuery} investment opportunities risks`, reason: 'Investment perspective', priority: 1 }
      ],
      travel: [
        { query: `${baseQuery} travel guide information`, reason: 'Travel and tourism info', priority: 3 },
        { query: `${baseQuery} local attractions recommendations`, reason: 'Local recommendations', priority: 2 },
        { query: `${baseQuery} visitor experiences reviews`, reason: 'Visitor experiences', priority: 1 }
      ],
      social: [
        { query: `${baseQuery} social media discussions`, reason: 'Social media perspectives', priority: 3 },
        { query: `${baseQuery} community opinions forums`, reason: 'Community discussions', priority: 2 },
        { query: `${baseQuery} public sentiment analysis`, reason: 'Public opinion', priority: 1 }
      ],
      math: [
        { query: `${baseQuery} mathematical analysis calculations`, reason: 'Mathematical aspects', priority: 3 },
        { query: `${baseQuery} computational methods algorithms`, reason: 'Computational approaches', priority: 2 },
        { query: `${baseQuery} statistical data analysis`, reason: 'Statistical analysis', priority: 1 }
      ],
      video: [
        { query: `${baseQuery} video content tutorials`, reason: 'Video content and tutorials', priority: 3 },
        { query: `${baseQuery} visual demonstrations examples`, reason: 'Visual demonstrations', priority: 2 },
        { query: `${baseQuery} multimedia presentations`, reason: 'Multimedia content', priority: 1 }
      ],
      web: [
        { query: `${baseQuery} comprehensive overview`, reason: 'General comprehensive search', priority: 3 },
        { query: `${baseQuery} recent developments news`, reason: 'Recent developments', priority: 2 },
        { query: `${baseQuery} expert analysis opinions`, reason: 'Expert perspectives', priority: 1 }
      ]
    };

    return strategies[focusMode as keyof typeof strategies] || strategies.web;
  }
}

// Export singleton instance
export const searchTools = SearchTools.getInstance();

// Export helper functions
export async function performResearchSearch(query: string, reason: string): Promise<SearchResponse> {
  return searchTools.performSearch({ query, reason });
}

export async function performFocusedResearch(
  baseQuery: string, 
  focusMode: string
): Promise<SearchResponse[]> {
  return searchTools.performFocusedSearch(baseQuery, focusMode);
}

export async function performParallelResearch(queries: SearchQuery[]): Promise<SearchResponse[]> {
  return searchTools.performParallelSearches(queries);
}
