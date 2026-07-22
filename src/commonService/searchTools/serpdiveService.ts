import { SearchResult, ImageResult } from '../utils/types';
import { API_TIMEOUTS } from '../utils/config';
import { sanitizeResponse } from '../utils/utils';

interface SerpdiveResult {
  url: string;
  title: string | null;
  content: string;
  date?: string;
}

interface SerpdiveResponse {
  query: string;
  results: SerpdiveResult[];
  response_time_ms?: number;
}

class SerpdiveError extends Error {
  constructor(message: string, public readonly isRateLimit: boolean = false) {
    super(message);
    this.name = 'SerpdiveError';
  }
}

export async function searchWithSerpdive(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const searchSerpdive = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.SERPDIVE);

    try {
      // Validate API key
      if (!import.meta.env.VITE_SERPDIVE_API_KEY?.trim()) {
        throw new SerpdiveError('SERPdive API key not configured');
      }

      // Validate query
      if (!query?.trim()) {
        throw new SerpdiveError('Search query is required');
      }

      // SERPdive API call - does NOT use rate limit queue (independent from Brave)
      const res = await fetch('https://api.serpdive.com/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SERPDIVE_API_KEY}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          max_results: 10, // Cap delivered results; content is already extracted page text
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limit response
      if (res.status === 429) {
        throw new SerpdiveError('Rate limit exceeded', true);
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error('SERPdive API error:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText.substring(0, 200)
        });
        throw new SerpdiveError(`SERPdive API error: ${res.status} - ${errorText.substring(0, 100)}`);
      }

      const data = await res.json();

      const sanitizedData = sanitizeResponse(data) as SerpdiveResponse;

      // Process results with validation. `content` is the extracted text of
      // the page, not a snippet; a missing title falls back to the URL so
      // titleless pages are not dropped.
      const results = (sanitizedData.results || [])
        .filter(result => {
          try {
            return (
              result?.url?.trim() &&
              result?.content?.trim() &&
              new URL(result.url)
            );
          } catch {
            return false;
          }
        })
        .map(result => ({
          title: result.title?.trim() || result.url.trim(),
          url: result.url.trim(),
          content: result.content.trim(),
        }))
        .slice(0, 10); // Cap at 10 results

      // SERPdive has no image endpoint; never fabricate image entries.
      return { results, images: [] as ImageResult[] };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    // Call searchSerpdive directly (no retry wrapper to avoid conflicts with rate limit queue)
    return await searchSerpdive();
  } catch (error) {
    const isAborted =
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof Error && /aborted|abort/i.test(error.message));

    // Handle rate limit errors quietly
    if (error instanceof SerpdiveError && error.isRateLimit) {
      console.warn('SERPdive rate limit hit, falling back to alternative sources');
    } else if (isAborted) {
      console.info('SERPdive search request cancelled', {
        query,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('SERPdive search error:', {
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
