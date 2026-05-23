// Media Search Provider - Handles image and video search through Tavily

import { searchWithTavily } from '../../../commonService/searchTools/tavilyService';
import { logger } from '../../../utils/logger';

export interface ImageResult {
  url: string;
  title: string;
  source: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface VideoResult {
  url: string;
  title: string;
  thumbnail: string;
  source?: string;
  duration?: string;
  platform?: string;
}

/**
 * Execute image search using Tavily
 * Returns diverse, high-quality images relevant to the query
 *
 * @param query - The search query
 * @returns Array of image results
 */
export async function searchImages(query: string): Promise<ImageResult[]> {
  if (!query?.trim()) {
    logger.warn('MediaSearchProvider: Empty query provided for image search');
    return [];
  }

  try {
    logger.debug('MediaSearchProvider: Searching images', { query });

    const { images } = await searchWithTavily(query);

    const results = images.map(img => ({
      url: img.url,
      title: img.alt || query,
      source: extractDomain(img.url),
      thumbnail: img.url
    }));

    logger.info('MediaSearchProvider: Image search completed', {
      resultCount: results.length
    });

    return results;
  } catch (error) {
    logger.error('MediaSearchProvider: Image search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query
    });
    return [];
  }
}

/**
 * Execute video search
 * Note: Tavily doesn't support video search directly, so we return empty for now
 * Future: Can be extended with YouTube API or SerpAPI
 *
 * @param query - The search query
 * @returns Array of video results (empty for now)
 */
export async function searchVideos(query: string): Promise<VideoResult[]> {
  if (!query?.trim()) {
    logger.warn('MediaSearchProvider: Empty query provided for video search');
    return [];
  }

  try {
    logger.debug('MediaSearchProvider: Video search requested (not yet implemented)', { query });

    // TODO: Implement video search with YouTube API or SerpAPI
    // For now, return empty array
    return [];
  } catch (error) {
    logger.error('MediaSearchProvider: Video search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      query
    });
    return [];
  }
}

/**
 * Extract domain from URL for source attribution
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown source';
  }
}
