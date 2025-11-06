import { SearchResult, ImageResult } from '../utils/types';
import { API_TIMEOUTS } from '../utils/config';
import { sanitizeResponse } from '../utils/utils';

interface TavilyImage {
  url: string;
  description?: string;
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  images?: TavilyImage[];
  response_time: number;
}

class TavilyError extends Error {
  constructor(message: string, public readonly isRateLimit: boolean = false) {
    super(message);
    this.name = 'TavilyError';
  }
}

export async function searchWithTavily(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const searchTavily = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.TAVILY);

    try {
      // Validate API key
      if (!import.meta.env.VITE_TAVILY_API_KEY?.trim()) {
        throw new TavilyError('Tavily API key not configured');
      }

      // Validate query
      if (!query?.trim()) {
        throw new TavilyError('Search query is required');
      }

      // Tavily API call - does NOT use rate limit queue (independent from Brave)
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: import.meta.env.VITE_TAVILY_API_KEY,
          query: query.trim(),
          search_depth: 'basic', // 'basic' or 'advanced' (advanced costs more)
          max_results: 10, // Tavily max is 10
          include_images: false, // Set to false for free tier
          include_answer: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limit response
      if (res.status === 429) {
        throw new TavilyError('Rate limit exceeded', true);
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Tavily API error:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText.substring(0, 200)
        });
        throw new TavilyError(`Tavily API error: ${res.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await res.json();
      const sanitizedData = sanitizeResponse(data) as TavilyResponse;

      // Process results with validation
      const results = (sanitizedData.results || [])
        .filter(result => {
          try {
            return (
              result?.title?.trim() && 
              result?.url?.trim() && 
              result?.content?.trim() &&
              new URL(result.url)
            );
          } catch {
            return false;
          }
        })
        .map(result => ({
          title: result.title.trim(),
          url: result.url.trim(),
          content: result.content.trim(),
        }))
        .slice(0, 10); // Cap at 10 results

      // Process images with validation
      const images = (sanitizedData.images || [])
        .filter(image => {
          try {
            return image?.url?.trim() && new URL(image.url);
          } catch {
            return false;
          }
        })
        .map(image => ({
          url: image.url.trim(),
          alt: image.description?.trim() || query,
          source_url: image.url.trim(),
        }));

      return { results, images };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    // Call searchTavily directly (no retry wrapper to avoid conflicts with rate limit queue)
    return await searchTavily();
  } catch (error) {
    // Handle rate limit errors quietly
    if (error instanceof TavilyError && error.isRateLimit) {
      console.warn('Tavily rate limit hit, falling back to alternative sources');
    } else {
      console.warn('Tavily search error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query,
        timestamp: new Date().toISOString()
      });
    }

    // Return empty results instead of throwing
    return {
      results: [],
      images: []
    };
  }
}