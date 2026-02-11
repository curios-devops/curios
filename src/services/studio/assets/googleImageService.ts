/**
 * Google Images Search Service
 * Searches images using Google Images Light API via SerpAPI (Supabase Edge Function)
 * Used as fallback when Brave Image Search fails
 */

import { logger } from '../../../utils/logger';
import { rateLimitQueue } from '../../../commonService/utils/rateLimit';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface GoogleImage {
  url: string;           // Full resolution image URL
  title: string;         // Image title/description
  source: string;        // Source website URL
  thumbnail: string;     // Thumbnail URL
  width: number;         // Image width
  height: number;        // Image height
  position: number;      // Position in results
}

export interface GoogleImageSearchOptions {
  count?: number;        // Number of results (default: 10)
  hl?: string;          // Language code (default: 'en')
  gl?: string;          // Country code (default: 'us')
}

export class GoogleImageService {
  private enabled: boolean;

  constructor() {
    // Service is enabled if we have Supabase configured
    this.enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
    
    if (!this.enabled) {
      logger.warn('[Google Image Service] Supabase not configured - images disabled');
    }
  }

  /**
   * Check if service is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Search for images using Google Images Light API
   */
  async searchImages(
    query: string,
    options: GoogleImageSearchOptions = {}
  ): Promise<GoogleImage[]> {
    if (!this.enabled) {
      logger.warn('[Google Image Service] Service not enabled, returning empty results');
      return [];
    }

    const {
      count = 10,
      hl = 'en',
      gl = 'us'
    } = options;

    logger.info('[Google Image Service] Searching images', {
      query,
      count,
      hl,
      gl
    });

    try {
      // Call Supabase Edge Function through rate limit queue
      const response = await rateLimitQueue.add(async () => {
        logger.info('[Google Image Service] Executing API call (rate limited)');
        return fetch(`${SUPABASE_URL}/functions/v1/google-images-search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, count, hl, gl })
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Google Image Service] API error', {
          status: response.status,
          error: errorText
        });
        return [];
      }

      const data = await response.json();

      if (!data.success || !data.images) {
        logger.warn('[Google Image Service] API returned no images', { data });
        return [];
      }

      const images: GoogleImage[] = data.images;

      logger.info('[Google Image Service] Search complete', {
        query,
        resultCount: images.length
      });

      return images;

    } catch (error) {
      logger.error('[Google Image Service] Search failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Search for images for a specific scene
   * Compatible with BraveImageService interface
   */
  async searchForScene(
    sceneText: string,
    mood: string,
    options?: GoogleImageSearchOptions
  ): Promise<GoogleImage[]> {
    // Build optimized query for Google Images
    // We don't add mood descriptors since Google tends to be more literal
    const query = sceneText.slice(0, 100); // Limit query length

    logger.info('[Google Image Service] Searching for scene', {
      sceneText: sceneText.slice(0, 50),
      mood,
      query
    });

    return this.searchImages(query, options);
  }

  /**
   * Select best images based on resolution and aspect ratio
   * Compatible with BraveImageService interface
   */
  selectBestImages(images: GoogleImage[], count: number = 3): GoogleImage[] {
    if (images.length === 0) return [];
    if (images.length <= count) return images;

    // Score images based on:
    // 1. Resolution (prefer higher res)
    // 2. Aspect ratio (prefer portrait/square for vertical videos)
    // 3. Position (prefer earlier results)
    
    const scored = images.map(img => ({
      image: img,
      score: this.scoreImage(img)
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Return top N images
    return scored.slice(0, count).map(s => s.image);
  }

  /**
   * Score an image for quality and suitability
   */
  private scoreImage(image: GoogleImage): number {
    let score = 0;

    // 1. Resolution score (up to 40 points)
    const pixels = image.width * image.height;
    const minPixels = 400 * 400;
    const targetPixels = 1920 * 1080;
    
    if (pixels >= targetPixels) {
      score += 40;
    } else if (pixels >= minPixels) {
      score += 40 * ((pixels - minPixels) / (targetPixels - minPixels));
    }

    // 2. Aspect ratio score (up to 30 points)
    // Prefer portrait (9:16) or square (1:1) for vertical videos
    const aspectRatio = image.width / image.height;
    
    if (aspectRatio >= 0.5 && aspectRatio <= 0.6) {
      // Portrait (9:16 = 0.56)
      score += 30;
    } else if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
      // Square (1:1)
      score += 25;
    } else if (aspectRatio >= 0.6 && aspectRatio <= 0.9) {
      // Semi-portrait
      score += 20;
    } else {
      // Landscape or ultra-wide (less ideal)
      score += 10;
    }

    // 3. Position score (up to 30 points)
    // Earlier results are often more relevant
    const positionScore = Math.max(0, 30 - (image.position * 2));
    score += positionScore;

    return score;
  }
}
