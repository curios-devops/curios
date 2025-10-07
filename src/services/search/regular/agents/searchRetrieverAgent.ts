// src/services/agents/retrieverAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Query → Brave Search Tool → Results (with Apify fallback if needed)

import { MAX_RESULTS } from '../../../../commonService/utils/constants.ts';
import { BaseAgent } from '../../../../commonService/agents/baseAgent.ts';
import { AgentResponse, SearchResult } from '../../../../commonApp/types/index.ts';
import { ImageResult, VideoResult } from '../../../../commonApp/types/index.ts';
import { braveSearchTool } from '../../../../commonService/searchTools/braveSearchTool.ts';
import { apifySearchTool } from '../../../../commonService/searchTools/apifySearchTool.ts';
import { logger } from '../../../../utils/logger.ts';

export class SearchRetrieverAgent extends BaseAgent {
  constructor() {
    super(
      'Retriever Agent',
      'Collects search results using Brave Search API'
    );
  }

  async execute(
    query: string,
    onStatusUpdate?: (status: string) => void
  ): Promise<AgentResponse<{
    query: string;
    results: SearchResult[];
    images: ImageResult[];
    videos: VideoResult[];
  }>> {
    try {
      const trimmedQuery = query.trim();
      
      if (!trimmedQuery) {
        return {
          success: false,
          error: 'Search query cannot be empty'
        };
      }

      logger.info('SearchRetrieverAgent executing', { query: trimmedQuery });
      onStatusUpdate?.('Searching with Brave Search...');
      
      // Try Brave Search Tool first
      let searchResults: { web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] };
      
      try {
        // Simple tool call - no complex logic
        const braveResults = await braveSearchTool(trimmedQuery);
        
        // 🐛 DEBUG: Log what we got from Brave tool
        console.log('🔍 [RETRIEVER] Brave tool returned:', {
          webCount: braveResults.web?.length || 0,
          imageCount: braveResults.images?.length || 0,
          newsCount: braveResults.news?.length || 0,
          videoCount: braveResults.videos?.length || 0,
          firstWeb: braveResults.web?.[0]?.title || 'NO WEB',
          firstImage: braveResults.images?.[0]?.url || 'NO IMAGES'
        });
        
        // Combine web and news for final results
        searchResults = {
          web: [...braveResults.web, ...braveResults.news],
          images: braveResults.images,
          videos: braveResults.videos
        };

        console.log('🔍 [RETRIEVER] Combined search results:', {
          webCount: searchResults.web.length,
          imageCount: searchResults.images.length,
          videoCount: searchResults.videos.length
        });

        logger.info('Brave Search Tool completed', {
          webResultsCount: searchResults.web.length,
          imagesCount: searchResults.images.length,
          videosCount: searchResults.videos.length
        });

        onStatusUpdate?.('Search completed successfully!');
        
      } catch (braveError) {
        logger.warn('Brave Search Tool failed, falling back to Apify', {
          error: braveError instanceof Error ? braveError.message : braveError
        });
        
        onStatusUpdate?.('Brave Search failed, trying Apify...');
        
        // Wait 1 second before fallback (rate limit respect)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Simple tool call - no complex logic
          const apifyResults = await apifySearchTool(trimmedQuery);
          
          searchResults = {
            web: apifyResults.web,
            images: apifyResults.images,
            videos: [] // Apify doesn't support video search
          };
          
          logger.info('Apify Search Tool completed', {
            webCount: searchResults.web.length,
            imagesCount: searchResults.images.length
          });
          
          onStatusUpdate?.('Search completed with Apify!');
          
        } catch (apifyError) {
          logger.error('Both Brave and Apify failed', {
            braveError: braveError instanceof Error ? braveError.message : braveError,
            apifyError: apifyError instanceof Error ? apifyError.message : apifyError
          });
          
          // Return fallback data
          return this.handleError(apifyError, 'All search providers failed') as AgentResponse<{
            query: string;
            results: SearchResult[];
            images: ImageResult[];
            videos: VideoResult[];
          }>;
        }
      }

      // Deduplicate and validate results
      const validResults = this.deduplicateResults(searchResults.web)
        .filter(result => result.url !== '#' && result.title && result.content)
        .slice(0, MAX_RESULTS.WEB);

      // 🔍 DEBUG: Image processing investigation
      console.log('🔍 [RETRIEVER] Image processing debug:', {
        rawImagesCount: searchResults.images?.length || 0,
        firstRawImage: searchResults.images?.[0] || 'NO RAW IMAGES',
        rawImagesStructure: searchResults.images?.slice(0, 2) || []
      });

      const validImages = this.deduplicateImages(searchResults.images)
        .slice(0, MAX_RESULTS.IMAGES);

      console.log('🔍 [RETRIEVER] After deduplication:', {
        validImagesCount: validImages.length,
        firstValidImage: validImages[0] || 'NO VALID IMAGES',
        maxImagesAllowed: MAX_RESULTS.IMAGES
      });

      const validVideos = searchResults.videos?.slice(0, MAX_RESULTS.VIDEO) || [];

      logger.info('Retrieval completed', {
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        videosCount: validVideos.length
      });

      // 🐛 DEBUG: Log what we're returning
      console.log('🔍 [RETRIEVER] Returning final data:', {
        resultsCount: validResults.length,
        imagesCount: validImages.length,
        videosCount: validVideos.length,
        firstResult: validResults[0]?.title || 'NO RESULTS',
        firstImage: validImages[0]?.url || 'NO IMAGES',
        firstVideo: validVideos[0]?.title || 'NO VIDEOS'
      });

      return {
        success: true,
        data: {
          query: trimmedQuery,
          results: validResults,
          images: validImages,
          videos: validVideos
        }
      };
      
    } catch (error) {
      logger.error('Retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      return this.handleError(error, 'execute') as AgentResponse<{
        query: string;
        results: SearchResult[];
        images: ImageResult[];
        videos: VideoResult[];
      }>;
    }
  }

  // Deduplicates web search results based on URL
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.url)) return false;
      seen.add(result.url);
      return true;
    });
  }

  // Deduplicates image search results based on URL
  private deduplicateImages(images: ImageResult[]): ImageResult[] {
    const seen = new Set<string>();
    return images.filter(image => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    });
  }

  // Returns fallback data in case retrieval fails
  protected override getFallbackData(): {
    query: string;
    results: SearchResult[];
    images: ImageResult[];
    videos: VideoResult[];
  } {
    return {
      query: '',
      results: [
        {
          title: 'Search Unavailable',
          url: '#',
          content: 'We could not complete your search at this time. Please try again later.'
        }
      ],
      images: [],
      videos: []
    };
  }
}
