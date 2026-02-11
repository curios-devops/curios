/**
 * Pexels Video Service
 * Searches for stock videos using Pexels API via Supabase Edge Function
 * API key is securely stored in Supabase, not exposed to client
 */

import { logger } from '../../../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PEXELS_EDGE_FUNCTION = `${SUPABASE_URL}/functions/v1/pexels-search`;

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
  private edgeFunction: string;

  constructor() {
    this.edgeFunction = PEXELS_EDGE_FUNCTION;
  }

  /**
   * Search for photos by query using Supabase Edge Function
   */
  async searchPhotos(
    query: string,
    options: {
      perPage?: number;
      orientation?: 'landscape' | 'portrait' | 'square';
    } = {}
  ): Promise<PexelsPhotoSearchResult> {
    const { perPage = 5, orientation = 'portrait' } = options;

    try {
      logger.info('[Pexels Photos] Searching via Edge Function', { query, perPage, orientation });

      const response = await fetch(this.edgeFunction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          type: 'photos',
          perPage,
          orientation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Pexels Photo API error: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Pexels Photos] Search complete', {
        query,
        results: data.photos?.length || 0,
      });

      return data;
    } catch (error) {
      logger.error('[Pexels Photos] Search failed', { error, query });
      return { total_results: 0, page: 1, per_page: 0, photos: [] };
    }
  }

  /**
   * Search for videos by query using Supabase Edge Function
   */
  async searchVideos(
    query: string,
    options: {
      perPage?: number;
      orientation?: 'landscape' | 'portrait' | 'square';
      size?: 'large' | 'medium' | 'small';
    } = {}
  ): Promise<PexelsSearchResult> {
    const { perPage = 5, orientation = 'landscape' } = options;

    try {
      logger.info('[Pexels] Searching via Edge Function', { query, perPage, orientation });

      const response = await fetch(this.edgeFunction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          type: 'videos',
          perPage,
          orientation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[Pexels] Search complete', {
        query,
        results: data.videos?.length || 0,
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
   * Get popular videos for generic scenes (NOT IMPLEMENTED via Edge Function)
   * Returns empty result. Use searchVideos with generic queries instead.
   */
  async getPopularVideos(
    _format: 'vertical' | 'horizontal',
    _page: number = 1
  ): Promise<PexelsSearchResult> {
    logger.warn('[Pexels] getPopularVideos not implemented. Use searchVideos with generic query instead.');
    return { total_results: 0, page: 1, per_page: 0, videos: [] };
  }
}
