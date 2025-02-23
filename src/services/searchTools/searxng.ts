import axios from 'axios';
import { SearchResult, ImageResult } from '../types';
import { API_TIMEOUTS, MAX_RESULTS } from '../constants';
import { logger } from '../../utils/logger';

// Number of retries for failed requests
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

interface SearxngResult {
  title: string;
  url: string;
  content?: string;
  img_src?: string;
  thumbnail?: string;
  engine?: string;
  engines?: string[];
}

interface SearxngResponse {
  query: string;
  results: any; // We allow any because sometimes it may not be an array.
  answers: string[];
  corrections: string[];
  infoboxes: any[];
  suggestions: string[];
  unresponsive_engines: string[];
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
    categories: 'general,images'
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

function processJsonResults(results: any): { web: SearchResult[]; images: ImageResult[] } {
  const web: SearchResult[] = [];
  const images: ImageResult[] = [];

  // Early return if results is not an array
  if (!Array.isArray(results)) {
    logger.error("Unexpected format: 'results' is not iterable", { results });
    return { web, images };
  }

  // Process all results first
  for (const result of results) {
    if (!isValidUrl(result.url)) continue;
    if (result.img_src || result.thumbnail) {
      images.push({
        url: result.img_src || result.thumbnail || result.url,
        alt: result.title || 'Search result image',
        title: result.title || '',
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

  // Cap results according to MAX_RESULTS constants
  return { 
    web: web.slice(0, MAX_RESULTS.WEB), 
    // Ensure we cap images at 7 to match Brave search
    images: images
      .filter(img => img.url.startsWith('https://'))
      .slice(0, MAX_RESULTS.IMAGES)
  };
}

function processHtmlResults(html: string): { web: SearchResult[]; images: ImageResult[] } {
  const web: SearchResult[] = [];
  const images: ImageResult[] = [];
  
  // Since we removed cheerio, we'll only support JSON format
  logger.warn('HTML parsing is no longer supported, please use JSON format');
  
  return { web, images };
}

async function searchWithRetry(query: string, retries = MAX_RETRIES): Promise<{ web: SearchResult[]; images: ImageResult[] }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.request(createSearxngConfig(query));
      
      if (SEARXNG_FORMAT === 'json') {
        const data = response.data as SearxngResponse;
        const { web, images } = processJsonResults(data.results);
        logger.info('SearXNG search completed (JSON)', {
          query,
          webResults: web.length,
          imageResults: images.length,
          attempt: attempt + 1
        });
        return { web, images };
      } else {
        const html = response.data as string;
        const { web, images } = processHtmlResults(html);
        return { web, images };
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
        return { web: [], images: [] };
      }

      // Log the error
      logger.warn(`SearXNG search attempt ${attempt + 1} failed`, {
        error: error.message,
        query,
        status
      });

      if (isLastAttempt) {
        logger.error('SearXNG search failed after all retries', {
          error: error.message,
          query,
          attempts: attempt + 1
        });
        return { web: [], images: [] };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  return { web: [], images: [] };
}

export async function searxngSearch(query: string): Promise<{ web: SearchResult[]; images: ImageResult[] }> {
  try {
    return await searchWithRetry(query);
  } catch (error: any) {
    logger.error('Unhandled error in searxngSearch', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query
    });
    return { web: [], images: [] };
  }
}