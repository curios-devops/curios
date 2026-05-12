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

  // Get Supabase anon key for authentication
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key not found');
  }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    const error = 'Invalid image URL - must be a public HTTP(S) URL';
    logger.error('Bing Reverse Image Search Tool: Invalid input', { error, imageUrl });
    throw new Error(error);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, SEARCH_TIMEOUT);

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

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Bing SERP API reverse image search error', { 
        status: response.status, 
        error: errorText,
        imageUrl 
      });
      throw new Error(`Bing reverse image search failed: ${response.status} - ${errorText}`);
    }

    const edgeResponse = await response.json();
    
    if (!edgeResponse.success || !edgeResponse.data) {
      throw new Error('Edge function returned unsuccessful response');
    }
    
    const data = edgeResponse.data;
    
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

    return finalResult;

  } catch (err: any) {
    if (err.name === 'AbortError') {
      const timeoutError = `Bing reverse image search timeout after ${SEARCH_TIMEOUT}ms`;
      logger.error('Bing reverse image search timeout', { timeout: SEARCH_TIMEOUT, imageUrl });
      throw new Error(timeoutError);
    }

    logger.error('Bing Reverse Image Search Tool: Error', { 
      error: err.message, 
      stack: err.stack,
      imageUrl 
    });
    throw err;
  }
}
