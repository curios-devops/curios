// src/services/agents/retrieverAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions

import { MAX_RESULTS } from '../../../../commonService/utils/constants.ts';
import { BaseAgent } from '../../../../commonService/agents/baseAgent.ts';
import { AgentResponse, SearchResult, Perspective } from '../../../../commonApp/types/index.ts';
import { ImageResult, VideoResult } from '../../../../commonApp/types/index.ts';
import { tavilySearch } from '../../../../commonService/searchTools/tavily.ts';
import { braveSearch } from '../../../../commonService/searchTools/brave.ts';
import { logger } from '../../../../utils/logger.ts';

export class SearchRetrieverAgent extends BaseAgent {
  constructor() {
    super(
      'Retriever Agent',
      'Collects and compiles information (text and images) from multiple sources'
    );
  }

  async execute(
    query: string,
    onStatusUpdate?: (status: string) => void,
    perspectives: Perspective[] = [],
    isPro: boolean = false
  ): Promise<AgentResponse<{
    query: string;
    perspectives: Perspective[];
    results: SearchResult[];
    images: ImageResult[];
    videos: VideoResult[];
  }>> {
    try {
      const trimmedQuery = query.trim();
      
      console.log('🔍 [RETRIEVER] SearchRetrieverAgent starting', {
        query: trimmedQuery,
        perspectivesCount: perspectives.length,
        isPro,
        timestamp: new Date().toISOString()
      });
      
      if (!trimmedQuery) {
        return {
          success: false,
          error: 'Search query cannot be empty'
        };
      }

      logger.info('SearchRetrieverAgent executing', { 
        query: trimmedQuery,
        perspectivesCount: perspectives.length,
        isPro
      });

      onStatusUpdate?.('Starting search...');
      
      // Initialize search results
      let searchResults: { web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] };
      
      try {
        // Simplified: Try Brave first (no Promise.race wrapper to avoid hanging)
        try {
          onStatusUpdate?.('Searching with Brave Search...');
          logger.info('Attempting Brave Search', { query: trimmedQuery });
          
          // Direct call without Promise.race wrapper
          const braveResults = await braveSearch(trimmedQuery) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
          
          logger.info('Brave Search completed', {
            webCount: braveResults.web?.length || 0,
            newsCount: braveResults.news?.length || 0,
            imagesCount: braveResults.images?.length || 0,
            videoCount: braveResults.video?.length || 0
          });

          console.log('🔍 [DEBUG] Brave Search completed successfully:', {
            webCount: braveResults.web?.length || 0,
            newsCount: braveResults.news?.length || 0,
            imagesCount: braveResults.images?.length || 0,
            videoCount: braveResults.video?.length || 0,
            timestamp: new Date().toISOString()
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

          console.log('🔍 [DEBUG] Image mapping completed:', {
            originalImagesCount: braveResults.images.length,
            mappedImagesCount: mappedImages.length,
            sampleImage: mappedImages[0] || 'none',
            timestamp: new Date().toISOString()
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

          // 🐛 DEBUG: Brave results analysis
          console.log('🔍 [DEBUG] Brave results analysis:', {
            webResultsCount: searchResults.web?.length || 0,
            imagesCount: searchResults.images?.length || 0,
            videosCount: searchResults.videos?.length || 0,
            firstWebResult: searchResults.web?.[0] ? {
              title: searchResults.web[0].title,
              url: searchResults.web[0].url,
              contentLength: searchResults.web[0].content?.length || 0
            } : 'NO WEB RESULTS',
            firstImageResult: searchResults.images?.[0] ? {
              url: searchResults.images[0].url,
              alt: searchResults.images[0].alt
            } : 'NO IMAGE RESULTS',
            timestamp: new Date().toISOString()
          });

          // 🐛 SUPER OBVIOUS RETRIEVER DEBUG
          console.error('🔍🔍🔍 RETRIEVER GOT RESULTS:', {
            webCount: searchResults.web?.length || 0,
            imagesCount: searchResults.images?.length || 0,
            videosCount: searchResults.videos?.length || 0,
            firstWebTitle: searchResults.web?.[0]?.title || 'NO WEB RESULTS',
            timestamp: new Date().toISOString()
          });

          logger.info('Brave Search successful', {
            finalWebCount: searchResults.web.length,
            finalImagesCount: searchResults.images.length
          });

          console.log('🔍 [DEBUG] Final Brave Search results:', {
            finalWebCount: searchResults.web.length,
            finalImagesCount: searchResults.images.length,
            finalVideosCount: searchResults.videos?.length || 0,
            timestamp: new Date().toISOString()
          });

          // Send completion signal for successful Brave search
          onStatusUpdate?.('Search completed successfully!');
          await new Promise(resolve => setTimeout(resolve, 150));
          
        } catch (braveError) {
          logger.warn('Brave Search failed, falling back to Apify', {
            error: braveError instanceof Error ? braveError.message : braveError,
            query: trimmedQuery
          });
          
          onStatusUpdate?.('Brave Search failed, trying Apify...');
          
          try {
            logger.info('Starting Apify fallback', { query: trimmedQuery });
            
            // Direct Apify call without Promise.race wrapper (simplified like test page)
            const apiKey = import.meta.env.VITE_APIFY_API_KEY;
            if (!apiKey?.trim()) {
              throw new Error('Apify API key is missing');
            }

            // Use same pattern as test page
            const runResponse = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                queries: trimmedQuery,
                resultsPerPage: 10,
                maxPagesPerQuery: 1,
                languageCode: 'en',
                countryCode: 'us',
                mobileResults: false,
                includeUnfilteredResults: false
              })
            });

            if (!runResponse.ok) {
              const errorText = await runResponse.text();
              throw new Error(`Apify API error: ${runResponse.status} ${runResponse.statusText}\n${errorText}`);
            }

            const results = await runResponse.json();
            
            // Extract organic results from the first search page
            const organicResults = results[0]?.organicResults || [];
            
            // Convert to SearchResult format
            searchResults = {
              web: organicResults.slice(0, 10).map((item: any, index: number) => ({
                title: item.title || 'No title',
                url: item.url || item.link || '',
                content: item.description || item.snippet || ''
              })),
              images: [],
              videos: []
            };
            
            logger.info('Apify fallback successful', {
              webCount: searchResults.web?.length || 0
            });
            
            onStatusUpdate?.('Search completed with Apify!');
            await new Promise(resolve => setTimeout(resolve, 150));
            
          } catch (apifyError) {
            logger.error('Both Brave and Apify failed', {
              braveError: braveError instanceof Error ? braveError.message : braveError,
              apifyError: apifyError instanceof Error ? apifyError.message : apifyError
            });
            
            // Send completion signal even when all providers fail
            onStatusUpdate?.('Search completed - using fallback results');
            await new Promise(resolve => setTimeout(resolve, 150));
            throw new Error('All search providers failed');
          }
        }
      } catch (error) {
        logger.error('Search failed', {
          error: error instanceof Error ? error.message : error,
          isPro
        });
        
        // Critical: Always send completion signal, even on total failure
        onStatusUpdate?.('Search completed with fallback data');
        await new Promise(resolve => setTimeout(resolve, 150));
        
        return {
          success: true,
          data: this.getFallbackData(trimmedQuery)
        };
      }

      // If no text results, try a more general query.
      if (!searchResults.web || searchResults.web.length === 0) {
        const generalQuery = this.generateGeneralQuery(trimmedQuery);
        onStatusUpdate?.('No results found; trying broader search terms...');
        
        let generalResults: { web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] };
        
        // Try Brave for general query (simplified - no retries)
        try {
          const braveResults = await braveSearch(generalQuery) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
          generalResults = {
            web: [...braveResults.web, ...braveResults.news],
            images: braveResults.images.map(img => ({
              url: img.image || img.url,
              alt: img.title || img.content || 'Search result image',
              source_url: img.url
            })),
            videos: braveResults.video.map(vid => ({ title: vid.title, url: vid.url, thumbnail: vid.image, duration: '' }))
          };
        } catch (braveError) {
          logger.warn('Brave Search failed for general query, skipping', {
            error: braveError instanceof Error ? braveError.message : braveError
          });
          generalResults = { web: [], images: [], videos: [] };
        }
        
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

      // 🐛 DEBUG: Results processing
      console.log('🔍 [DEBUG] Results processing:', {
        originalWebCount: searchResults.web?.length || 0,
        afterDeduplication: this.deduplicateResults(searchResults.web).length,
        afterFiltering: this.deduplicateResults(searchResults.web).filter(result => result.url !== '#' && result.title && result.content).length,
        finalValidResults: validResults.length,
        firstValidResult: validResults[0]?.title || 'NO VALID RESULTS',
        timestamp: new Date().toISOString()
      });

      // 🐛 SUPER OBVIOUS PROCESSING DEBUG
      console.error('⚙️⚙️⚙️ RESULTS PROCESSED:', {
        originalWeb: searchResults.web?.length || 0,
        finalValid: validResults.length,
        firstTitle: validResults[0]?.title || 'NO VALID RESULTS',
        timestamp: new Date().toISOString()
      });

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

      // Process perspective-specific text searches in parallel.
      const perspectiveResults = await Promise.all(
        (perspectives || []).map(async (perspective) => {
          onStatusUpdate?.(`Exploring perspective: ${perspective.title}...`);
          
          let perspectiveSearchResults: { web: SearchResult[]; images: ImageResult[]; videos?: VideoResult[] };
          if (isPro && typeof perspective.id === 'string') {
            const engine = perspective.id.toLowerCase();
            if (engine === 'tavily') {
              const tavilyResults = await safeCall(() => tavilySearch(perspective.title)) as { web: SearchResult[]; images: ImageResult[] };
              perspectiveSearchResults = { web: tavilyResults.web, images: tavilyResults.images, videos: [] };
            } else {
              // Pro: Use Brave, no fallback for perspectives
              try {
                const braveResults = await safeCall(() => braveSearch(perspective.title)) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
                perspectiveSearchResults = {
                  web: [...braveResults.web, ...braveResults.news],
                  images: braveResults.images.map(img => ({
                    url: img.image || img.url,
                    alt: img.title || img.content || 'Search result image',
                    source_url: img.url
                  })),
                  videos: braveResults.video.map(vid => ({ title: vid.title, url: vid.url, thumbnail: vid.image, duration: '' }))
                };
              } catch (braveError) {
                logger.warn(`Brave Search failed for perspective "${perspective.title}", returning empty`, { error: braveError instanceof Error ? braveError.message : braveError });
                perspectiveSearchResults = { web: [], images: [], videos: [] };
              }
            }
          } else {
            // Regular: Use Brave only
            try {
              const braveResults = await safeCall(() => braveSearch(perspective.title)) as { web: SearchResult[]; news: SearchResult[]; images: SearchResult[]; video: SearchResult[] };
              perspectiveSearchResults = {
                web: [...braveResults.web, ...braveResults.news],
                images: braveResults.images.map(img => ({
                  url: img.image || img.url,
                  alt: img.title || img.content || 'Search result image',
                  source_url: img.url
                })),
                videos: braveResults.video.map(vid => ({ title: vid.title, url: vid.url, thumbnail: vid.image, duration: '' }))
              };
            } catch (braveError) {
              logger.warn(`Brave Search failed for perspective "${perspective.title}", returning empty`, { error: braveError instanceof Error ? braveError.message : braveError });
              perspectiveSearchResults = { web: [], images: [], videos: [] };
            }
          }
          
          // Process and validate sources for this perspective
          const validSources = (perspectiveSearchResults.web || [])
            .filter(result => result.url && result.title)
            .map(result => ({
              title: result.title,
              url: result.url.trim(),
              snippet: this.sanitizeContent(result.content || '')
            }))
            .slice(0, 5);

          return { ...perspective, sources: validSources };
        })
      );

      logger.info('Retrieval completed', {
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        perspectivesCount: perspectiveResults.length,
        perspectivesWithSources: perspectiveResults.filter(p => p.sources?.length > 0).length
      });

      // CRITICAL: Send completion signal for successful retrieval
      onStatusUpdate?.('Search completed successfully!');
      await new Promise(resolve => setTimeout(resolve, 150));

      console.log('🔍 [RETRIEVER] SearchRetrieverAgent completing successfully', {
        query: trimmedQuery,
        perspectivesCount: perspectiveResults.length,
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        videosCount: validVideos.length,
        timestamp: new Date().toISOString()
      });

      // 🐛 SUPER OBVIOUS RETRIEVER COMPLETE DEBUG
      console.error('🎯🎯🎯 RETRIEVER AGENT COMPLETE:', {
        query: trimmedQuery,
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        firstResultTitle: validResults[0]?.title || 'NO RESULTS',
        timestamp: new Date().toISOString()
      });

      logger.info('SearchRetrieverAgent returning data', {
        query: trimmedQuery,
        perspectivesCount: perspectiveResults.length,
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        videosCount: validVideos.length,
        success: true
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
      return {
        success: true,
        data: this.getFallbackData(query)
      };
    }
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
  protected override getFallbackData(query: string = ''): {
    query: string;
    perspectives: Perspective[];
    results: SearchResult[];
    images: ImageResult[];
    videos: VideoResult[];
  } {
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
}