import axios from 'axios';
import { SearchResult, ImageResult, VideoResult } from '../utils/types';
import { MAX_RESULTS } from '../utils/constants';
import { logger } from '../../utils/logger';

// Number of retries for failed requests (reduced to avoid rate limiting)
const MAX_RETRIES = 1; // Only 1 retry = 2 total attempts
const RETRY_DELAY = 2000; // 2 seconds (to respect RapidAPI rate limits)

// SearxngResult interface removed as it's no longer used

interface SearxngResponse {
  query: string;
  number_of_results?: number; // Added: API returns this field
  results: any; // We allow any because sometimes it may not be an array.
  answers: string[];
  corrections: string[];
  infoboxes: any[];
  suggestions: string[];
  unresponsive_engines: any[]; // Changed from string[] to any[] to handle [engine, reason] pairs
  videos?: any[];
}

// Use Vite's import.meta.env for configuration.
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

// Updated to match EXACT official RapidAPI SearXNG documentation
const createSearxngConfig = (query: string, method: 'POST' | 'GET' = 'POST', endpoint: string = '/search') => ({
  method: method,
  url: `https://searxng.p.rapidapi.com${endpoint}`,
  params: {
    q: query,
    categories: 'general',
    engines: 'Yahoo,Duckduckgo,Bing,Google',  // EXACT capitalization from official API
    language: 'auto',
    pageno: '1',
    format: 'json',
    results_on_new_tab: '0',
    image_proxy: 'true',
    safesearch: '0'
  },
  headers: {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': 'searxng.p.rapidapi.com',
    'Content-Type': 'application/json'
  },
  data: method === 'POST' ? {
    key1: 'value',
    key2: 'value'
  } : undefined,  // Only include data for POST requests
  timeout: 30000
});

function sanitizeContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http');
  } catch {
    return false;
  }
}

function processJsonResults(results: any, videosData: any[] = []): { web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] } {
  const web: SearchResult[] = [];
  const images: ImageResult[] = [];
  const videos: VideoResult[] = [];

  // Early return if results is not an array
  if (!Array.isArray(results)) {
    logger.error("Unexpected format: 'results' is not iterable", { results });
    return { web, images, videos };
  }

  // Process all results first
  for (const result of results) {
    if (!isValidUrl(result.url)) continue;
    if (result.img_src || result.thumbnail) {
      images.push({
        url: result.img_src || result.thumbnail || result.url,
        alt: result.title || 'Search result image',
        source_url: result.url
      });
    } else {
      web.push({
        title: result.title || 'Untitled',
        url: result.url,
        content: sanitizeContent(result.content || '')
      });
    }
  }

  // Process video results if available
  if (Array.isArray(videosData)) {
    logger.debug('Processing video data from SearXNG API', {
      videoCount: videosData.length,
      firstVideo: videosData[0]
    });
    
    for (const video of videosData) {
      if (!isValidUrl(video.url)) continue;
      videos.push({
        title: video.title || 'Untitled Video',
        url: video.url,
        thumbnail: video.thumbnail || video.img_src,
        duration: video.duration
      });
    }
    
    logger.debug('Processed videos', { processedVideoCount: videos.length });
  } else {
    logger.debug('No video data received from SearXNG API', { videosData });
  }

  // Cap results according to MAX_RESULTS constants
  const cappedWeb = web.slice(0, MAX_RESULTS.WEB);
  const cappedImages = images
    .filter(img => img.url.startsWith('https://'))
    .slice(0, MAX_RESULTS.IMAGES);
  const cappedVideos = videos.slice(0, MAX_RESULTS.VIDEO);
  
  logger.debug('Final result counts', {
    web: cappedWeb.length,
    images: cappedImages.length,
    videos: cappedVideos.length
  });
  
  return { 
    web: cappedWeb, 
    images: cappedImages,
    videos: cappedVideos
  };
}

async function searchWithRetry(query: string, retries = MAX_RETRIES): Promise<{ web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Try POST on first attempt, GET on retry
      const method = attempt === 0 ? 'POST' : 'GET';
      const endpoint = attempt === 0 ? '/search' : '/';  // /search for POST, / for GET
      
      logger.info('🔵 [SEARXNG] Sending request', {
        query,
        method,
        endpoint,
        attempt: attempt + 1,
        maxRetries: retries + 1,
        timeout: 30000
      });
      
      const response = await axios.request(createSearxngConfig(query, method, endpoint));
      
      logger.info('🟢 [SEARXNG] Response received', {
        status: response.status,
        method,
        endpoint,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
      
      // API always returns JSON format
      const data = response.data as SearxngResponse;
      
      // Log raw response data for debugging
      logger.info('🔵 [SEARXNG] Processing response data', {
        hasResults: !!data.results,
        resultsType: Array.isArray(data.results) ? 'array' : typeof data.results,
        resultsLength: Array.isArray(data.results) ? data.results.length : 0,
        numberOfResults: data.number_of_results,
        hasVideos: !!data.videos,
        firstResult: Array.isArray(data.results) && data.results.length > 0 ? {
          title: data.results[0]?.title,
          url: data.results[0]?.url,
          hasContent: !!data.results[0]?.content
        } : null,
        rawResultsSample: Array.isArray(data.results) ? data.results.slice(0, 2) : 'not-an-array'
      });
      
      const { web, images, videos } = processJsonResults(data.results, data.videos);
      
      logger.info('🟢 [SEARXNG] Search completed successfully', {
        query,
        method,
        endpoint,
        webResults: web.length,
        imageResults: images.length,
        videoResults: videos.length,
        attempt: attempt + 1
      });
      
      return { web, images, videos };
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      const status = error.response?.status;
      
      // Don't retry on certain errors (404, 403, 401, 429, 522)
      if (status === 404) {
        logger.warn('⚠️ SearXNG unavailable: Endpoint not found (404) - using Brave + Tavily only', {
          query,
          attempt: attempt + 1
        });
        return { web: [], images: [], videos: [] };
      }
      
      if (status === 429) {
        logger.warn('⚠️ SearXNG rate limited (429) - using Brave + Tavily only', {
          query,
          attempt: attempt + 1,
          message: 'RapidAPI free tier quota exhausted'
        });
        return { web: [], images: [], videos: [] };
      }
      
      if (status === 522) {
        logger.warn('⚠️ SearXNG connection timeout (522) - using Brave + Tavily only', {
          query,
          attempt: attempt + 1,
          message: 'RapidAPI gateway timeout - request took too long'
        });
        return { web: [], images: [], videos: [] };
      }
      
      if (status === 403 || status === 401) {
        logger.warn('⚠️ SearXNG authentication issue - using Brave + Tavily only', {
          status,
          query,
          attempt: attempt + 1,
          message: 'Check VITE_RAPIDAPI_KEY in .env'
        });
        return { web: [], images: [], videos: [] };
      }

      if (status === 502 || status === 503 || status === 504) {
        logger.warn('SearXNG server error - using Brave + Tavily only', {
          status,
          query,
          attempt: attempt + 1,
          message: 'RapidAPI gateway error or service unavailable'
        });
        // Return empty results instead of throwing - graceful degradation
        return { web: [], images: [], videos: [] };
      }
      
      if (isLastAttempt) {
        logger.error('SearXNG search failed after all retries', {
          error: error.message,
          status: status,
          query,
          attempts: retries + 1
        });
        // Return empty results instead of throwing - graceful degradation
        return { web: [], images: [], videos: [] };
      }
      
      logger.warn('SearXNG search failed, retrying...', {
        error: error.message,
        status: status,
        query,
        attempt: attempt + 1
      });
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
  // This should never be reached due to the throw statements above
  return { web: [], images: [], videos: [] };
}

export async function searxngSearch(query: string): Promise<{ web: SearchResult[]; images: ImageResult[]; videos: VideoResult[] }> {
  try {
    // searchWithRetry now returns empty results instead of throwing, so this should always succeed
    const results = await searchWithRetry(query);
    
    // If we got no results, log it as a warning (not error) since Brave and Tavily are primary sources
    if (results.web.length === 0) {
      logger.warn('SearXNG returned no results (graceful degradation - Brave and Tavily are primary sources)', {
        query
      });
    }
    
    return results;
  } catch (error: any) {
    // This should rarely happen now since searchWithRetry handles errors
    logger.error('SearXNG search failed unexpectedly', {
      error: error.message,
      query
    });
    return { web: [], images: [], videos: [] };
  }
}