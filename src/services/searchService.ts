import { SearchResponse } from '../types';
import { SwarmController } from './agents/swarmController';
import { handleSupabaseOperation } from '../lib/supabase';
import { logger } from '../utils/logger';

export class SearchError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'SearchError';
  }
}

interface SearchOptions {
  mode?: string;
  isPro?: boolean;
  onStatusUpdate?: (status: string) => void;
}

const swarmController = new SwarmController();

export async function performSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  try {
    // Validate the query immediately.
    if (!query.trim()) {
      throw new SearchError('Search query cannot be empty');
    }

    const { isPro = false, onStatusUpdate } = options;

    // Wrap the search operation with Supabase error handling.
    return await handleSupabaseOperation(
      async () => {
        // Process the query using the swarm controller.
        const { research, article, images, videos } = await swarmController.processQuery(
          query,
          onStatusUpdate,
          isPro
        );
        
        logger.debug('Search service received data from swarm controller', {
          hasResearch: !!research,
          hasVideos: !!videos,
          videoCount: videos?.length,
          isPro
        });

        // Ensure images array is always defined and valid.
        const validatedImages = images?.filter((img) => {
          try {
            new URL(img.url);
            return true;
          } catch {
            return false;
          }
        }) || [];

        // Extract images from sources when available
        const sourcesWithImages = research.results?.map((result) => {
          return {
            title: result.title,
            url: result.url,
            snippet: result.content,
          };
        }) || [];

        // Map the research data to the expected response format.
        const response: SearchResponse = {
          answer: article.content || 'No results found. Please try again.',
          sources: sourcesWithImages,
          images: validatedImages,
          videos: videos || [],
          provider: isPro ? 'Pro Search' : 'Standard Search',
          perspectives: isPro
            ? research.perspectives?.map((perspective) => ({
                id: perspective.id,
                title: perspective.title,
                description: perspective.description,
                sources: perspective.results?.map((result) => ({
                  title: result.title,
                  url: result.url,
                  snippet: result.content,
                })) || [],
              })).filter(p => p.id && p.title) || []
            : undefined,
        };
        
        logger.debug('Search service response', {
          videoCount: response.videos.length,
          provider: response.provider
        });

        return response;
      },
      // Fallback response if the operation fails.
      {
        answer:
          'We apologize, but we could not process your search at this time. Please try again in a moment.',
        sources: [],
        images: [],
        videos: [],
        provider: isPro ? 'Pro Search' : 'Standard Search',
      }
    );
  } catch (error) {
    logger.error('Search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      timestamp: new Date().toISOString(),
    });

    throw new SearchError(
      "We're experiencing technical difficulties. Please try again in a moment.",
      error
    );
  }
}
