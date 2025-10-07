// braveSearchTool.ts
// Simple Brave Search wrapper using separate web and images endpoints
// Returns: { web, images, news, videos }

import { logger } from '../../utils/logger';
import type { SearxResult, ImageResult, VideoResult } from '../../types';

const SUPABASE_URL = 'https://gpfccicfqynahflehpqo.supabase.co';
const SEARCH_TIMEOUT = 30000; // 30 seconds

export interface BraveSearchResults {
  web: SearxResult[];
  images: ImageResult[];
  news: SearxResult[];
  videos: VideoResult[];
}

/**
 * Brave Search - Calls separate web and images endpoints
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
        type: 'web'  // Simplified: Just get web with deep_results
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
    
        // 🔍 DEBUG: Check what types were returned and if images exist
    console.log('🔍 [BRAVE TOOL] Response structure analysis:', {
      hasResults: !!responseData.results,
      hasData: !!responseData.data,
      resultsKeys: responseData.results ? Object.keys(responseData.results) : [],
      dataKeys: responseData.data ? Object.keys(responseData.data) : [],
      hasImagesInResults: !!responseData.results?.images,
      hasImagesInData: !!responseData.data?.images,
      imagesStructure: responseData.results?.images || responseData.data?.images || 'NO IMAGES FOUND'
    });
    
    // 🔍 DEBUG: Check web structure specifically
    const webData = responseData.results?.web || responseData.data?.web;
    console.log('🔍 [BRAVE TOOL] Web data structure:', {
      hasWebData: !!webData,
      webKeys: webData ? Object.keys(webData) : [],
      hasResults: !!webData?.results,
      resultsCount: webData?.results?.length || 0,
      hasVideos: !!webData?.videos,
      videosCount: webData?.videos?.results?.length || 0,
      hasNews: !!webData?.news,
      newsCount: webData?.news?.results?.length || 0,
      // Look for alternative web results locations
      hasMixed: !!webData?.mixed,
      mixedStructure: webData?.mixed ? Object.keys(webData.mixed) : [],
      mixedMainLength: webData?.mixed?.main?.length || 0
    });
    
    // 🔍 DEBUG: Check if web results are at the top level of responseData
    console.log('🔍 [BRAVE TOOL] Alternative web locations:', {
      topLevelResults: responseData.results ? Object.keys(responseData.results) : [],
      hasTopLevelWeb: !!responseData.results?.web,
      hasTopLevelResults: !!responseData.results?.results,
      alternativeCheck: !!responseData.web?.results || !!responseData.results?.web?.results
    });
    
    // Handle different response structures

    let data;
    // NEW: Handle multi-type edge function response
    if (responseData.results && typeof responseData.results === 'object' && 
        (responseData.results.web || responseData.results.images || responseData.results.news || responseData.results.videos)) {
      console.log('🔍 [BRAVE TOOL] Using multi-type edge function response structure');
      data = responseData.results;
    }
    // OLD: Handle direct Brave API response structure
    else if (responseData.results && Array.isArray(responseData.results)) {
      console.log('🔍 [BRAVE TOOL] Using direct Brave API response structure (results)');
      data = responseData;
    }
    // OLD: Handle alternative response structure
    else if (responseData.data) {
      console.log('🔍 [BRAVE TOOL] Using alternative response structure (data)');
      data = responseData.data;
    }
    else {
      console.error('🔍 [BRAVE TOOL] Unknown response structure:', responseData);
      throw new Error('Unknown response structure from Brave API');
    }

    // Debug: Print structure of data.web and its sub-properties to locate real web result objects
    if (data && data.web) {
      console.log('🔍 [BRAVE TOOL] data.web full structure:', data.web);
      if (data.web.web) {
        console.log('🔍 [BRAVE TOOL] data.web.web structure:', data.web.web);
      }
      if (data.web.results) {
        console.log('🔍 [BRAVE TOOL] data.web.results structure:', data.web.results);
      }
      if (Array.isArray(data.web.main)) {
        console.log('🔍 [BRAVE TOOL] data.web.main structure:', data.web.main);
      }
    }
    
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
    
    // Extract results - handle the nested structure from web search
    // According to Brave API docs: web is direct array, but sometimes it's an object with a property (e.g., 'main') containing the array
    let webResults: any[] = [];
    if (data.web && data.web.mixed && Array.isArray(data.web.mixed.main)) {
      // Filter for type: 'web' only
      webResults = data.web.mixed.main.filter((item: any) => item.type === 'web');
      console.log('🔍 [BRAVE TOOL] Using data.web.mixed.main filtered for type=web. Length:', webResults.length);
    } else if (Array.isArray(data.web)) {
      webResults = data.web;
    } else if (data.web && typeof data.web === 'object') {
      const webKeys = Object.keys(data.web);
      console.log('🔍 [BRAVE TOOL] data.web is object. Keys:', webKeys, 'Values:', data.web);
      if (Array.isArray(data.web.main)) {
        webResults = data.web.main;
        console.log('🔍 [BRAVE TOOL] Using data.web.main as webResults. Length:', webResults.length);
      } else if (Array.isArray(data.web.items)) {
        webResults = data.web.items;
        console.log('🔍 [BRAVE TOOL] Using data.web.items as webResults. Length:', webResults.length);
      } else if (Array.isArray(data.web.results)) {
        webResults = data.web.results;
        console.log('🔍 [BRAVE TOOL] Using data.web.results as webResults. Length:', webResults.length);
      } else {
        const firstArrayKey = webKeys.find(k => Array.isArray(data.web[k]));
        if (firstArrayKey) {
          webResults = data.web[firstArrayKey];
          console.log(`🔍 [BRAVE TOOL] Using data.web['${firstArrayKey}'] as webResults. Length:`, webResults.length);
        } else {
          console.warn('🔍 [BRAVE TOOL] No array property found in data.web.');
        }
      }
    } else {
      console.warn('🔍 [BRAVE TOOL] data.web is not array or object:', data.web);
    }

    // Debug: Print structure of filtered webResults
    if (Array.isArray(webResults) && webResults.length > 0) {
      for (let i = 0; i < Math.min(5, webResults.length); i++) {
        const wr = webResults[i];
        console.log(`🔍 [BRAVE TOOL] webResults[${i}] structure:`, wr);
        if (wr.deep_results) {
          console.log(`🔍 [BRAVE TOOL] webResults[${i}].deep_results:`, wr.deep_results);
        }
        if (wr.images) {
          console.log(`🔍 [BRAVE TOOL] webResults[${i}].images:`, wr.images);
        }
      }
    }

    const imageResults: any[] = []; // Images come from deep_results only
    const newsResults = data.web?.news?.results || [];
    const videoResults = data.web?.videos?.results || [];

    console.log('🔍 [BRAVE TOOL] Extracted counts:', {
      webCount: Array.isArray(webResults) ? webResults.length : 0,
      imageCount: imageResults.length,
      newsCount: newsResults.length,
      videoCount: videoResults.length,
      firstNews: newsResults[0]?.title || 'NO NEWS',
      firstVideo: videoResults[0]?.title || 'NO VIDEOS',
      firstWeb: Array.isArray(webResults) ? webResults[0]?.title || 'NO WEB' : 'WEB NOT ARRAY',
      webStructure: typeof webResults
    });

    // 🎯 EXTRACT IMAGES FROM DEEP RESULTS
    // Brave embeds images in web.results[].deep_results.images[]
    const deepImages: ImageResult[] = [];
    
    // 🐛 DEBUG: Log deep_results structure for first few web results
    if (Array.isArray(webResults) && webResults.length > 0) {
      for (let i = 0; i < Math.min(5, webResults.length); i++) {
        const wr = webResults[i];
        console.log(`🔍 [BRAVE TOOL] webResults[${i}] structure:`, {
          keys: Object.keys(wr),
          hasDeepResults: !!wr.deep_results,
          deepResultsType: typeof wr.deep_results,
          deepResultsKeys: wr.deep_results ? Object.keys(wr.deep_results) : [],
          deepResultsValue: wr.deep_results,
          hasImages: !!wr.deep_results?.images,
          imagesLength: wr.deep_results?.images?.length || 0
        });
      }
    }
    
    console.log('🔍 [BRAVE TOOL] Starting deep_results extraction...');
    
    try {
      if (Array.isArray(webResults)) {
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
      }
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

    // Map to our format - handle direct array or nested structure
    const finalResult = {
      web: Array.isArray(webResults) ? webResults.map((item: any) => ({
        title: item.title || '',
        url: item.url || '',
        content: item.description || ''
      })) : [],
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
