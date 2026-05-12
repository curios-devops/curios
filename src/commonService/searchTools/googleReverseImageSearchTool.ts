// googleReverseImageSearchTool.ts
// Google Reverse Image Search using SERP API via Supabase Edge Function
// Returns web links, images, and metadata related to uploaded images
// PRESERVED FOR FUTURE PRO SEARCH FEATURE

import { logger } from '../../utils/logger';
import type { SearxResult, ImageResult } from '../../types';

const SERP_EDGE_FUNCTION_URL = import.meta.env.VITE_SERP_API_URL || 
  'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/reverse-image-search';
const SEARCH_TIMEOUT = 30000; // 30 seconds

export interface GoogleReverseImageSearchResults {
  web: SearxResult[];
  images: ImageResult[];
  relatedSearches: string[];
}

/**
 * Google Reverse Image Search using SERP API (Google engine)
 * PRESERVED FOR FUTURE PRO SEARCH FEATURE
 * @param imageUrl Public URL of the image to search
 * @param query Optional text query to combine with image search
 * @returns Formatted search results
 */
export async function googleReverseImageSearchTool(imageUrl: string, query?: string): Promise<GoogleReverseImageSearchResults> {
  logger.info('Reverse Image Search Tool: Starting', { imageUrl, query: query || 'none' });

  // Get Supabase anon key for authentication
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key not found');
  }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    const error = 'Invalid image URL - must be a public HTTP(S) URL';
    logger.error('Reverse Image Search Tool: Invalid input', { error, imageUrl });
    throw new Error(error);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SEARCH_TIMEOUT);

    const response = await fetch(SERP_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageUrl,
        query: query || undefined // Pass query if provided
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('SERP API reverse image search error', { 
        status: response.status, 
        error: errorText,
        imageUrl 
      });
      throw new Error(`Reverse image search failed: ${response.status} - ${errorText}`);
    }

    const edgeResponse = await response.json();
    
    if (!edgeResponse.success || !edgeResponse.data) {
      throw new Error('Edge function returned unsuccessful response');
    }
    
    const data = edgeResponse.data;
    
    // Edge Function already transformed the data, just use it directly
    const finalResult = {
      web: data.web || [],
      images: data.images || [],
      relatedSearches: data.relatedSearches || []
    };

    logger.info('Reverse Image Search Tool: Success', {
      webCount: finalResult.web.length,
      imageCount: finalResult.images.length,
      relatedSearchesCount: finalResult.relatedSearches.length
    });

    return finalResult;

  } catch (err: any) {
    if (err.name === 'AbortError') {
      const timeoutError = `Reverse image search timeout after ${SEARCH_TIMEOUT}ms`;
      logger.error('Reverse image search timeout', { timeout: SEARCH_TIMEOUT, imageUrl });
      throw new Error(timeoutError);
    }

    logger.error('Reverse Image Search Tool: Error', { 
      error: err.message, 
      stack: err.stack,
      imageUrl 
    });
    throw err;
  }
}
