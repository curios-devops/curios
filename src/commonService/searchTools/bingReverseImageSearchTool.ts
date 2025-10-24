// bingReverseImageSearchTool.ts
// Bing Reverse Image Search using SERP API via Supabase Edge Function
// Provides higher quality images compared to Google reverse search

import { logger } from '../../utils/logger';
import type { SearxResult, ImageResult } from '../../types';

const BING_SERP_EDGE_FUNCTION_URL = import.meta.env.VITE_BING_REVERSE_IMAGE_API_URL || 
  'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/bing-reverse-image-search';
const SEARCH_TIMEOUT = 30000; // 30 seconds

export interface BingReverseImageSearchResults {
  web: SearxResult[];
  images: ImageResult[];
  relatedSearches: string[];
  totalMatches?: number;
}

/**
 * Bing Reverse Image Search using SERP API
 * @param imageUrl Public URL of the image to search
 * @param query Optional text query to refine search
 * @returns Formatted search results with high-quality images
 */
export async function bingReverseImageSearchTool(imageUrl: string, query?: string): Promise<BingReverseImageSearchResults> {
  logger.info('Bing Reverse Image Search Tool: Starting', { imageUrl, query: query || 'none' });
  console.log('🔍 [BING REVERSE IMAGE TOOL] Starting search for:', imageUrl, 'with query:', query || 'none');
  console.log('🔍 [BING REVERSE IMAGE TOOL] Edge Function URL:', BING_SERP_EDGE_FUNCTION_URL);

  // Get Supabase anon key for authentication
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key not found');
  }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    const error = 'Invalid image URL - must be a public HTTP(S) URL';
    console.error('❌ [BING REVERSE IMAGE TOOL]', error);
    throw new Error(error);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ [BING REVERSE IMAGE TOOL] Timeout triggered after', SEARCH_TIMEOUT, 'ms');
      controller.abort();
    }, SEARCH_TIMEOUT);

    console.log('🔍 [BING REVERSE IMAGE TOOL] Calling Supabase Edge Function...');
    const response = await fetch(BING_SERP_EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageUrl,
        query: query || undefined 
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('🔍 [BING REVERSE IMAGE TOOL] Response received:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BING REVERSE IMAGE TOOL] HTTP error:', response.status, errorText);
      logger.error('Bing SERP API reverse image search error', { 
        status: response.status, 
        error: errorText,
        imageUrl 
      });
      throw new Error(`Bing reverse image search failed: ${response.status} - ${errorText}`);
    }

    console.log('🔍 [BING REVERSE IMAGE TOOL] Parsing JSON response...');
    const edgeResponse = await response.json();
    
    if (!edgeResponse.success || !edgeResponse.data) {
      throw new Error('Edge function returned unsuccessful response');
    }
    
    const data = edgeResponse.data;
    
    console.log('🔍 [BING REVERSE IMAGE TOOL] Raw API response keys:', Object.keys(data));
    console.log('🔍 [BING REVERSE IMAGE TOOL] Web results count:', data.web?.length || 0);
    console.log('🔍 [BING REVERSE IMAGE TOOL] Images count:', data.images?.length || 0);
    console.log('🔍 [BING REVERSE IMAGE TOOL] Total matches:', data.totalMatches || 0);

    // Edge Function already transformed the data
    const finalResult = {
      web: data.web || [],
      images: data.images || [],
      relatedSearches: data.relatedSearches || [],
      totalMatches: data.totalMatches || 0
    };

    logger.info('Bing Reverse Image Search Tool: Success', {
      webCount: finalResult.web.length,
      imageCount: finalResult.images.length,
      totalMatches: finalResult.totalMatches
    });

    console.log('🔍 [BING REVERSE IMAGE TOOL] Final results:', {
      web: finalResult.web.length,
      images: finalResult.images.length,
      totalMatches: finalResult.totalMatches,
      firstImage: finalResult.images[0] || 'NO IMAGES'
    });

    return finalResult;

  } catch (err: any) {
    if (err.name === 'AbortError') {
      const timeoutError = `Bing reverse image search timeout after ${SEARCH_TIMEOUT}ms`;
      console.error('❌ [BING REVERSE IMAGE TOOL] Timeout:', timeoutError);
      logger.error('Bing reverse image search timeout', { timeout: SEARCH_TIMEOUT, imageUrl });
      throw new Error(timeoutError);
    }
    
    console.error('❌ [BING REVERSE IMAGE TOOL] Error:', err.message, err);
    logger.error('Bing Reverse Image Search Tool: Error', { 
      error: err.message, 
      stack: err.stack,
      imageUrl 
    });
    throw err;
  }
}
