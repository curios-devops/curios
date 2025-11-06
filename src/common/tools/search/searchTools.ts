// Search Tools for Multi-Agent Researcher
// Provides real search capabilities for the SEARCH-R1 framework

interface SearchServiceImage {
  url: string;
  title?: string;
  alt?: string;
  source_url?: string;
}

interface SearchServiceResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  score?: number;
  image_url?: string;
}

interface SearchServiceResponse {
  results: SearchServiceResult[];
  images?: SearchServiceImage[];
}

interface ImageResult {
  url: string;
  title?: string;
  alt?: string;
  source_url?: string;
}

interface SearchResponseData {
  results: SearchResult[];
  images: ImageResult[];
}

import { searchWithTavily } from '../../../commonService/searchTools/tavilyService.ts';
import { braveSearchTool } from '../../../commonService/searchTools/braveSearchTool.ts';
import { logger } from '../../../utils/logger.ts';

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
  image?: string | null;
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
      logger.warn('Tavily search failed, trying Brave:', error);
    }

    try {
      // Fallback to Brave
      const braveResults = await this.searchWithBrave(query);
      if (braveResults.results.length > 0) {
        const response = this.formatSearchResponse(query, braveResults, 'rapidapi');
        this.addToHistory(response);
        return response;
      }
    } catch (error) {
      logger.warn('Brave search failed:', error);
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

  private async searchWithTavily(query: string): Promise<SearchResponseData> {
    try {
      const tavilyResponse = await searchWithTavily(query) as SearchServiceResponse;
      
      const results: SearchResult[] = tavilyResponse.results.map(result => {
        const url = result.url || '';
        return {
          title: result.title || 'Untitled',
          url,
          snippet: result.content || '',
          content: result.content,
          relevance_score: result.score ?? 0.5,
          domain: this.extractDomain(url),
          image: result.image_url || undefined
        };
      });

      return { results, images: tavilyResponse.images || [] };
    } catch (error) {
      logger.error('Tavily search error:', error);
      throw error;
    }
  }

  private async searchWithBrave(query: string): Promise<SearchResponseData> {
    try {
      const braveResponse = await braveSearchTool(query);
      
      // Combine web and news results
      const allWebResults = [...braveResponse.web, ...(braveResponse.news || [])];
      
      const results: SearchResult[] = allWebResults.map(result => {
        const url = result.url || '';
        return {
          title: result.title || 'Untitled',
          url,
          snippet: result.content || '',
          content: result.content,
          relevance_score: 0.7, // Default score for Brave
          domain: this.extractDomain(url)
        };
      });

      return { results, images: braveResponse.images || [] };
    } catch (error) {
      logger.error('Brave search error:', error);
      throw error;
    }
  }

  private formatSearchResponse(
    query: string, 
    searchData: SearchResponseData, 
    source: 'tavily' | 'rapidapi'
  ): SearchResponse {
    const response: SearchResponse = {
      query,
      results: searchData.results,
      source,
      timestamp: new Date(),
      total_results: searchData.results.length
    };
    return response;
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

  private enforceRateLimit(): Promise<void> {
    // Simple rate limiting
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  getSearchHistory(): SearchResponse[] {
    return [...this.searchHistory];
  }

  clearHistory(): void {
    this.searchHistory = [];
  }

  // Advanced search strategies
  performFocusedSearch(
    baseQuery: string, 
    focusMode: string
  ): Promise<SearchResponse[]> {
    const searchStrategies = this.getFocusSearchStrategies(baseQuery, focusMode);
    return this.performParallelSearches(searchStrategies);
  }

  private getFocusSearchStrategies(baseQuery: string, focusMode: string): SearchQuery[] {
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
export function performResearchSearch(query: string, reason: string): Promise<SearchResponse> {
  const searchTools = SearchTools.getInstance();
  return searchTools.performSearch({ query, reason });
}

export function performFocusedResearch(
  baseQuery: string, 
  focusMode: string
): Promise<SearchResponse[]> {
  const searchTools = SearchTools.getInstance();
  return searchTools.performFocusedSearch(baseQuery, focusMode);
}

export function performParallelResearch(queries: SearchQuery[]): Promise<SearchResponse[]> {
  const searchTools = SearchTools.getInstance();
  return searchTools.performParallelSearches(queries);
}
