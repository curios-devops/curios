/**
 * Brave Image Search Service
 * Fetches images from Brave Search API for video overlays via Supabase Edge Function
 */

import { logger } from '../../../utils/logger';
import { rateLimitQueue } from '../../../commonService/utils/rateLimit';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface BraveImage {
  url: string;           // Image URL
  title: string;         // Image title/description
  source: string;        // Source website
  thumbnail: string;     // Thumbnail URL
  width: number;         // Image width
  height: number;        // Image height
  age?: string;          // How old the image is
}

export interface BraveImageSearchResponse {
  query: {
    original: string;
    show_strict_warning: boolean;
  };
  results: Array<{
    type: string;
    title: string;
    url: string;
    description: string;
    page_age?: string;
    page_fetched?: string;
    thumbnail: {
      src: string;
      height: number;
      width: number;
    };
    properties: {
      url: string;
      resized: string;
      height: number;
      width: number;
      format: string;
    };
  }>;
}

export interface ImageSearchOptions {
  count?: number;        // Number of results (default: 10)
  safesearch?: 'off' | 'moderate' | 'strict'; // Default: strict
  country?: string;      // Country code (default: us)
  language?: string;     // Language code (default: en)
}

export class BraveImageService {
  private enabled: boolean;

  constructor() {
    // Service is enabled if we have Supabase configured (Edge Function handles API key)
    this.enabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
    
    if (!this.enabled) {
      logger.warn('[Brave Image Service] Supabase not configured - images disabled');
    }
  }

  /**
   * Check if service is enabled (has Supabase configured)
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Search for images using Brave Search API
   * Excludes premium stock sites that ALWAYS fail CORS (Freepik, etc.)
   * Uses same parsing format as regular search (which works perfectly)
   */
  async searchImages(
    query: string,
    options: ImageSearchOptions = {}
  ): Promise<BraveImage[]> {
    if (!this.enabled) {
      logger.warn('[Brave Image Service] Service not enabled, returning empty results');
      return [];
    }

    const {
      count = 10,
      safesearch = 'strict',
    } = options;

    // Exclude ONLY premium stock sites that consistently fail CORS
    // These sites waste API calls and never work
    const excludedSites = [
      'freepik.com',        // Premium stock, ALWAYS fails CORS
      'istockphoto.com',    // Getty Images, ALWAYS fails CORS
      'gettyimages.com',    // Getty Images, ALWAYS fails CORS
      'shutterstock.com',   // Premium stock, ALWAYS fails CORS
    ];
    
    // Add exclusions to query using Brave's -site: operator
    const exclusions = excludedSites.map(site => `-site:${site}`).join(' ');
    const enhancedQuery = `${query} ${exclusions}`;

    logger.info('[Brave Image Service] Searching images (excluding premium stock)', {
      query,
      excludedSites: excludedSites.length,
      count,
      safesearch
    });

    try {
      // Call Supabase Edge Function - same format as regular search
      const response = await rateLimitQueue.add(async () => {
        logger.info('[Brave Image Service] Executing API call (rate limited)');
        return fetch(`${SUPABASE_URL}/functions/v1/brave-images-search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: enhancedQuery })
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[Brave Image Service] API error', {
          status: response.status,
          error: errorText
        });
        return [];
      }

      const data: BraveImageSearchResponse = await response.json();

      // Transform results - EXACT same format as regular search (which works)
      const images: BraveImage[] = (data.results || [])
        .slice(0, count)
        .map((item: any) => ({
          url: item.properties?.url || item.thumbnail?.src || '', // SAME fallback as regular search
          title: item.title || '',
          source: item.url || '', // Source page URL
          thumbnail: item.thumbnail?.src || '',
          width: item.properties?.width || 0,
          height: item.properties?.height || 0,
          age: item.page_age
        }))
        .filter((img: BraveImage) => img.url !== ''); // Filter out empty URLs

      logger.info('[Brave Image Service] Search complete', {
        query,
        resultCount: images.length
      });

      return images;

    } catch (error) {
      logger.error('[Brave Image Service] Search failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Search for images for a specific scene
   * Uses engineered query for better results
   */
  async searchForScene(
    sceneText: string,
    mood: string,
    options?: ImageSearchOptions
  ): Promise<BraveImage[]> {
    // Engineer query based on scene content
    const query = this.engineerQuery(sceneText, mood);
    
    logger.info('[Brave Image Service] Searching for scene', {
      originalText: sceneText.substring(0, 50),
      mood,
      engineeredQuery: query
    });

    return this.searchImages(query, options);
  }

  /**
   * Engineer search query for better image results
   * Uses Mood + Action + Metaphor strategy
   */
  private engineerQuery(sceneText: string, mood: string): string {
    // Extract key concepts from scene text
    const concepts = this.extractConcepts(sceneText);
    
    // Build query: metaphor + action + mood + quality modifier
    const parts = [
      concepts.metaphor,
      concepts.action,
      mood,
      'editorial photography'
    ].filter(Boolean);

    return parts.join(' ');
  }

  /**
   * Extract concepts from scene text
   */
  private extractConcepts(text: string): {
    metaphor: string;
    action: string;
  } {
    const lowercaseText = text.toLowerCase();
    
    // Common metaphor mappings
    const metaphorPatterns = {
      'work': 'office workplace',
      'office': 'workplace desk',
      'remote': 'home office laptop',
      'team': 'group collaboration',
      'meeting': 'discussion conference',
      'technology': 'digital innovation',
      'future': 'innovation breakthrough',
      'growth': 'progress upward',
      'decline': 'downward falling',
      'change': 'transformation shift',
      'problem': 'challenge obstacle',
      'solution': 'breakthrough answer',
      'stress': 'pressure overwhelm',
      'success': 'achievement victory',
      'data': 'analytics metrics',
      'people': 'human person',
      'world': 'global planet',
      'time': 'clock schedule',
      'money': 'finance currency',
      'innovation': 'breakthrough discovery'
    };

    // Action word mappings
    const actionPatterns = {
      'working': 'working focused',
      'leaving': 'departing exiting',
      'joining': 'entering arriving',
      'discussing': 'talking communicating',
      'thinking': 'contemplating pondering',
      'creating': 'building making',
      'analyzing': 'examining studying',
      'collaborating': 'cooperating teamwork',
      'growing': 'expanding increasing',
      'declining': 'decreasing falling',
      'changing': 'transforming evolving',
      'waiting': 'anticipating expecting',
      'celebrating': 'cheering happy',
      'struggling': 'difficult challenging'
    };

    let metaphor = '';
    let action = '';

    // Find metaphor
    for (const [keyword, replacement] of Object.entries(metaphorPatterns)) {
      if (lowercaseText.includes(keyword)) {
        metaphor = replacement;
        break;
      }
    }

    // Find action
    for (const [keyword, replacement] of Object.entries(actionPatterns)) {
      if (lowercaseText.includes(keyword)) {
        action = replacement;
        break;
      }
    }

    // Fallback to extracting nouns and verbs if patterns don't match
    if (!metaphor) {
      const words = text.split(' ').filter(w => w.length > 4);
      metaphor = words.slice(0, 2).join(' ');
    }

    if (!action) {
      action = 'professional high quality';
    }

    return { metaphor, action };
  }

  /**
   * Select best images from results based on quality criteria
   */
  selectBestImages(images: BraveImage[], count: number = 3): BraveImage[] {
    if (images.length === 0) return [];
    if (images.length <= count) return images;

    // Score images based on quality criteria
    const scored = images.map(image => ({
      image,
      score: this.scoreImage(image)
    }));

    // Sort by score (highest first) and take top N
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, count).map(s => s.image);
  }

  /**
   * Score image quality
   */
  private scoreImage(image: BraveImage): number {
    let score = 0;

    // Prefer larger images (better quality)
    const minDimension = Math.min(image.width, image.height);
    if (minDimension >= 1080) score += 30;
    else if (minDimension >= 720) score += 20;
    else if (minDimension >= 480) score += 10;

    // Prefer landscape or square for horizontal overlays
    const aspectRatio = image.width / image.height;
    if (aspectRatio >= 1.2 && aspectRatio <= 2.0) score += 20; // Landscape
    else if (aspectRatio >= 0.8 && aspectRatio <= 1.2) score += 15; // Square

    // Prefer newer images (if age available)
    if (image.age) {
      if (image.age.includes('day') || image.age.includes('week')) score += 10;
      else if (image.age.includes('month')) score += 5;
    }

    return score;
  }

  /**
   * Get recommended image effect for a scene style
   */
  getRecommendedImageEffect(
    style: 'hook' | 'explain' | 'takeaway' | 'outro'
  ): 'zoom' | 'blur' | 'ken-burns' | 'fade' {
    const effects: Record<string, 'zoom' | 'blur' | 'ken-burns' | 'fade'> = {
      hook: 'ken-burns',    // Dramatic, cinematic
      explain: 'fade',      // Smooth, professional
      takeaway: 'zoom',     // Emphasize key point
      outro: 'fade'         // Clean exit
    };

    return effects[style];
  }
}
