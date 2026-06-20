// Media Search Provider — Default tier routing.
// Images: Serper primary, Brave fallback when sparse (or Serper key missing).
// Videos: not yet implemented.

import { searchSerpApiImages } from './engines/serpApiImages';
import { searchSerpApiVideos } from './engines/serpApiVideos';
import { searchBraveImages, searchBraveVideos } from './engines/braveAdapter';
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

// Below this many SerpAPI images we consider it "few" and bring in Brave.
const MIN_IMAGES = 4;

function dedupeByUrl(images: ImageResult[]): ImageResult[] {
  const seen = new Set<string>();
  const out: ImageResult[] = [];
  for (const img of images) {
    if (!img?.url || seen.has(img.url)) continue;
    seen.add(img.url);
    out.push(img);
  }
  return out;
}

/**
 * Execute image search: SerpAPI primary, Brave fallback when sparse.
 */
export async function searchImages(query: string): Promise<ImageResult[]> {
  if (!query?.trim()) {
    logger.warn('MediaSearchProvider: Empty query provided for image search');
    return [];
  }

  const serpImages = await searchSerpApiImages(query);

  if (serpImages.length >= MIN_IMAGES) {
    logger.info('MediaSearchProvider: SerpAPI image search completed', {
      resultCount: serpImages.length,
    });
    return serpImages;
  }

  logger.info('MediaSearchProvider: SerpAPI sparse, falling back to Brave images', {
    serpCount: serpImages.length,
  });
  const braveImages = await searchBraveImages(query);
  return dedupeByUrl([...serpImages, ...braveImages]).slice(0, 12);
}

function dedupeVideosByUrl(videos: VideoResult[]): VideoResult[] {
  const seen = new Set<string>();
  const out: VideoResult[] = [];
  for (const v of videos) {
    if (!v?.url || seen.has(v.url)) continue;
    seen.add(v.url);
    out.push(v);
  }
  return out;
}

/**
 * Execute video search: Brave primary, SerpAPI fallback when Brave returns none.
 */
export async function searchVideos(query: string): Promise<VideoResult[]> {
  if (!query?.trim()) {
    logger.warn('MediaSearchProvider: Empty query provided for video search');
    return [];
  }

  const braveVideos = await searchBraveVideos(query);

  if (braveVideos.length > 0) {
    logger.info('MediaSearchProvider: Brave video search completed', {
      resultCount: braveVideos.length,
    });
    return braveVideos.slice(0, 10);
  }

  logger.info('MediaSearchProvider: Brave returned no videos, falling back to SerpAPI');
  const serpVideos = await searchSerpApiVideos(query);
  return dedupeVideosByUrl(serpVideos).slice(0, 10);
}
