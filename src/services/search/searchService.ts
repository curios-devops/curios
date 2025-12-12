import { SearchResponse } from '../../commonApp/types/index';
import { performRegularSearch, performRegularSearchWithStreaming, SearchError } from './regular/regularSearchService.ts';
import { performProSearch } from './pro/proSearchService.ts';
import { logger } from '../../utils/logger.ts';
import type { StreamingCallback } from './regular/agents/searchWriterAgent.ts';

// Re-export error classes and types for backwards compatibility
export { SearchError };
export type { StreamingCallback };

interface SearchOptions {
  isPro?: boolean;
  onStatusUpdate?: (status: string) => void;
  imageUrls?: string[]; // Public URLs of images for reverse image search
}

interface StreamingSearchOptions extends SearchOptions {
  onContentChunk?: StreamingCallback; // Callback for streaming content chunks
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

/**
 * Unified Search Service with Streaming Support
 * 
 * Same as performSearch but streams the article content progressively.
 * Currently only supported for regular (non-Pro) searches.
 * 
 * @param query - Search query
 * @param options - Search options including streaming callback
 * @returns SearchResponse with answer streamed progressively
 */
export async function performSearchWithStreaming(
  query: string,
  options: StreamingSearchOptions = {}
): Promise<SearchResponse> {
  try {
    const { isPro = false, onStatusUpdate, imageUrls, onContentChunk } = options;
    
    // Validate: need either query text OR images
    const hasQuery = query && query.trim().length > 0;
    const hasImages = imageUrls && imageUrls.length > 0;
    
    if (!hasQuery && !hasImages) {
      throw new SearchError('Search query or images required');
    }

    // Route to appropriate service based on isPro flag
    if (isPro) {
      // Pro search doesn't support streaming yet - use regular pro search
      logger.info('Routing to Pro Search service (non-streaming)', { query, isPro });
      return await performProSearch(query, { onStatusUpdate, imageUrls });
    } else {
      // Use streaming for regular search
      logger.info('Routing to Regular Search service (streaming)', { query, isPro });
      return await performRegularSearchWithStreaming(query, { onStatusUpdate, imageUrls, onContentChunk });
    }
  } catch (error) {
    logger.error('Streaming search error:', {
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