import { SearchResponse } from '../../../commonApp/types/index';
import { SwarmController } from './agents/swarmController.ts';
import { logger } from '../../../utils/logger.ts';

export class ProSearchError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ProSearchError';
  }
}

interface ProSearchOptions {
  onStatusUpdate?: (status: string) => void;
  imageUrls?: string[]; // Public URLs of images for reverse image search
}

// Initialize controller for pro search
const swarmController = new SwarmController();

/**
 * Pro Search Service - Advanced flow with Swarm Controller and Perspectives
 * User Query → UI Agent → Orchestrator Agent / Swarm Controller → 
 *   → Perspective Generator → Retriever Agent → Writer Agent → Final Answer
 * 
 * This service uses:
 * - SwarmController (orchestrates all agents)
 * - PerspectiveAgent (generates multiple perspectives)
 * - Advanced search with perspectives
 */
export async function performProSearch(
  query: string,
  options: ProSearchOptions = {}
): Promise<SearchResponse> {
  try {
    const { onStatusUpdate, imageUrls } = options;
    
    // Validate: need either query text OR images
    const hasQuery = query && query.trim().length > 0;
    const hasImages = imageUrls && imageUrls.length > 0;
    
    if (!hasQuery && !hasImages) {
      throw new ProSearchError('Search query or images required');
    }
    
    // For image-only searches, pass empty string (writer will detect and handle)
    const effectiveQuery = hasQuery ? query : '';

    // PRO SEARCH: Use SwarmController (includes PerspectiveAgent)
    logger.info('Using Pro Search flow with SwarmController', { query: effectiveQuery, hasImages });
    
    const { research, article, images, videos } = await swarmController.processQuery(
      effectiveQuery,
      onStatusUpdate,
      true // isPro = true
    );
        
    logger.debug('Pro search service received data from swarm controller', {
      hasResearch: !!research,
      hasVideos: !!videos,
      videoCount: videos?.length,
      perspectivesCount: research.perspectives?.length || 0
    });

    // Ensure images array is always defined and valid
    const validatedImages = images?.filter((img: { url: string; title?: string; alt?: string }) => {
      try {
        const u = new URL(img.url);
        return u.protocol === 'https:';
      } catch {
        return false;
      }
    }) || [];

    // Extract images from sources when available
    const sourcesWithImages = research.results?.map((result: { title: string; url: string; content: string }) => {
      return {
        title: result.title,
        url: result.url,
        snippet: result.content,
      };
    }) || [];

    // Map the research data to the expected response format
    const response: SearchResponse = {
      answer: article.content || 'No results found. Please try again.',
      sources: sourcesWithImages,
      images: validatedImages,
      videos: videos || [],
      provider: 'Pro Search',
      perspectives: research.perspectives?.map((perspective: { id: string; title: string; description: string; results?: { title: string; url: string; content: string }[] }) => ({
        id: perspective.id,
        title: perspective.title,
        description: perspective.description,
        sources: perspective.results?.map((result: { title: string; url: string; content: string }) => ({
          title: result.title,
          url: result.url,
          snippet: result.content,
        })) || [],
      })).filter((p: { id: string; title: string }) => p.id && p.title) || [],
      citations: article.citations || [],
    };
    
    logger.debug('Pro search service response', {
      imageCount: response.images.length,
      videoCount: response.videos.length,
      perspectivesCount: response.perspectives?.length || 0,
      provider: response.provider
    });

    return response;
        
  } catch (error) {
    logger.error('Pro search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      timestamp: new Date().toISOString(),
    });

    // Return fallback response for any errors
    return {
      answer: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
      sources: [],
      images: [],
      videos: [],
      provider: 'Pro Search',
      perspectives: undefined,
    };
  }
}






