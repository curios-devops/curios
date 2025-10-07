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

  try {
    // Call both web and images endpoints with rate limiting
    console.log('🔍 [BRAVE TOOL] Starting search for:', query);
    
    // Call web search first
    const webResponse = await fetch(`${SUPABASE_URL}/functions/v1/brave-web-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT)
    });

    // Wait 1 second to respect Brave API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call images search after delay
    const imagesResponse = await fetch(`${SUPABASE_URL}/functions/v1/brave-images-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(SEARCH_TIMEOUT)
    });

    // Check web response
    if (!webResponse.ok) {
      const errorText = await webResponse.text();
      logger.error('Brave web search error', { 
        status: webResponse.status, 
        error: errorText,
        query 
      });
      throw new Error(`Web search failed: ${webResponse.status} - ${errorText}`);
    }
    
    // Check images response (don't fail if images fail - might be API tier limitation)
    let imagesData = { results: [] };
    if (!imagesResponse.ok) {
      const errorText = await imagesResponse.text();
      logger.warn('Brave images search failed (continuing without images)', { 
        status: imagesResponse.status, 
        error: errorText,
        query 
      });
      console.log('🔍 [BRAVE TOOL] Images search failed (continuing without images):', {
        status: imagesResponse.status,
        error: errorText,
        note: 'This might be due to API tier limitations or quota'
      });
    } else {
      imagesData = await imagesResponse.json();
      console.log('🔍 [BRAVE TOOL] Images search successful');
    }

    // Parse web response
    const webData = await webResponse.json();
    
    console.log('🔍 [BRAVE TOOL] Raw API responses:', {
      webKeys: Object.keys(webData),
      webHasResults: !!webData.web?.results,
      webResultsCount: webData.web?.results?.length || 0,
      imagesKeys: Object.keys(imagesData),
      imagesHasResults: !!imagesData.results,
      imagesResultsCount: imagesData.results?.length || 0
    });

    // Extract web results (direct from Brave Web API response)
    const webResults: SearxResult[] = (webData.web?.results || webData.results || []).map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.description || ''
    }));

    // Extract news results from web response
    const newsResults: SearxResult[] = (webData.news?.results || []).map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      content: item.description || ''
    }));

    // Extract video results from web response
    const videoResults: VideoResult[] = (webData.videos?.results || []).map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      thumbnail: item.thumbnail?.src || '',
      duration: item.age || ''
    }));

    // Extract image results from images response (direct from Brave Images API)
    const imageResults: ImageResult[] = (imagesData.results || []).map((item: any) => ({
      url: item.properties?.url || item.thumbnail?.src || '',
      alt: item.title || 'Search result image',
      source_url: item.url || ''
    })).filter((img: ImageResult) => img.url !== '');

    const finalResult = {
      web: webResults,
      images: imageResults,
      news: newsResults,
      videos: videoResults
    };

    logger.info('Brave Search Tool: Success', {
      webCount: finalResult.web.length,
      imageCount: finalResult.images.length,
      newsCount: finalResult.news.length,
      videoCount: finalResult.videos.length
    });

    console.log('🔍 [BRAVE TOOL] Final results:', {
      web: finalResult.web.length,
      images: finalResult.images.length,
      news: finalResult.news.length,
      videos: finalResult.videos.length
    });

    return finalResult;

  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      logger.error('Brave search timeout', { timeout: SEARCH_TIMEOUT, query });
      throw new Error(`Brave search timeout after ${SEARCH_TIMEOUT}ms`);
    }
    
    logger.error('Brave Search Tool: Error', { 
      error: err.message, 
      query 
    });
    throw err;
  }
}