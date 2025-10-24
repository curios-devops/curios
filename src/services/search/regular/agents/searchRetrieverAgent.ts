// src/services/agents/retrieverAgent.ts
// Simplified following Swarm architecture: lightweight, stateless, minimal abstractions
// Regular search flow: Query → Brave Search Tool → Results (with Apify fallback if needed)
// Enhanced: Supports reverse image search + combined text/image searches

import { MAX_RESULTS } from '../../../../commonService/utils/constants.ts';
import { BaseAgent } from '../../../../commonService/agents/baseAgent.ts';
import { AgentResponse, SearchResult } from '../../../../commonApp/types/index.ts';
import { ImageResult, VideoResult } from '../../../../commonApp/types/index.ts';
import { braveSearchTool } from '../../../../commonService/searchTools/braveSearchTool.ts';
import { apifySearchTool } from '../../../../commonService/searchTools/apifySearchTool.ts';
import { bingReverseImageSearchTool } from '../../../../commonService/searchTools/bingReverseImageSearchTool.ts';
import { deleteImageFromStorage } from '../../../../utils/imageUpload.ts';
import { logger } from '../../../../utils/logger.ts';

export class SearchRetrieverAgent extends BaseAgent {
  constructor() {
    super(
      'Retriever Agent',
      'Collects search results using Brave Search API and reverse image search'
    );
  }

  async execute(
    query: string,
    onStatusUpdate?: (status: string) => void,
    imageUrls?: string[] // Optional: Public URLs of images for reverse image search
  ): Promise<AgentResponse<{
    query: string;
    results: SearchResult[];
    images: ImageResult[];
    videos: VideoResult[];
    isReverseImageSearch?: boolean;
  }>> {
    try {
      const trimmedQuery = query.trim();
      const hasImages = imageUrls && imageUrls.length > 0;
      const hasText = trimmedQuery.length > 0;
      
      // Validate inputs
      if (!hasText && !hasImages) {
        return {
          success: false,
          error: 'Search query or images required'
        };
      }

      logger.info('SearchRetrieverAgent executing', { 
        query: trimmedQuery,
        hasImages,
        imageCount: imageUrls?.length || 0,
        hasText
      });

      // Simplified search strategy:
      // - If image attached: ONLY use reverse image search (with optional query)
      // - If no image: Use Brave text + image search
      let searchResults: { web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] };

      if (hasImages && hasText) {
        // Combined Text + Image: Use reverse image search to extract context,
        // build an enriched query and then run Brave with that enriched query.
        onStatusUpdate?.('Searching by image + text (enriched)...');

        // 1) Run image-only reverse search to get high-quality context (do not pass user text)
        const reverseResults = await this.imageOnlySearch(imageUrls!, undefined);

        console.log('🔍 [RETRIEVER] Reverse results for enrichment:', {
          webCount: reverseResults.web.length,
          imagesCount: reverseResults.images.length
        });

        // 2) Build enriched query from reverseResults (first 4 items)
        const enrichedQuery = this.buildEnrichedQuery(reverseResults, trimmedQuery);
        console.log('🔍 [RETRIEVER] Enriched query generated:', enrichedQuery);

        // 3) Call Brave with enriched query
        const braveResults = await braveSearchTool(enrichedQuery);

        // 4) Construct searchResults: prefer Brave web results, but keep reverse images
        searchResults = {
          web: [...braveResults.web, ...(braveResults.news || [])],
          images: reverseResults.images,
          videos: braveResults.videos || []
        };

      } else if (hasImages) {
        // Image attached: Use ONLY reverse image search (ignore Brave)
        // Pass query if provided, otherwise null
        onStatusUpdate?.('Searching by image...');
        searchResults = await this.imageOnlySearch(imageUrls!, hasText ? trimmedQuery : undefined);
        
      } else {
        // No image: Regular text search with Brave
        onStatusUpdate?.('Searching with Brave Search...');
        searchResults = await this.textOnlySearch(trimmedQuery, onStatusUpdate);
      }

      // Deduplicate and validate results - cap at MAX_RESULTS.WEB (10)
      const validResults = this.deduplicateResults(searchResults.web)
        .filter(result => result.url !== '#' && result.title && result.content)
        .slice(0, MAX_RESULTS.WEB); // Cap at 10 web results

      // 🔍 DEBUG: Image processing investigation
      console.log('🔍 [RETRIEVER] Image processing debug:', {
        rawImagesCount: searchResults.images?.length || 0,
        firstRawImage: searchResults.images?.[0] || 'NO RAW IMAGES',
        rawImagesStructure: searchResults.images?.slice(0, 2) || []
      });

      // Cap at MAX_RESULTS.IMAGES (10)
      const validImages = this.deduplicateImages(searchResults.images)
        .slice(0, MAX_RESULTS.IMAGES); // Cap at 10 images

      console.log('🔍 [RETRIEVER] After deduplication:', {
        validImagesCount: validImages.length,
        firstValidImage: validImages[0] || 'NO VALID IMAGES',
        maxImagesAllowed: MAX_RESULTS.IMAGES
      });

      // Cap at MAX_RESULTS.VIDEO (10)
      const validVideos = searchResults.videos?.slice(0, MAX_RESULTS.VIDEO) || []; // Cap at 10 videos

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
          query: trimmedQuery, // Empty string for image-only search, actual query for text search
          results: validResults,
          images: validImages,
          videos: validVideos,
          isReverseImageSearch: hasImages // TRUE if image was attached, FALSE for text-only
        }
      };
      
    } catch (error) {
      logger.error('Retrieval failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        hasImages: imageUrls && imageUrls.length > 0
      });
      return this.handleError(error, 'execute') as AgentResponse<{
        query: string;
        results: SearchResult[];
        images: ImageResult[];
        videos: VideoResult[];
        isReverseImageSearch?: boolean;
      }>;
    }
  }

  // Image search using reverse image search (with optional query)
  private async imageOnlySearch(imageUrls: string[], query?: string): Promise<{ web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] }> {
    console.log('🔍 [RETRIEVER] Image search initiated', { 
      imageCount: imageUrls.length,
      hasQuery: !!query,
      query: query || '(no query)'
    });
    logger.info('Image search initiated', { 
      imageCount: imageUrls.length,
      hasQuery: !!query 
    });

    try {
      // Use first image for reverse image search
      const firstImageUrl = imageUrls[0];
      console.log('🔍 [RETRIEVER] Calling bingReverseImageSearchTool with:', { 
        imageUrl: firstImageUrl,
        query: query || 'none'
      });
      
      const reverseResults = await bingReverseImageSearchTool(firstImageUrl, query);

      console.log('🔍 [RETRIEVER] Bing reverse image search completed', {
        webCount: reverseResults.web.length,
        imagesCount: reverseResults.images.length,
        firstImage: reverseResults.images[0] ? {
          url: reverseResults.images[0].url,
          alt: reverseResults.images[0].alt,
          title: reverseResults.images[0].title,
          source_url: reverseResults.images[0].source_url
        } : 'NO IMAGES'
      });
      
      logger.info('Bing reverse image search completed', {
        webCount: reverseResults.web.length,
        imagesCount: reverseResults.images.length
      });

      // Cleanup: Delete uploaded image from Supabase Storage to prevent junk accumulation
      try {
        console.log('🗑️ [RETRIEVER] Cleaning up uploaded image:', firstImageUrl);
        await deleteImageFromStorage(firstImageUrl);
        console.log('✅ [RETRIEVER] Image cleanup successful');
      } catch (cleanupError) {
        // Don't fail the search if cleanup fails
        console.warn('⚠️ [RETRIEVER] Image cleanup failed (non-critical):', cleanupError);
        logger.warn('Image cleanup failed', { 
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
          imageUrl: firstImageUrl
        });
      }

      return {
        web: reverseResults.web,
        images: reverseResults.images,
        videos: [] // Reverse image search doesn't return videos
      };
    } catch (error: any) {
      console.error('❌ [RETRIEVER] Image search failed:', error.message, error);
      logger.error('Image search failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  // SCENARIO 2: Text-only search (existing Brave + Apify fallback)
  private async textOnlySearch(query: string, onStatusUpdate?: (status: string) => void): Promise<{ web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] }> {
    logger.info('Text-only search initiated', { query });

    try {
      // Simple tool call - no complex logic
      const braveResults = await braveSearchTool(query);
      
      // 🐛 DEBUG: Log what we got from Brave tool
      console.log('🔍 [RETRIEVER] Brave tool returned:', {
        webCount: braveResults.web?.length || 0,
        imageCount: braveResults.images?.length || 0,
        newsCount: braveResults.news?.length || 0,
        videoCount: braveResults.videos?.length || 0,
        firstWeb: braveResults.web?.[0]?.title || 'NO WEB',
        firstImage: braveResults.images?.[0]?.url || 'NO IMAGES'
      });
      
      // Combine web and news for final results - cap news at MAX_RESULTS.NEWS (10)
      const cappedNews = braveResults.news.slice(0, MAX_RESULTS.NEWS);
      const searchResults = {
        web: [...braveResults.web, ...cappedNews],
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
      
      return searchResults;
      
    } catch (braveError) {
      logger.warn('Brave Search Tool failed, falling back to Apify', {
        error: braveError instanceof Error ? braveError.message : braveError
      });
      
      onStatusUpdate?.('Brave Search failed, trying Apify...');
      
      // Wait 1 second before fallback (rate limit respect)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Simple tool call - no complex logic
        const apifyResults = await apifySearchTool(query);
        
        const searchResults = {
          web: apifyResults.web,
          images: apifyResults.images,
          videos: [] // Apify doesn't support video search
        };
        
        logger.info('Apify Search Tool completed', {
          webCount: searchResults.web.length,
          imagesCount: searchResults.images.length
        });
        
        onStatusUpdate?.('Search completed with Apify!');
        
        return searchResults;
        
      } catch (apifyError) {
        logger.error('Both Brave and Apify failed', {
          braveError: braveError instanceof Error ? braveError.message : braveError,
          apifyError: apifyError instanceof Error ? apifyError.message : apifyError
        });
        
        throw apifyError;
      }
    }
  }

  // Build enriched query string from reverse image search results + original user query
  // Follows the same rules as serp-test: top keywords (10), top websites (4), top 2 image titles
  // Drops site: filters and enforces 400 chars / 50 words cap
  private buildEnrichedQuery(reverseResults: { web: SearchResult[]; images: ImageResult[] }, userQuery: string): string {
    try {
      const web = reverseResults.web || [];
      const images = reverseResults.images || [];

      const keywords: string[] = [];
      const websites = new Set<string>();
      const imageTitles: string[] = [];

      // Extract from web results (first 4)
      web.slice(0, 4).forEach((r) => {
        if (r.url) {
          try {
            const domain = new URL(r.url).hostname.replace('www.', '').split('.')[0];
            if (domain) websites.add(domain);
          } catch {}
        }
        const title = (r.title || '').replace(/site:\S+/gi, '');
        const titleWords = title.split(/\s+/).filter(w => w.length > 3 && !/^(the|and|for|with|from|this|that|https?)$/i.test(w)).slice(0, 3);
        keywords.push(...titleWords);
      });

      // Extract from images (first 4)
      images.slice(0, 4).forEach((img) => {
        const t = img.title || img.alt || '';
        if (t) {
          const short = t.length > 30 ? t.slice(0, 27) + '...' : t;
          imageTitles.push(short);
        }
      });

      const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 10);
      const topWebsites = Array.from(websites).slice(0, 4);

      let contextParts: string[] = [];
      if (uniqueKeywords.length) contextParts.push(uniqueKeywords.join(' '));
      if (topWebsites.length) contextParts.push('From: ' + topWebsites.join(', '));
      if (imageTitles.length) contextParts.push('Images: ' + imageTitles.slice(0, 2).join('; '));

      let context = contextParts.join('. ');

      // Clean site: filters and other noisy tokens
      context = context.replace(/site:\S+/gi, '');

      // Enforce word and char caps
      const words = context.split(/\s+/).filter(Boolean);
      if (words.length > 50) context = words.slice(0, 50).join(' ') + '...';
      if (context.length > 400) context = context.slice(0, 397) + '...';

      const base = userQuery && userQuery.trim().length > 0 ? userQuery.trim() : '';
      return base ? `${base}. Relacionado con: ${context}` : context;
    } catch (err) {
      console.warn('⚠️ [RETRIEVER] Failed to build enriched query, falling back to user query', err);
      return userQuery;
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
    isReverseImageSearch?: boolean;
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
      videos: [],
      isReverseImageSearch: false
    };
  }
}
