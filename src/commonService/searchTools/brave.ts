// src/services/searchTools/brave.ts

import axios from 'axios';
import { SearchResult } from '../utils/types';
import { API_TIMEOUTS, MAX_RESULTS } from '../utils/constants';
import { logger } from '../../utils/logger';

//
// Constants for result counts - Map to existing MAX_RESULTS structure
//
const DEFAULT_MAX_RESULTS = 20;
const MAX_RESULTS_WEB = MAX_RESULTS.WEB;
const MAX_RESULTS_NEWS = 3; // News results limit
const MAX_RESULTS_VIDEO = MAX_RESULTS.VIDEO;
const MAX_RESULTS_IMAGES = MAX_RESULTS.IMAGES;

//
// --- Interface Definitions ---
//

// For text search answer (web, news, video)
interface MetaUrl {
  scheme: string;
  netloc: string;
  hostname?: string;
  favicon?: string;
  path: string;
}

interface Thumbnail {
  src: string;
  original?: string;
}

interface WebSearchResult {
  type: "search_result";
  title: string;
  url: string;
  description?: string;
  deep_results?: any; // Not used for text search here
  meta_url?: MetaUrl;
}

interface SearchSection {
  type: "search";
  results: WebSearchResult[];
  family_friendly: boolean;
}

interface NewsResult {
  meta_url?: MetaUrl;
  title: string;
  url: string;
  extra_snippets?: string[];
}

interface NewsSection {
  type: "news";
  results: NewsResult[];
  mutated_by_goggles?: boolean;
}

interface VideoResult {
  title?: string;
  video?: {
    duration?: string;
    views?: string;
    creator?: string;
    publisher?: string;
    thumbnail?: Thumbnail;
    tags?: string[];
    author?: any;
    requires_subscription?: boolean;
  };
  meta_url?: MetaUrl;
  thumbnail?: Thumbnail;
  description?: string;
  url?: string;
}

interface VideosSection {
  type: "videos";
  results: VideoResult[];
  mutated_by_goggles?: boolean;
}

interface WebSearchApiResponse {
  type: "search";
  web: SearchSection;
  news?: NewsSection;
  videos?: VideosSection;
}

// For image search answers (dedicated endpoint)
interface ImageSearchResult {
  title: string;
  url: string;
  description?: string;
  image?: string;
  favicon?: string;
  thumbnail?: {
    src: string;
    width: number;
    height: number;
  };
  properties?: {
    url: string;
    placeholder: string;
    width: number;
    height: number;
  };
}

interface BraveImageApiResponse {
  type: string;
  results: ImageSearchResult[];
}

//
// --- End Interface Definitions ---
//

// Build the configuration for the text (web) search API call.
// Updated to use only the minimal parameters per the PHP example.
const createBraveWebConfig = (query: string) => ({
  method: 'GET' as const,
  url: '/api/brave/web/search',
  params: {
    q: query,
    text_decorations: false // replicate PHP sample
  },
  headers: {
    'Accept': 'application/json'
    // Note: Accept-Encoding is managed automatically by the browser
  },
  timeout: API_TIMEOUTS.GENERAL,
});

// Build the configuration for the dedicated image search API call.
const createBraveImageConfig = (query: string) => ({
  method: 'GET' as const,
  url: '/api/brave/images/search',
  params: {
    q: query,
    safesearch: 'strict',
    count: DEFAULT_MAX_RESULTS,
    search_lang: 'en',
    country: 'us',
    spellcheck: 1
  },
  headers: {
    'Accept': 'application/json'
    // Note: Accept-Encoding is managed automatically by the browser
  },
  timeout: API_TIMEOUTS.GENERAL,
});

// Simple URL validator.
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Sanitize content by removing HTML tags (similar to PHP's strip_tags)
function sanitizeContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, '') // Remove HTML entities
    .replace(/\s+/g, ' ')    // Normalize whitespace
    .trim();
}

// Process text search results.
const processWebResults = (results: WebSearchResult[], cap: number): SearchResult[] => {
  return results
    .filter(result => isValidUrl(result.url))
    .slice(0, cap)
    .map(result => ({
      category: 'web',
      title: result.title.trim() || 'Untitled',
      url: result.url.trim(),
      content: sanitizeContent(result.description || ''),
      favicon: result.meta_url?.favicon?.trim() || ''
    }));
};

const processNewsResults = (results: NewsResult[], cap: number): SearchResult[] => {
  return results
    .filter(result => isValidUrl(result.url))
    .slice(0, cap)
    .map(result => ({
      category: 'news',
      title: result.title.trim() || 'Untitled',
      url: result.url.trim(),
      content: sanitizeContent(result.extra_snippets ? result.extra_snippets.join(' ') : ''),
      favicon: result.meta_url?.favicon?.trim() || ''
    }));
};

const processVideoResults = (results: VideoResult[], cap: number): SearchResult[] => {
  return results
    .filter(result => {
      const url = result.url || (result.meta_url ? result.meta_url.path : '');
      return isValidUrl(url);
    })
    .slice(0, cap)
    .map(result => {
      const title = result.title?.trim() || result.video?.creator?.trim() || 'Untitled';
      const url = result.url?.trim() || (result.meta_url ? result.meta_url.path.trim() : '');
      return {
        category: 'video',
        title,
        url,
        content: sanitizeContent(result.description || ''),
        favicon: result.meta_url?.favicon?.trim() || '',
        image: result.thumbnail?.src.trim() || result.video?.thumbnail?.src.trim() || ''
      };
    });
};

// Process image search results from the dedicated image search API.
const processImageSearchResults = (results: ImageSearchResult[], cap: number): SearchResult[] => {
  return results
    .filter(result => isValidUrl(result.url))
    .slice(0, cap)
    .map(result => ({
      category: 'images',
      title: result.title.trim() || '',
      url: result.url.trim(),
      content: sanitizeContent(result.description || ''),
      image: result.properties?.url || result.thumbnail?.src || result.url
    }));
};

//
// Main function: perform text search and image search, then combine results.
// We first call the text search, wait one second (to respect rate limits),
// then call the image search. A check is added to remove any HTML from the text response.
async function braveSearch(query: string): Promise<{
  web: SearchResult[],
  news: SearchResult[],
  images: SearchResult[],
  video: SearchResult[],
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.BRAVE);

  try {
    logger.info('Starting Brave Search', { query });
    
    // --- Text Search Call ---
    const textResponse = await axios.request<WebSearchApiResponse>({
      ...createBraveWebConfig(query),
      signal: controller.signal,
      validateStatus: (status) => {
        // Only accept 200-299 status codes, throw error for others
        if (status >= 200 && status < 300) {
          return true;
        }
        logger.error('Brave API HTTP error', { status, query });
        return false; // This will cause axios to throw an error
      }
    });
    
    logger.info('Brave web search completed', { status: textResponse.status });
    
    let textData: any = textResponse.data;
    // Remove HTML tags if the response is a string (as in the PHP sample)
    if (typeof textData === 'string') {
      textData = textData.replace(/<[^>]*>/g, '');
      textData = JSON.parse(textData);
    }
    const webResults = textData.web && textData.web.results
      ? processWebResults(textData.web.results, MAX_RESULTS_WEB)
      : [];
    const newsResults = textData.news && textData.news.results
      ? processNewsResults(textData.news.results, MAX_RESULTS_NEWS)
      : [];
    const videoResults = textData.videos && textData.videos.results
      ? processVideoResults(textData.videos.results, MAX_RESULTS_VIDEO)
      : [];

    // --- Wait 1 Second to Respect Rate Limits ---
    await new Promise(resolve => setTimeout(resolve, 1000));

    // --- Image Search Call ---
    const imageResponse = await axios.request<BraveImageApiResponse>({
      ...createBraveImageConfig(query),
      signal: controller.signal
    });
    const imageData = imageResponse.data;
    if (typeof imageData === 'string' && (imageData as string).trim().startsWith('<!DOCTYPE html>')) {
      logger.error('Brave Image API returned HTML instead of JSON');
      clearTimeout(timeoutId);
      return {
        web: webResults,
        news: newsResults,
        images: [],
        video: videoResults
      };
    }
    const imageResults = imageData.results
      ? processImageSearchResults(imageData.results, MAX_RESULTS_IMAGES)
      : [];
      
    logger.info('Brave image search results', {
      imageDataResultsCount: imageData.results?.length || 0,
      processedImageResultsCount: imageResults.length,
      sampleImageResult: imageResults[0] || 'none',
      sampleRawResult: imageData.results?.[0] || 'none'
    });

    clearTimeout(timeoutId);

    return {
      web: webResults,
      news: newsResults,
      images: imageResults,
      video: videoResults
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const errorDetails = {
      status: error.response?.status,
      error: error.response?.data?.message || error.message,
      url: error.config?.url,
      params: error.config?.params
    };
    logger.error('Brave Search Failed', errorDetails);
    
    // Throw the error instead of returning empty arrays to trigger fallback
    throw new Error(`Brave Search failed: ${error.response?.status || error.message}`);
  }
}

export { braveSearch };