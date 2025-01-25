import { SearchResult, ImageResult } from './types';
import { API_TIMEOUT, MAX_RESULTS, RETRY_OPTIONS } from './config';
import { sanitizeResponse, withRetry } from './utils';
import { rateLimitQueue } from './rateLimit';

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
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      // Validate API key
      if (!import.meta.env.VITE_TAVILY_API_KEY?.trim()) {
        throw new TavilyError('Tavily API key not configured');
      }

      // Validate query
      if (!query?.trim()) {
        throw new TavilyError('Search query is required');
      }

      // Add request to rate limit queue
      const response = await rateLimitQueue.add(async () => {
        try {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_TAVILY_API_KEY}`,
            },
            body: JSON.stringify({
              query: query.trim(),
              search_depth: 'advanced',
              max_results: MAX_RESULTS,
              include_images: true,
              include_answer: false,
            }),
            signal: controller.signal,
          });

          // Handle rate limit response
          if (res.status === 429) {
            throw new TavilyError('Rate limit exceeded', true);
          }

          if (!res.ok) {
            throw new TavilyError(`Tavily API error: ${res.status}`);
          }

          return res;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw new TavilyError('Request timeout');
          }
          throw error;
        }
      });

      clearTimeout(timeoutId);

      const data = await response.json();
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
        .slice(0, MAX_RESULTS);

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
    // Use withRetry with modified options for rate limits
    return await withRetry(searchTavily, {
      ...RETRY_OPTIONS,
      maxRetries: 1, // Limit retries to 1 for rate limits
      delayMs: 5000, // Increased delay for rate limits
      exponentialBackoff: true
    });
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