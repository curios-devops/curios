// braveSearchTool.ts
// Simple Brave Search wrapper using separate web and images endpoints
// Returns: { web, images, news, videos }
// Includes query length limiting and timeout-based Tavily fallback

import { logger } from '../../utils/logger';
import { rateLimitQueue } from '../utils/rateLimit';
import type { SearxResult, ImageResult, VideoResult } from '../../types';

const SUPABASE_URL = 'https://gpfccicfqynahflehpqo.supabase.co';
const BRAVE_INITIAL_TIMEOUT = 5000; // 5 seconds before starting Tavily race
const BRAVE_MAX_TIMEOUT = 15000; // 15 seconds max total timeout for Brave

// Query limits to prevent Brave API failures
const MAX_QUERY_CHARS = 400;
const MAX_QUERY_WORDS = 50;

export interface BraveSearchResults {
  web: SearxResult[];
  images: ImageResult[];
  news: SearxResult[];
  videos: VideoResult[];
}

/**
 * Truncates query to safe limits for Brave API
 * @param query Original query string
 * @returns Truncated query (max 400 chars, 50 words)
 */
function truncateQuery(query: string): string {
  if (!query) return '';
  
  let truncated = query.trim();
  
  // First, limit by words
  const words = truncated.split(/\s+/);
  if (words.length > MAX_QUERY_WORDS) {
    truncated = words.slice(0, MAX_QUERY_WORDS).join(' ');
    logger.info('Query truncated by word count', { 
      originalWords: words.length, 
      truncatedWords: MAX_QUERY_WORDS 
    });
  }
  
  // Then, limit by characters
  if (truncated.length > MAX_QUERY_CHARS) {
    // Try to cut at a word boundary
    truncated = truncated.substring(0, MAX_QUERY_CHARS);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > MAX_QUERY_CHARS * 0.8) {
      truncated = truncated.substring(0, lastSpace);
    }
    logger.info('Query truncated by character count', { 
      originalLength: query.length, 
      truncatedLength: truncated.length 
    });
  }
  
  return truncated;
}

/**
 * Calls Brave web search API
 */
async function callBraveWebSearch(query: string, timeout: number): Promise<Response> {
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return fetch(`${SUPABASE_URL}/functions/v1/brave-web-search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(timeout)
  });
}

/**
 * Calls Brave images search API
 */
async function callBraveImagesSearch(query: string, timeout: number): Promise<Response> {
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return fetch(`${SUPABASE_URL}/functions/v1/brave-images-search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(timeout)
  });
}

/**
 * Parses Brave API response into BraveSearchResults format
 */
function parseBraveResponse(webData: any, imagesData: any): BraveSearchResults {
  // Extract web results
  const webResults: SearxResult[] = (webData.web?.results || webData.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    content: item.description || ''
  }));

  // Extract news results
  const newsResults: SearxResult[] = (webData.news?.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    content: item.description || ''
  }));

  // Extract video results
  const videoResults: VideoResult[] = (webData.videos?.results || []).map((item: any) => ({
    title: item.title || '',
    url: item.url || '',
    thumbnail: item.thumbnail?.src || '',
    duration: item.age || ''
  }));

  // Extract image results
  const imageResults: ImageResult[] = (imagesData.results || [])
    .slice(0, 10)
    .map((item: any) => ({
      url: item.properties?.url || item.thumbnail?.src || '',
      alt: item.title || 'Search result image',
      source_url: item.url || ''
    }))
    .filter((img: ImageResult) => img.url !== '');

  return {
    web: webResults.slice(0, 10),
    images: imageResults,
    news: newsResults.slice(0, 10),
    videos: videoResults.slice(0, 10)
  };
}

/**
 * Calls Tavily as fallback/race competitor
 */
async function callTavilyFallback(query: string): Promise<BraveSearchResults> {
  const { searchWithTavily } = await import('./tavilyService');
  
  console.log('🔄 [BRAVE TOOL] Starting Tavily fallback search');
  const tavilyResults = await searchWithTavily(query);
  
  // Convert Tavily results to BraveSearchResults format
  return {
    web: tavilyResults.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content
    })),
    images: tavilyResults.images,
    news: [],
    videos: []
  };
}

/**
 * Brave Search - Calls separate web and images endpoints
 * Includes query truncation and timeout-based Tavily fallback
 * 
 * Strategy:
 * 1. Truncate query to 400 chars / 50 words
 * 2. Start Brave search with rate limiting
 * 3. If Brave takes > 5 seconds, start Tavily race
 * 4. Return first successful response
 * 
 * @param query Search query string
 * @returns Formatted search results
 */
export async function braveSearchTool(query: string): Promise<BraveSearchResults> {
  // Truncate query to prevent Brave API failures
  const safeQuery = truncateQuery(query);
  logger.info('Brave Search Tool: Starting', { 
    originalQuery: query.substring(0, 50), 
    safeQuery: safeQuery.substring(0, 50),
    wasTruncated: query !== safeQuery 
  });
  
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_ANON_KEY) {
    throw new Error('Supabase anon key not found');
  }

  console.log('🔍 [BRAVE TOOL] Starting search for:', safeQuery.substring(0, 50) + '...');

  // Create promise for Brave search (with rate limiting)
  const braveSearchPromise = (async () => {
    const startTime = Date.now();
    
    try {
      // Call web search through rate limit queue
      const webResponse = await rateLimitQueue.add(async () => {
        console.log('🔍 [BRAVE TOOL] Executing web search API call');
        return callBraveWebSearch(safeQuery, BRAVE_MAX_TIMEOUT);
      });

      // Call images search through rate limit queue
      const imagesResponse = await rateLimitQueue.add(async () => {
        console.log('🔍 [BRAVE TOOL] Executing images search API call');
        return callBraveImagesSearch(safeQuery, BRAVE_MAX_TIMEOUT);
      });

      // Check web response
      if (!webResponse.ok) {
        const errorText = await webResponse.text();
        throw new Error(`Brave web search failed: ${webResponse.status} - ${errorText}`);
      }

      // Parse responses
      const webData = await webResponse.json();
      let imagesData = { results: [] };
      
      if (imagesResponse.ok) {
        imagesData = await imagesResponse.json();
      } else {
        console.log('🔍 [BRAVE TOOL] Images search failed (continuing without images)');
      }

      const results = parseBraveResponse(webData, imagesData);
      
      console.log('✅ [BRAVE TOOL] Brave search completed in', Date.now() - startTime, 'ms');
      return { source: 'brave' as const, results };
      
    } catch (error) {
      console.error('❌ [BRAVE TOOL] Brave search failed:', error);
      throw error;
    }
  })();

  // Set up timeout-based Tavily race
  let tavilyStarted = false;
  const tavilyRacePromise = new Promise<{ source: 'tavily'; results: BraveSearchResults }>((resolve, reject) => {
    // Wait 5 seconds before starting Tavily
    setTimeout(async () => {
      tavilyStarted = true;
      console.log('⏱️ [BRAVE TOOL] 5s elapsed, starting Tavily race');
      
      try {
        const results = await callTavilyFallback(safeQuery);
        console.log('✅ [BRAVE TOOL] Tavily completed, racing with Brave');
        resolve({ source: 'tavily', results });
      } catch (error) {
        console.error('❌ [BRAVE TOOL] Tavily fallback failed:', error);
        reject(error);
      }
    }, BRAVE_INITIAL_TIMEOUT);
  });

  try {
    // Race between Brave (immediate) and Tavily (starts after 5s)
    const winner = await Promise.race([
      braveSearchPromise,
      tavilyRacePromise.catch(() => braveSearchPromise) // If Tavily fails, wait for Brave
    ]);

    logger.info('Brave Search Tool: Success', {
      source: winner.source,
      webCount: winner.results.web.length,
      imageCount: winner.results.images.length,
      tavilyWasStarted: tavilyStarted
    });

    console.log('🏁 [BRAVE TOOL] Winner:', winner.source, {
      web: winner.results.web.length,
      images: winner.results.images.length,
      news: winner.results.news.length,
      videos: winner.results.videos.length
    });

    return winner.results;

  } catch (error: any) {
    // Both failed, try Tavily one more time if it wasn't started
    if (!tavilyStarted) {
      console.log('🔄 [BRAVE TOOL] All searches failed, trying Tavily as last resort');
      try {
        return await callTavilyFallback(safeQuery);
      } catch (tavilyError) {
        console.error('❌ [BRAVE TOOL] Tavily last resort also failed');
      }
    }
    
    logger.error('Brave Search Tool: All searches failed', { 
      error: error.message, 
      query: safeQuery 
    });
    throw error;
  }
}