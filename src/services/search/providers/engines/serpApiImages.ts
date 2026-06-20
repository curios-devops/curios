// SerpAPI image search — reuses the existing `google-images-search` edge
// function (server-side SERPAPI_API_KEY), same as Studio's GoogleImageService.
// Primary image engine for the Default tier; callers fall back to Brave.

import type { ImageResult } from '../mediaSearchProvider';
import { GoogleImageService } from '../../../studio/assets/googleImageService';
import { logger } from '../../../../utils/logger';

const service = new GoogleImageService();

export async function searchSerpApiImages(query: string, count = 12): Promise<ImageResult[]> {
  if (!query?.trim()) return [];
  try {
    const images = await service.searchImages(query, { count });
    return images
      .filter((img) => !!img.url)
      .map((img) => ({
        url: img.url,
        title: img.title || query,
        source: img.source,
        thumbnail: img.thumbnail,
        width: img.width,
        height: img.height,
      }));
  } catch (error) {
    logger.warn('SerpApiImages: search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
