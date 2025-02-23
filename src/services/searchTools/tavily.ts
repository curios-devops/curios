import axios from 'axios';
import { API_TIMEOUTS, MAX_RESULTS } from '../constants';
import { SearchResult, ImageResult } from '../types';
import { logger } from '../../utils/logger';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  images?: {
    url: string;
    title?: string;
  }[];
}

interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  images?: {
    url: string;
    title?: string;
  }[];
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith('http');
  } catch {
    return false;
  }
}

function sanitizeContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function tavilySearch(query: string): Promise<{ web: SearchResult[]; images: ImageResult[] }> {
  try {
    const apiKey = import.meta.env.VITE_TAVILY_API_KEY;
    if (!apiKey?.trim()) {
      throw new Error('Tavily API key is missing');
    }

    const response = await Promise.race([
      axios.post<TavilyResponse>(
        'https://api.tavily.com/search',
        JSON.stringify({
          query,
          include_images: true,
          include_image_descriptions: true,
          search_depth: "advanced",
          max_results: 20, // Request maximum allowed results
          include_answer: true,
          include_raw_content: false,
          include_domains: [],
          exclude_domains: []
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          },
          timeout: API_TIMEOUTS.TAVILY
        }
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Search request timeout')), API_TIMEOUTS.TAVILY)
      )
    ]);

    const data = response.data;
    
    if (!data) {
      logger.error('Invalid response from Tavily API:', data);
      throw new Error('Invalid API response format');
    }

    // Log response for debugging
    logger.debug('Tavily API response:', {
      hasResults: Array.isArray(data.results),
      hasImages: Array.isArray(data.images),
      resultCount: data.results?.length,
      imageCount: data.images?.length
    });

    // Process web results
    const web = Array.isArray(data.results) ? data.results
      .filter(result => isValidUrl(result.url))
      .filter(result => result.score > 0.6) // Only keep high relevance results
      .map(result => ({
        title: result.title || 'Untitled',
        url: result.url,
        content: sanitizeContent(result.content)
      }))
      .slice(0, MAX_RESULTS.WEB) : [];

    // Process images
    const images = Array.isArray(data.images) ? data.images
      .filter(img => isValidUrl(img.url))
      .filter(img => {
        try {
          // Ensure image URL is HTTPS and looks like an actual image
          const url = new URL(img.url);
          return url.protocol === 'https:' && 
                 /\.(jpg|jpeg|png|webp|gif)$/i.test(url.pathname);
        } catch {
          return false;
        }
      })
      .map(img => ({
        url: img.url,
        alt: img.description || img.title || 'Search result image',
        title: img.title || '',
        source_url: img.url
      }))
      .slice(0, MAX_RESULTS.IMAGES) : [];

    logger.info('Tavily search completed', {
      query,
      webResults: web.length,
      imageResults: images.length
    });

    return { web, images };
  } catch (error) {
    logger.error('Tavily search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query
    });
    return { web: [], images: [] };
  }
}