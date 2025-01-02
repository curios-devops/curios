import { SearchResult, ImageResult } from './types';
import { API_TIMEOUT, MAX_RESULTS, RETRY_OPTIONS } from './config';
import { sanitizeResponse, withRetry } from './utils';

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

export async function searchWithTavily(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const searchTavily = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_TAVILY_API_KEY}`,
        },
        body: JSON.stringify({
          query,
          search_depth: 'advanced',
          max_results: MAX_RESULTS,
          include_images: true,
          include_image_descriptions: true,
          include_answer: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json() as TavilyResponse;
      const sanitizedData = sanitizeResponse(data);

      const results = sanitizedData.results
        .filter(result => result.title && result.url && result.content)
        .map(result => ({
          title: result.title.trim(),
          url: result.url.trim(),
          content: result.content.trim(),
        }))
        .slice(0, MAX_RESULTS);

      const images = (sanitizedData.images || [])
        .filter(image => image.url)
        .map(image => ({
          url: image.url.trim(),
          alt: image.description?.trim() || query,
          source_url: image.url.trim(),
        }));

      return { results, images };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    // Use withRetry utility for automatic retries
    return await withRetry(searchTavily, {
      ...RETRY_OPTIONS,
      timeout: API_TIMEOUT * 2, // Double timeout for retries
    });
  } catch (error) {
    console.error('Tavily search error:', error);
    throw error;
  }
}