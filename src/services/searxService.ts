import axios from 'axios';
import { SearchResult, ImageResult } from './types';
import { env } from '../config/env';
import { withRetry } from './utils';
import { rateLimitQueue } from './rateLimit';

interface SearxResponse {
  results?: Array<{
    title: string;
    url: string;
    content: string;
    img_src?: string;
  }>;
}

const createSearchConfig = (query: string, method: 'GET' | 'POST') => ({
  method,
  url: 'https://searxng.p.rapidapi.com/search',
  params: {
    q: query,
    categories: method === 'POST' ? 'general,images' : 'general',
    engines: 'google,bing,brave,duckduckgo',
    language: 'en',
    pageno: '1',
    format: 'json',
    results_on_new_tab: '0',
    image_proxy: 'true',
    safesearch: '0'
  },
  headers: {
    'X-RapidAPI-Key': env.rapidapi.key,
    'X-RapidAPI-Host': env.rapidapi.host,
    'Content-Type': 'application/json'
  }
});

export async function performRapidAPISearch(
  query: string,
  onStatusUpdate?: (status: string) => void
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  onStatusUpdate?.('Searching with RapidAPI...');

  // Validate query
  if (!query?.trim()) {
    return { results: [], images: [] };
  }

  // Validate API credentials
  if (!env.rapidapi.key || !env.rapidapi.host) {
    console.warn('RapidAPI credentials not configured');
    return { results: [], images: [] };
  }

  try {
    // Try POST first for both text and images
    const postConfig = createSearchConfig(query, 'POST');
    const response = await rateLimitQueue.add(async () => {
      try {
        const res = await axios.request<SearxResponse>(postConfig);
        if (!res.data?.results) {
          throw new Error('No results in response');
        }
        return res;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw error;
      }
    });

    const results = processSearchResults(response.data);
    if (results.results.length > 0 || results.images.length > 0) {
      return results;
    }

    // If POST returns no results, try GET for text-only results
    onStatusUpdate?.('Trying alternative search method...');
    const getConfig = createSearchConfig(query, 'GET');
    const getResponse = await rateLimitQueue.add(async () => {
      try {
        const res = await axios.request<SearxResponse>(getConfig);
        if (!res.data?.results) {
          throw new Error('No results in response');
        }
        return res;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw error;
      }
    });

    return processSearchResults(getResponse.data);
  } catch (error) {
    console.warn('RapidAPI search error:', error instanceof Error ? error.message : error);
    // Return empty results instead of throwing
    return {
      results: [],
      images: []
    };
  }
}

function processSearchResults(data: SearxResponse) {
  const results: SearchResult[] = [];
  const images: ImageResult[] = [];

  if (!data?.results) {
    return { results, images };
  }

  for (const result of data.results) {
    if (!result) continue;

    if (result.img_src) {
      try {
        const url = new URL(result.img_src);
        if (url.protocol === 'https:') {
          images.push({
            url: result.img_src,
            alt: result.title || '',
            source_url: result.url || result.img_src
          });
        }
      } catch {
        // Skip invalid image URLs
      }
    } else if (result.title && result.url && result.content) {
      try {
        // Validate URL
        new URL(result.url);
        results.push({
          title: result.title.trim(),
          url: result.url.trim(),
          content: result.content.trim()
        });
      } catch {
        // Skip invalid URLs
      }
    }
  }

  return {
    results: results.slice(0, 5),
    images: images.slice(0, 5)
  };
}