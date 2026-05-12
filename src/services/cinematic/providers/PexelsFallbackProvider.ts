/**
 * Pexels Fallback Provider
 * Provides stock videos as fallback when VEO fails or times out
 */

import { logger } from '../../../utils/logger';
import { env } from '../../../config/env';

interface PexelsVideo {
  url: string;
  duration: number;
  width: number;
  height: number;
}

interface PexelsSearchResponse {
  videos: Array<{
    id: number;
    duration: number;
    video_files: Array<{
      id: number;
      quality: string;
      file_type: string;
      width: number;
      height: number;
      link: string;
    }>;
  }>;
}

export class PexelsFallbackProvider {
  private apiKey: string;
  private missingKeyWarningShown = false;
  private readonly MAX_VIDEO_DURATION = 10; // Cap at 10 seconds

  constructor() {
    this.apiKey = this.resolveApiKey();
  }

  private resolveApiKey(): string {
    const candidates = [
      env.pexels.apiKey,
      import.meta.env.VITE_PEXELS_API_KEY,
      import.meta.env.PEXELS_API_KEY,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const normalized = candidate.trim();
      if (!normalized) continue;
      if (normalized.toLowerCase() === 'undefined' || normalized.toLowerCase() === 'null') continue;
      return normalized;
    }

    return '';
  }

  private warnMissingKeyOnce(): void {
    if (this.missingKeyWarningShown) return;
    this.missingKeyWarningShown = true;
    logger.warn('[PexelsFallback] Missing API key (`VITE_PEXELS_API_KEY` or `PEXELS_API_KEY`) - Pexels fallback is disabled');
  }

  /**
   * Search for a video on Pexels based on a query
   */
  async getVideo(
    query: string,
    aspectRatio: '16:9' | '1:1' = '16:9'
  ): Promise<PexelsVideo> {
    const orientation = aspectRatio === '1:1' ? 'square' : 'landscape';

    logger.info('[PexelsFallback] Searching for video via backend', { query, orientation });

    try {
      // Use Supabase Edge Function to avoid CORS issues
      const { supabase } = await import('../../../lib/supabase');
      const { data, error } = await supabase.functions.invoke('pexels-search', {
        body: {
          query,
          type: 'videos',
          perPage: 5,
          orientation,
        },
      });

      if (error) {
        throw new Error(`Pexels backend error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response from Pexels backend');
      }

      const searchData = data as PexelsSearchResponse;

      if (!searchData.videos || searchData.videos.length === 0) {
        throw new Error('No Pexels videos found for query');
      }

      // Prefer videos that contain a 1280x720 file for concat consistency
      const preferredVideo = searchData.videos.find((candidate) =>
        candidate.video_files.some((file) => file.width === 1280 && file.height === 720)
      ) || searchData.videos[0];

      // Find best quality file (prefer exact 1280x720 first)
      const hdFile = preferredVideo.video_files.find(
        (f) => f.width === 1280 && f.height === 720
      ) || preferredVideo.video_files.find(
        (f) => f.quality === 'hd' && f.width >= 1280
      ) || preferredVideo.video_files.find(
        (f) => f.width >= 1280
      ) || preferredVideo.video_files[0];

      if (!hdFile) {
        throw new Error('No suitable video file found');
      }

      const result: PexelsVideo = {
        url: hdFile.link,
        duration: Math.min(preferredVideo.duration, this.MAX_VIDEO_DURATION),
        width: hdFile.width,
        height: hdFile.height,
      };

      logger.info('[PexelsFallback] Video found', {
        url: result.url.substring(0, 50),
        duration: result.duration,
        resolution: `${result.width}x${result.height}`,
      });

      return result;
    } catch (error) {
      logger.error('[PexelsFallback] Search failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if Pexels is configured and available
   */
  isAvailable(): boolean {
    // Pexels is always available now since we use backend function
    return true;
  }
}
