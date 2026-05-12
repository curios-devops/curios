/**
 * Pixabay Fallback Provider
 * Provides stock videos as fallback when Pexels fails or returns no results
 * Free API with generous limits: 5000 requests/hour
 */

import { logger } from '../../../utils/logger';
import { env } from '../../../config/env';

interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  duration: number;
  videos: {
    large?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    small?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
    tiny?: {
      url: string;
      width: number;
      height: number;
      size: number;
    };
  };
  views: number;
  downloads: number;
  likes: number;
  comments: number;
  user_id: number;
  user: string;
  userImageURL: string;
}

interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayVideo[];
}

interface PixabayVideoResult {
  url: string;
  duration: number;
  width: number;
  height: number;
}

interface PixabayVideoFile {
  url: string;
  width: number;
  height: number;
  size: number;
}

export class PixabayFallbackProvider {
  private apiKey: string;
  private missingKeyWarningShown = false;
  private readonly API_URL = 'https://pixabay.com/api/videos/';
  private readonly MAX_VIDEO_DURATION = 10; // Cap at 10 seconds

  constructor() {
    this.apiKey = this.resolveApiKey();
  }

  private resolveApiKey(): string {
    const candidates = [
      env.pixabay?.apiKey,
      import.meta.env.VITE_PIXABAY_API_KEY,
      import.meta.env.PIXABAY_API_KEY,
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
    logger.warn('[PixabayFallback] Missing API key (`VITE_PIXABAY_API_KEY` or `PIXABAY_API_KEY`) - Pixabay fallback is disabled');
  }

  /**
   * Search for a video on Pixabay based on a query
   */
  async getVideo(
    query: string,
    aspectRatio: '16:9' | '1:1' = '16:9'
  ): Promise<PixabayVideoResult> {
    if (!this.apiKey) {
      this.warnMissingKeyOnce();
      throw new Error('Pixabay API key not configured');
    }

    logger.info('[PixabayFallback] Searching for video', { query, aspectRatio });

    try {
      // Build API URL
      const url = `${this.API_URL}?key=${this.apiKey}&q=${encodeURIComponent(query)}&per_page=5`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Pixabay API error: ${response.status} ${response.statusText}`);
      }

      const data: PixabaySearchResponse = await response.json();

      if (!data.hits || data.hits.length === 0) {
        throw new Error('No Pixabay videos found for query');
      }

      logger.info('[PixabayFallback] Videos found', {
        query,
        totalHits: data.totalHits,
        returned: data.hits.length,
      });

      // Get first video
      const video = data.hits[0];

      // Find best quality file based on aspect ratio
      const videoFile = this.selectBestVideoFile(video, aspectRatio);

      if (!videoFile) {
        throw new Error('No suitable video file found in Pixabay result');
      }

      const result: PixabayVideoResult = {
        url: videoFile.url,
        duration: Math.min(video.duration, this.MAX_VIDEO_DURATION),
        width: videoFile.width,
        height: videoFile.height,
      };

      const selectedQuality =
        video.videos.large && videoFile.url === video.videos.large.url
          ? 'large'
          : video.videos.medium && videoFile.url === video.videos.medium.url
            ? 'medium'
            : video.videos.small && videoFile.url === video.videos.small.url
              ? 'small'
              : 'tiny';

      logger.info('[PixabayFallback] Video selected', {
        url: result.url.substring(0, 50),
        duration: result.duration,
        resolution: `${result.width}x${result.height}`,
        quality: selectedQuality,
      });

      return result;
    } catch (error) {
      logger.error('[PixabayFallback] Search failed', {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Select best video file based on aspect ratio and quality
   */
  private selectBestVideoFile(
    video: PixabayVideo,
    preferredAspectRatio: '16:9' | '1:1'
  ): PixabayVideoFile | null {
    const { videos } = video;

    if (!videos) {
      return null;
    }

    // Priority order: large > medium > small > tiny
    const candidates = [
      videos.large,
      videos.medium,
      videos.small,
      videos.tiny,
    ].filter((v): v is NonNullable<typeof v> => v !== undefined);

    if (candidates.length === 0) {
      return null;
    }

    // For 16:9, prefer landscape videos (width > height)
    // For 1:1, prefer square-ish videos (similar width and height)
    if (preferredAspectRatio === '16:9') {
      // Find landscape video (width/height ratio close to 16/9)
      const landscapeVideo = candidates.find(v => {
        const ratio = v.width / v.height;
        return ratio >= 1.5; // At least 3:2 ratio
      });

      if (landscapeVideo) {
        return landscapeVideo;
      }
    } else {
      // For 1:1, find square-ish video
      const squareVideo = candidates.find(v => {
        const ratio = v.width / v.height;
        return ratio >= 0.8 && ratio <= 1.2; // Close to 1:1
      });

      if (squareVideo) {
        return squareVideo;
      }
    }

    // Fallback to first available (highest quality)
    return candidates[0];
  }

  /**
   * Check if Pixabay is configured and available
   */
  isAvailable(): boolean {
    if (!this.apiKey) {
      this.warnMissingKeyOnce();
    }
    return !!this.apiKey;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Simple test query
      const url = `${this.API_URL}?key=${this.apiKey}&q=nature&per_page=1`;
      const response = await fetch(url);

      if (!response.ok) {
        logger.warn('[PixabayFallback] Health check failed', {
          status: response.status,
        });
        return false;
      }

      const data: PixabaySearchResponse = await response.json();

      logger.info('[PixabayFallback] Health check passed', {
        totalHits: data.totalHits,
      });

      return data.totalHits > 0;
    } catch (error) {
      logger.error('[PixabayFallback] Health check error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
