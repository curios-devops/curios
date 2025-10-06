// braveSearchTool.ts
// Simple Brave Search wrapper matching test page pattern exactly
// Returns: { web, images, news, videos }

import { logger } from '../../utils/logger';
import type { SearxResult, ImageResult, VideoResult } from '../../types';

const SUPABASE_URL = 'https://gpfccicfqynahflehpqo.supabase.co';
const SEARCH_TIMEOUT = 30000; // 30 seconds - Brave API can be slow with multiple types

export interface BraveSearchResults {
  web: SearxResult[];
  images: ImageResult[];
  news: SearxResult[];
  videos: VideoResult[];
}

/**
 * Brave Search - Simple wrapper matching test page pattern
 * @param query Search query string
 * @returns Formatted search results
 */
export async function braveSearchTool(query: string): Promise<BraveSearchResults> {
  logger.info('Brave Search Tool: Starting', { query });
  
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key not found');
  }

  // Add timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    logger.warn('Brave search timeout', { query, timeout: SEARCH_TIMEOUT });
  }, SEARCH_TIMEOUT);

  try {
    // EXACT same pattern as test page
    const response = await fetch(`${SUPABASE_URL}/functions/v1/brave-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: query,
        types: ['web', 'images', 'news', 'videos']
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Brave edge function error', { 
        status: response.status, 
        error: errorText 
      });
      throw new Error(`Brave search failed: ${response.status}`);
    }

    const responseData = await response.json();
    
    // 🐛 DEBUG: Log the FULL response (first 3000 chars)
    console.log('🔍 [BRAVE TOOL] Full responseData (first 3000 chars):', 
      JSON.stringify(responseData).substring(0, 3000)
    );
    
    // 🐛 DEBUG: Log the response structure summary
    console.log('🔍 [BRAVE TOOL] Response structure:', {
      success: responseData.success,
      hasResults: !!responseData.results,
      hasData: !!responseData.data,
      hasTypes: !!responseData.types,
      hasType: !!responseData.type,
      hasErrors: !!responseData.errors,
      errorCount: responseData.errors?.length || 0
    });
    
    // Handle two possible response structures:
    // 1. { success, results: { web, images, news, videos }, query, types } ← Expected from edge function
    // 2. { success, type, data: { web, images, news, videos }, query } ← Legacy/alternative format
    let data: any;
    
    if (responseData.results) {
      // Structure 1: results is direct property
      data = responseData.results;
      console.log('🔍 [BRAVE TOOL] Using structure 1: responseData.results');
    } else if (responseData.data) {
      // Structure 2: data is direct property
      data = responseData.data;
      console.log('🔍 [BRAVE TOOL] Using structure 2: responseData.data');
    } else {
      console.error('🔍 [BRAVE TOOL] Unknown response structure!', responseData);
      throw new Error('Unexpected Brave API response structure');
    }
    
    // 🐛 DEBUG: Log what we extracted
    console.log('🔍 [BRAVE TOOL] Extracted data:', {
      hasWeb: !!data.web,
      hasImages: !!data.images,
      hasNews: !!data.news,
      hasVideos: !!data.videos,
      webResultsLength: data.web?.results?.length || 0,
      imageResultsLength: data.images?.results?.length || 0,
      newsResultsLength: data.news?.results?.length || 0,
      videoResultsLength: data.videos?.results?.length || 0
    });
    
    // Extract results - data is now pointing to the correct object
    const webResults = data.web?.results || [];
    const imageResults = data.images?.results || [];
    const newsResults = data.news?.results || [];
    const videoResults = data.videos?.results || [];

    // 🎯 EXTRACT IMAGES FROM DEEP RESULTS
    // Brave embeds images in web.results[].deep_results.images[]
    const deepImages: ImageResult[] = [];
    
    // 🐛 DEBUG: Log first web result's deep_results structure
    if (webResults.length > 0) {
      console.log('🔍 [BRAVE TOOL] First web result structure:', {
        hasDeepResults: !!webResults[0].deep_results,
        deepResultsKeys: webResults[0].deep_results ? Object.keys(webResults[0].deep_results) : [],
        hasImages: !!webResults[0].deep_results?.images,
        imagesLength: webResults[0].deep_results?.images?.length || 0
      });
    }
    
    console.log('🔍 [BRAVE TOOL] Starting deep_results extraction...');
    
    try {
      webResults.forEach((result: any, idx: number) => {
        if (result.deep_results?.images) {
          console.log(`🔍 [BRAVE TOOL] Found deep_results.images in web result ${idx}: ${result.deep_results.images.length} images`);
          result.deep_results.images.forEach((img: any) => {
            const imageUrl = img.properties?.url || img.thumbnail?.src || '';
            if (imageUrl) {
              deepImages.push({
                url: imageUrl,
                alt: img.title || result.title || 'Search result image',
                source_url: result.url || ''
              });
            }
          });
        }
      });
    } catch (deepError) {
      console.error('🔍 [BRAVE TOOL] Error extracting deep_results:', deepError);
    }

    console.log('🔍 [BRAVE TOOL] Deep_results extraction complete. Count:', deepImages.length);

    logger.info('Brave Search Tool: Success', {
      webCount: webResults.length,
      imageCount: imageResults.length,
      deepImagesCount: deepImages.length,
      newsCount: newsResults.length,
      videoCount: videoResults.length
    });
    
    // 🐛 DEBUG: Log what we're actually returning
    console.log('🔍 [BRAVE TOOL] Returning formatted results:', {
      webCount: webResults.length,
      imageCount: imageResults.length,
      deepImagesCount: deepImages.length,
      newsCount: newsResults.length,
      videoCount: videoResults.length,
      firstWebResult: webResults[0] || 'NO WEB',
      firstImage: imageResults[0] || 'NO IMAGES',
      firstDeepImage: deepImages[0] || 'NO DEEP IMAGES'
    });

    // Map regular images to our format
    const mappedImages = imageResults.map((img: any) => ({
      url: img.properties?.url || img.thumbnail?.src || '',
      alt: img.title || 'Search result image',
      source_url: img.url || ''
    })).filter((img: ImageResult) => img.url !== '');

    // Combine regular images with deep_results images
    const allImages = [...mappedImages, ...deepImages];

    console.log('🔍 [BRAVE TOOL] Preparing final return object...');

    // Map to our format
    const finalResult = {
      web: webResults.map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.description || ''
      })),
      images: allImages,
      news: newsResults.map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.description || ''
      })),
      videos: videoResults.map((vid: any) => ({
        title: vid.title || '',
        url: vid.url || '',
        thumbnail: vid.thumbnail?.src || '',
        duration: ''
      }))
    };
    
    console.log('🔍 [BRAVE TOOL] Returning result with counts:', {
      web: finalResult.web.length,
      images: finalResult.images.length,
      news: finalResult.news.length,
      videos: finalResult.videos.length
    });
    
    return finalResult;

  } catch (err: any) {
    clearTimeout(timeoutId);
    
    // 🐛 DEBUG: Log detailed error information
    console.error('🔍 [BRAVE TOOL] Error caught:', {
      errorName: err.name,
      errorMessage: err.message,
      isAbortError: err.name === 'AbortError',
      timeout: SEARCH_TIMEOUT,
      query
    });
    
    if (err.name === 'AbortError') {
      logger.error('Brave search timeout', { timeout: SEARCH_TIMEOUT, query });
      throw new Error(`Brave search timeout after ${SEARCH_TIMEOUT}ms`);
    }
    
    logger.error('Brave Search Tool: Error', { 
      error: err.message, 
      stack: err.stack?.substring(0, 200),
      query 
    });
    throw err;
  }
}
