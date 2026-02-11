/**
 * Pexels Video Service
 * Searches for stock videos using Pexels API
 */

import { logger } from '../../../utils/logger';

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY || '';
const PEXELS_VIDEO_API_URL = 'https://api.pexels.com/videos';
const PEXELS_PHOTO_API_URL = 'https://api.pexels.com/v1';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsPhotoSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: {
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }>;
}

export interface PexelsSearchResult {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  next_page?: string;
}

export class PexelsService {
  private apiKey: string;
  private videoBaseUrl: string;
  private photoBaseUrl: string;

  constructor() {
    this.apiKey = PEXELS_API_KEY;
    this.videoBaseUrl = PEXELS_VIDEO_API_URL;
    this.photoBaseUrl = PEXELS_PHOTO_API_URL;
  }

  /**
   * Search for photos by query
   */
  async searchPhotos(
    query: string,
    options: {
      perPage?: number;
      orientation?: 'landscape' | 'portrait' | 'square';
    } = {}
  ): Promise<PexelsPhotoSearchResult> {
    const { perPage = 5, orientation = 'portrait' } = options;

    if (!this.apiKey) {
      logger.warn('[Pexels] API key not configured');
      return { total_results: 0, page: 1, per_page: 0, photos: [] };
    }

    try {
      const params = new URLSearchParams({
        query,
        per_page: perPage.toString(),
        orientation,
      });

      const response = await fetch(`${this.photoBaseUrl}/search?${params}`, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Pexels Photo API error: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Pexels Photos] Search complete', {
        query,
        results: data.photos.length,
      });

      return data;
    } catch (error) {
      logger.error('[Pexels Photos] Search failed', { error, query });
      return { total_results: 0, page: 1, per_page: 0, photos: [] };
    }
  }

  /**
   * Search for videos by query
   */
  async searchVideos(
    query: string,
    options: {
      perPage?: number;
      orientation?: 'landscape' | 'portrait' | 'square';
      size?: 'large' | 'medium' | 'small';
    } = {}
  ): Promise<PexelsSearchResult> {
    const { perPage = 5, orientation = 'landscape', size = 'medium' } = options;

    if (!this.apiKey) {
      logger.warn('[Pexels] API key not configured');
      return { total_results: 0, page: 1, per_page: 0, videos: [] };
    }

    try {
      const params = new URLSearchParams({
        query,
        per_page: perPage.toString(),
        orientation,
        size,
      });

      const response = await fetch(`${this.videoBaseUrl}/search?${params}`, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Pexels] Search complete', {
        query,
        results: data.videos.length,
      });

      return data;
    } catch (error) {
      logger.error('[Pexels] Search failed', { error, query });
      return { total_results: 0, page: 1, per_page: 0, videos: [] };
    }
  }

  /**
   * Get the best video file URL for a given video
   * Prioritizes HD quality and MP4 format
   */
  getBestVideoFile(
    video: PexelsVideo,
    preferredWidth: number = 1920
  ): string | null {
    if (!video.video_files || video.video_files.length === 0) {
      return null;
    }

    // Filter for MP4 files
    const mp4Files = video.video_files.filter(
      (file) => file.file_type === 'video/mp4'
    );

    if (mp4Files.length === 0) {
      return video.video_files[0].link;
    }

    // Find closest width to preferred
    const sorted = mp4Files.sort((a, b) => {
      const aDiff = Math.abs(a.width - preferredWidth);
      const bDiff = Math.abs(b.width - preferredWidth);
      return aDiff - bDiff;
    });

    return sorted[0].link;
  }

  /**
   * Extract keywords from scene text for search
   */
  extractKeywords(text: string): string {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'from', 'that', 'this',
      'it', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'what', 'how', 'why', 'when', 'where', 'who'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    // Take first 3 meaningful words
    return words.slice(0, 3).join(' ');
  }

  /**
   * Search for video based on scene text
   */
  async searchForScene(
    sceneText: string,
    format: 'vertical' | 'horizontal'
  ): Promise<string | null> {
    const keywords = this.extractKeywords(sceneText);
    
    if (!keywords) {
      logger.warn('[Pexels] No keywords extracted from scene text', { sceneText });
      return null;
    }

    const orientation = format === 'vertical' ? 'portrait' : 'landscape';
    const result = await this.searchVideos(keywords, {
      perPage: 3,
      orientation,
    });

    if (result.videos.length === 0) {
      logger.warn('[Pexels] No videos found', { keywords });
      return null;
    }

    // Get first video's best file
    const videoUrl = this.getBestVideoFile(result.videos[0]);
    
    logger.info('[Pexels] Selected video', {
      keywords,
      videoId: result.videos[0].id,
      duration: result.videos[0].duration,
      url: videoUrl,
    });

    return videoUrl;
  }

  /**
   * Get popular videos for generic scenes
   */
  async getPopularVideos(
    format: 'vertical' | 'horizontal',
    page: number = 1
  ): Promise<PexelsSearchResult> {
    if (!this.apiKey) {
      return { total_results: 0, page: 1, per_page: 0, videos: [] };
    }

    try {
      const orientation = format === 'vertical' ? 'portrait' : 'landscape';
      const params = new URLSearchParams({
        per_page: '10',
        page: page.toString(),
        orientation,
      });

      const response = await fetch(`${this.videoBaseUrl}/popular?${params}`, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('[Pexels] Popular videos fetch failed', { error });
      return { total_results: 0, page: 1, per_page: 0, videos: [] };
    }
  }
}
