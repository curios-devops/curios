import { SearchResponse } from '../../commonApp/types/index';
import { performRegularSearch, SearchError } from './regular/regularSearchService.ts';
import { performProSearch, ProSearchError } from './pro/proSearchService.ts';
import { logger } from '../../utils/logger.ts';

// Re-export error classes for backwards compatibility
export { SearchError };

interface SearchOptions {
  isPro?: boolean;
  onStatusUpdate?: (status: string) => void;
  imageUrls?: string[]; // Public URLs of images for reverse image search
}

/**
 * Unified Search Service - Routes to appropriate service based on isPro flag
 * 
 * This is the main entry point for search. It delegates to:
 * - performRegularSearch: For regular searches (isPro = false)
 * - performProSearch: For pro searches (isPro = true)
 * 
 * Keeping this layer ensures backwards compatibility with existing code
 * while maintaining clear separation between regular and pro search flows.
 */
export async function performSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  try {
    const { isPro = false, onStatusUpdate, imageUrls } = options;
    
    // Validate: need either query text OR images
    const hasQuery = query && query.trim().length > 0;
    const hasImages = imageUrls && imageUrls.length > 0;
    
    if (!hasQuery && !hasImages) {
      throw new SearchError('Search query or images required');
    }

    // Route to appropriate service based on isPro flag
    if (isPro) {
      logger.info('Routing to Pro Search service', { query, isPro });
      return await performProSearch(query, { onStatusUpdate, imageUrls });
    } else {
      logger.info('Routing to Regular Search service', { query, isPro });
      return await performRegularSearch(query, { onStatusUpdate, imageUrls });
    }
  } catch (error) {
    logger.error('Search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      isPro: options.isPro,
      timestamp: new Date().toISOString(),
    });

    // Return fallback response for any errors
    return {
      answer: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
      sources: [],
      images: [],
      videos: [],
      provider: options.isPro ? 'Pro Search' : 'Standard Search',
      perspectives: undefined,
    };
  }
}
