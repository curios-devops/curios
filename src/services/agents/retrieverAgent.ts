// src/services/agents/retrieverAgent.ts

import { API_TIMEOUTS, MAX_RESULTS } from '../constants';
import { BaseAgent } from './baseAgent';
import { AgentResponse, SearchResult } from './types';
import { ImageResult, VideoResult } from '../types';
import { searxngSearch } from '../searchTools/searxng';
import { tavilySearch } from '../searchTools/tavily';
import { rateLimitQueue } from '../rateLimit';
import { logger } from '../../utils/logger';

// Helper function to delay execution for a given number of milliseconds.
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wraps an API call using the rateLimitQueue and retries once on error.
async function safeCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await rateLimitQueue.add(operation);
  } catch (error) {
    logger.warn('First attempt failed, retrying after 1 second', {
      error: error instanceof Error ? error.message : error,
    });
    await delay(1000);
    return rateLimitQueue.add(operation);
  }
}

export class RetrieverAgent extends BaseAgent {
  constructor() {
    super(
      'Retriever Agent',
      'Collects and compiles information (text and images) from multiple sources'
    );
  }

  async execute(
    query: string,
    perspectives: any[] = [],
    isPro: boolean = false,
    onStatusUpdate?: (status: string) => void
  ): Promise<AgentResponse> {
    try {
      if (!query?.trim()) {
        throw new Error('No search query provided');
      }

      const trimmedQuery = query.trim();
      logger.info('Starting retrieval', { query: trimmedQuery });
      onStatusUpdate?.(isPro ? 'Searching with Tavily...' : 'Searching with SearxNG...');

      // Choose search provider based on isPro flag
      let searchResults: { web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] };
      try {
        if (isPro) {
          // Pro users: Use Tavily directly
          onStatusUpdate?.('Searching with Tavily...');
          const tavilyResults = await Promise.race([
            tavilySearch(trimmedQuery),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Tavily search timeout')), API_TIMEOUTS.TAVILY)
            )
          ]) as { web: SearchResult[]; images: ImageResult[] };
          // Convert Tavily results to match SearxNG format
          searchResults = {
            web: tavilyResults.web,
            images: tavilyResults.images,
            videos: [] // Tavily doesn't provide videos
          };
        } else {
          // Normal users: Use SearxNG
          onStatusUpdate?.('Searching with SearxNG...');
          searchResults = await searxngSearch(trimmedQuery);
        }
      } catch (error) {
        logger.error('Search failed', {
          error: error instanceof Error ? error.message : error,
          isPro
        });
        return {
          success: true,
          data: this.getFallbackData(trimmedQuery)
        };
      }

      await delay(1000); // Enforce a 1-second gap after search

      // If no text results, try a more general query.
      if (!searchResults.web || searchResults.web.length === 0) {
        const generalQuery = this.generateGeneralQuery(trimmedQuery);
        onStatusUpdate?.('No results found; trying broader search terms...');
        const generalResults = await safeCall<{ web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] }>(() =>
          isPro ? tavilySearch(generalQuery) : searxngSearch(generalQuery)
        );
        await delay(1000);
        
        if (generalResults.web) searchResults.web = [...(searchResults.web || []), ...generalResults.web];
        if (generalResults.images) searchResults.images = [...(searchResults.images || []), ...generalResults.images];
        if ('videos' in searchResults && generalResults.videos) {
          searchResults.videos = [...(searchResults.videos || []), ...generalResults.videos];
        }
      }

      // Deduplicate and limit web search results.
      const validResults = this.deduplicateResults(searchResults.web)
        .filter(result => result.url !== '#' && result.title && result.content)
        .slice(0, MAX_RESULTS.WEB);

      // Deduplicate and limit image search results.
      const validImages = this.deduplicateImages(searchResults.images)
        .slice(0, MAX_RESULTS.IMAGES);

      // Process videos
      const validVideos = (searchResults.videos || [])
        .filter(video => video.url && video.title)
        .map(video => ({
          title: video.title || 'Untitled Video',
          url: video.url,
          thumbnail: video.thumbnail,
          duration: video.duration
        }))
        .slice(0, MAX_RESULTS.VIDEO);

      // Process perspective-specific text searches sequentially.
      const perspectiveResults = [];
      for (const perspective of perspectives) {
        onStatusUpdate?.(`Exploring perspective: ${perspective.title}...`);
        const perspectiveSearchResults = await safeCall<{ web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] }>(() => 
          isPro ? tavilySearch(perspective.title) : searxngSearch(perspective.title)
        );
        await delay(1000);
        
        // Process and validate sources for this perspective
        const validSources = perspectiveSearchResults.web
          .filter(result => result.url && result.title)
          .map(result => ({
            title: result.title,
            url: result.url.trim(),
            snippet: this.sanitizeContent(result.content || '')
          }))
          .slice(0, 5); // Limit to 5 sources per perspective

        perspectiveResults.push({
          ...perspective,
          sources: validSources
        });
      }

      logger.info('Retrieval completed', {
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        perspectivesCount: perspectiveResults.length,
        perspectivesWithSources: perspectiveResults.filter(p => p.sources?.length > 0).length
      });

      return {
        success: true,
        data: {
          query: trimmedQuery,
          perspectives: perspectiveResults,
          results: validResults,
          images: validImages,
          videos: validVideos,
        },
      };
    } catch (error) {
      logger.error('Retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
      });
      return this.handleError(error);
    }
  }

  // Generates a more general query by removing digits, quotes, and short words.
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

  // Deduplicates web search results based on URL.
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  }

  // Deduplicates image search results based on URL.
  private deduplicateImages(images: ImageResult[]): ImageResult[] {
    const seen = new Set<string>();
    return images.filter(image => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
  }

  // Sanitize content by removing HTML tags and decoding entities
  private sanitizeContent(content: string): string {
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&[^;]+;/g, '') // Remove HTML entities
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  // Returns fallback data in case retrieval fails.
  protected getFallbackData(query: string = ''): any {
    return {
      query,
      perspectives: [],
      results: [
        {
          title: 'No Results Found',
          url: '#',
          content: 'We could not find any results for your search. Please try different keywords or check back later.'
        }
      ],
      images: [],
      videos: []
    };
  }
}