import axios from 'axios';
import { SearchResult, ImageResult } from './types';
import { API_TIMEOUT, MAX_RESULTS, RETRY_OPTIONS } from './config';
import { withRetry } from './utils';
import { rateLimitQueue } from './rateLimit';

interface DuckDuckGoResponse {
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
    Icon?: {
      URL?: string;
    };
  }>;
  Results?: Array<{
    Text: string;
    FirstURL: string;
  }>;
  Image?: string;
}

export async function searchWithDuckDuckGo(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  const searchDuckDuckGo = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      // Add request to rate limit queue
      const response = await rateLimitQueue.add(async () => {
        const res = await axios.get('https://api.duckduckgo.com/', {
          params: {
            q: query,
            format: 'json',
            no_html: 1,
            skip_disambig: 1,
            t: 'CuriosAI',
            ia: 'web,images'
          },
          signal: controller.signal
        });

        return res;
      });

      clearTimeout(timeoutId);

      const data = response.data as DuckDuckGoResponse;
      const results: SearchResult[] = [];
      const images: ImageResult[] = [];

      // Add abstract if available
      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: 'Overview',
          url: data.AbstractURL,
          content: data.AbstractText
        });
      }

      // Process related topics
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics) {
          if (topic.Text && topic.FirstURL) {
            try {
              new URL(topic.FirstURL); // Validate URL
              results.push({
                title: topic.Text.split(' - ')[0] || topic.Text,
                url: topic.FirstURL,
                content: topic.Text
              });

              // Add image if available
              if (topic.Icon?.URL) {
                try {
                  const imageUrl = new URL(topic.Icon.URL);
                  if (imageUrl.protocol === 'https:') {
                    images.push({
                      url: topic.Icon.URL,
                      alt: topic.Text || query,
                      source_url: topic.FirstURL
                    });
                  }
                } catch {
                  // Skip invalid image URLs
                }
              }
            } catch {
              // Skip invalid URLs
              continue;
            }
          }
        }
      }

      // Add main image if available
      if (data.Image) {
        try {
          const imageUrl = new URL(data.Image);
          if (imageUrl.protocol === 'https:') {
            images.push({
              url: data.Image,
              alt: data.AbstractText || query,
              source_url: data.AbstractURL || data.Image
            });
          }
        } catch {
          // Skip invalid image URL
        }
      }

      return {
        results: results.slice(0, MAX_RESULTS),
        images: images.slice(0, MAX_RESULTS)
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  try {
    return await withRetry(searchDuckDuckGo, {
      ...RETRY_OPTIONS,
      maxRetries: 2,
      exponentialBackoff: true
    });
  } catch (error) {
    console.warn('DuckDuckGo search error:', error);
    return { results: [], images: [] };
  }
}