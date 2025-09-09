// src/services/agents/retrieverAgent.ts

import { API_TIMEOUTS, MAX_RESULTS } from '../constants';
import { BaseAgent } from './baseAgent';
import { AgentResponse, SearchResult } from './types';
import { ImageResult, VideoResult } from '../types';
import { searxngSearch } from '../searchTools/searxng';
import { tavilySearch } from '../searchTools/tavily';
import { braveSearch } from '../searchTools/brave';
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
      onStatusUpdate?.(isPro ? 'Searching with Tavily...' : 'Searching with Brave Search...');

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
          // Regular users: Try Brave first, fallback to SearXNG
          try {
            onStatusUpdate?.('Searching with Brave Search...');
            logger.info('Attempting Brave Search', { query: trimmedQuery });
            
            // Create a more aggressive timeout for Brave search
            const braveSearchPromise = braveSearch(trimmedQuery);
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                logger.warn('Brave search timeout triggered', { timeout: API_TIMEOUTS.BRAVE });
                reject(new Error('Brave search timeout'));
              }, API_TIMEOUTS.BRAVE);
            });
            
            const braveResults = await Promise.race([
              braveSearchPromise,
              timeoutPromise
            ]) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
            
            logger.info('Brave Search completed', { 
              webCount: braveResults.web?.length || 0,
              newsCount: braveResults.news?.length || 0,
              imagesCount: braveResults.images?.length || 0,
              videoCount: braveResults.video?.length || 0
            });
            
            // Convert Brave results to match expected format
            const mappedImages = braveResults.images.map(img => ({
              url: (img.image || img.url || '').startsWith('https://') ? (img.image || img.url) : '',
              alt: img.title || img.content || 'Search result image',
              source_url: img.url // The page URL where the image was found
            })).filter(img => img.url !== ''); // Filter out empty URLs
            
            logger.info('Brave image mapping', {
              originalImagesCount: braveResults.images.length,
              mappedImagesCount: mappedImages.length,
              sampleImage: mappedImages[0] || 'none'
            });
            
            searchResults = {
              web: [...braveResults.web, ...braveResults.news], // Combine web and news
              images: mappedImages,
              videos: braveResults.video.map(vid => ({
                title: vid.title,
                url: vid.url,
                thumbnail: vid.image,
                duration: ''
              }))
            };
            
            // Check if we got meaningful results
            if (searchResults.web.length === 0 && searchResults.images.length === 0) {
              logger.warn('Brave search returned no results, triggering fallback');
              throw new Error('No results from Brave Search');
            }
            
            logger.info('Brave Search successful', { 
              finalWebCount: searchResults.web.length,
              finalImagesCount: searchResults.images.length 
            });
          } catch (braveError) {
            logger.warn('Brave Search failed, falling back to SearXNG', {
              error: braveError instanceof Error ? braveError.message : braveError,
              query: trimmedQuery
            });
            
            onStatusUpdate?.('Brave Search failed, trying SearXNG...');
            
            try {
              logger.info('Starting SearXNG fallback', { query: trimmedQuery });
              
              const searxngSearchPromise = searxngSearch(trimmedQuery);
              const searxngTimeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                  logger.warn('SearXNG search timeout triggered', { timeout: API_TIMEOUTS.SEARXNG });
                  reject(new Error('SearXNG search timeout'));
                }, API_TIMEOUTS.SEARXNG);
              });
              
              searchResults = await Promise.race([
                searxngSearchPromise,
                searxngTimeoutPromise
              ]) as { web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] };
              
              logger.info('SearXNG fallback successful', {
                webCount: searchResults.web?.length || 0,
                imagesCount: searchResults.images?.length || 0
              });
              
              onStatusUpdate?.('Search completed with SearXNG!');
            } catch (searxngError) {
              logger.error('Both Brave and SearXNG failed', {
                braveError: braveError instanceof Error ? braveError.message : braveError,
                searxngError: searxngError instanceof Error ? searxngError.message : searxngError
              });
              throw new Error('All search providers failed');
            }
          }
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
        
        let generalResults: { web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] };
        if (isPro) {
          // Pro users: Use Tavily for general query
          const tavilyResults = await safeCall(() => tavilySearch(generalQuery)) as { web: SearchResult[]; images: ImageResult[] };
          generalResults = {
            web: tavilyResults.web,
            images: tavilyResults.images,
            videos: []
          };
        } else {
          // Regular users: Try Brave first, then SearXNG for general query
          try {
            const braveResults = await safeCall(() => braveSearch(generalQuery)) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
            generalResults = {
              web: [...braveResults.web, ...braveResults.news],
              images: braveResults.images.map(img => ({
                url: (img.image || img.url || '').startsWith('https://') ? (img.image || img.url) : '',
                alt: img.title || img.content || 'Search result image',
                source_url: img.url
              })),
              videos: braveResults.video.map(vid => ({
                title: vid.title,
                url: vid.url,
                thumbnail: vid.image,
                duration: ''
              }))
            };
          } catch (braveError) {
            logger.warn('Brave Search failed for general query, using SearXNG', {
              error: braveError instanceof Error ? braveError.message : braveError
            });
            generalResults = await safeCall(() => searxngSearch(generalQuery));
          }
        }
        
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
        
      logger.info('Image processing results', {
        originalImagesCount: searchResults.images.length,
        deduplicatedImagesCount: validImages.length,
        sampleImage: validImages[0] || 'none'
      });

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
        
        let perspectiveSearchResults: { web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] };
        if (isPro) {
          // Pro users: Use Tavily for perspective search
          const tavilyResults = await safeCall(() => tavilySearch(perspective.title)) as { web: SearchResult[]; images: ImageResult[] };
          perspectiveSearchResults = {
            web: tavilyResults.web,
            images: tavilyResults.images,
            videos: []
          };
        } else {
          // Regular users: Try Brave first, then SearXNG for perspective search
          try {
            const braveResults = await safeCall(() => braveSearch(perspective.title)) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
            perspectiveSearchResults = {
              web: [...braveResults.web, ...braveResults.news],
              images: braveResults.images.map(img => ({
                url: img.image || img.url,
                alt: img.title || img.content || 'Search result image',
                source_url: img.url
              })),
              videos: braveResults.video.map(vid => ({
                title: vid.title,
                url: vid.url,
                thumbnail: vid.image,
                duration: ''
              }))
            };
          } catch (braveError) {
            logger.warn(`Brave Search failed for perspective "${perspective.title}", using SearXNG`, {
              error: braveError instanceof Error ? braveError.message : braveError
            });
            perspectiveSearchResults = await safeCall(() => searxngSearch(perspective.title));
          }
        }
        
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