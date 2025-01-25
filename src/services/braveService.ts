import axios from 'axios';
import { SearchResult, ImageResult } from './types';
import { API_TIMEOUT, MAX_RESULTS, RETRY_OPTIONS } from './config';
import { withRetry } from './utils';
import { rateLimitQueue } from './rateLimit';

interface BraveResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
  images?: {
    results: Array<{
      url: string;
      title: string;
      source_url: string;
    }>;
  };
}

export async function searchWithBrave(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const searchBrave = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      // Add request to rate limit queue
      const response = await rateLimitQueue.add(async () => {
        const res = await axios.get('https://api.search.brave.com/res/v1/web/search', {
          params: {
            q: query,
            result_filter: 'web,images',
            safesearch: 'moderate',
            text_decorations: false,
            count: MAX_RESULTS * 2
          },
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': import.meta.env.VITE_BRAVE_API_KEY
          },
          signal: controller.signal
        });

        if (res.status === 429) {
          throw new Error('Rate limit exceeded');
        }

        return res;
      });

      clearTimeout(timeoutId);

      const data = response.data as BraveResponse;
      
      // Process web results
      const results = (data.web?.results || [])
        .filter(result => {
          try {
            return (
              result.title?.trim() &&
              result.url?.trim() &&
              result.description?.trim() &&
              new URL(result.url)
            );
          } catch {
            return false;
          }
        })
        .map(result => ({
          title: result.title.trim(),
          url: result.url.trim(),
          content: result.description.trim()
        }))
        .slice(0, MAX_RESULTS);

      // Process image results
      const images = (data.images?.results || [])
        .filter(image => {
          try {
            return (
              image.url?.trim() &&
              image.title?.trim() &&
              new URL(image.url).protocol === 'https:'
            );
          } catch {
            return false;
          }
        })
        .map(image => ({
          url: image.url.trim(),
          alt: image.title.trim(),
          source_url: image.source_url?.trim() || image.url
        }))
        .slice(0, MAX_RESULTS);

      return { results, images };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    return await withRetry(searchBrave, {
      ...RETRY_OPTIONS,
      maxRetries: 2,
      exponentialBackoff: true
    });
  } catch (error) {
    console.warn('Brave search error:', error);
    return { results: [], images: [] };
  }
}