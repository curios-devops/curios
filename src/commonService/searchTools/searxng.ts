import axios from 'axios';
import { SearchResult, ImageResult, VideoResult } from '../utils/types';
import { API_TIMEOUTS, MAX_RESULTS } from '../utils/constants';
import { logger } from '../../utils/logger';

// Number of retries for failed requests
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// SearxngResult interface removed as it's no longer used

interface SearxngResponse {
  query: string;
  results: any; // We allow any because sometimes it may not be an array.
  answers: string[];
  corrections: string[];
  infoboxes: any[];
  suggestions: string[];
  unresponsive_engines: string[];
  videos?: any[];
}

// Use Vite's import.meta.env for configuration.
const SEARXNG_FORMAT = import.meta.env.VITE_SEARXNG_FORMAT || 'json';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

const createSearxngConfig = (query: string) => ({
  method: 'GET',
  url: 'https://searx-search-api.p.rapidapi.com/search',
  params: {
    q: query,
    format: SEARXNG_FORMAT,
    safesearch: 1,
    engines: 'google,bing,duckduckgo,brave',
    pageno: 1,
    count: 15, // Request more results to ensure we get enough valid images
    language: 'en-US',
    categories: 'general,images,videos'
  },
  headers: {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': 'searx-search-api.p.rapidapi.com'
  },
  timeout: API_TIMEOUTS.SEARXNG
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
      const response = await axios.request(createSearxngConfig(query));
      
      if (SEARXNG_FORMAT === 'json') {
        const data = response.data as SearxngResponse;
        const { web, images, videos } = processJsonResults(data.results, data.videos);
        logger.info('SearXNG search completed (JSON)', {
          query,
          webResults: web.length,
          imageResults: images.length,
          videoResults: videos.length,
          attempt: attempt + 1
        });
        return { web, images, videos };
      } else {
        // HTML format is no longer supported
        return { web: [], images: [], videos: [] };
      }
    } catch (error: any) {
      const isLastAttempt = attempt === retries;
      const status = error.response?.status;
      
      // Don't retry on certain errors
      if (status === 403 || status === 401) {
        logger.error('SearXNG search failed: Authentication error', {
          error: error.message,
          query,
          attempt: attempt + 1
        });
        throw error;
      }
      
      if (isLastAttempt) {
        logger.error('SearXNG search failed after all retries', {
          error: error.message,
          query,
          attempts: retries + 1
        });
        throw error;
      }
      
      logger.warn('SearXNG search failed, retrying...', {
        error: error.message,
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
    return await searchWithRetry(query);
  } catch (error: any) {
    logger.error('SearXNG search failed', {
      error: error.message,
      query
    });
    return { web: [], images: [], videos: [] };
  }
}