import { SearchResponse } from '../types';
import { SwarmController } from './agents/swarmController';
import { handleSupabaseOperation } from '../lib/supabase';

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
    if (!query.trim()) {
      throw new SearchError('Search query cannot be empty');
    }

    const { mode = 'focus', isPro = false, onStatusUpdate } = options;

    // Wrap the search operation in error handling
    return await handleSupabaseOperation(
      async () => {
        // Process query using swarm controller
        const { research, article, images } = await swarmController.processQuery(
          query, 
          onStatusUpdate,
          isPro
        );

        // Ensure images array is always defined
        const validatedImages = images?.filter(img => {
          try {
            new URL(img.url);
            return true;
          } catch {
            return false;
          }
        }) || [];

        // Map the research data to the expected response format
        const response: SearchResponse = {
          answer: article.content || 'No results found. Please try again.',
          sources: research.results.map(result => ({
            title: result.title,
            url: result.url,
            snippet: result.content,
          })),
          images: validatedImages,
          provider: isPro ? 'Pro Search' : 'Standard Search',
          perspectives: isPro ? research.perspectives?.map(perspective => ({
            id: perspective.id,
            title: perspective.title,
            description: perspective.description,
            sources: perspective.results?.map(result => ({
              title: result.title,
              url: result.url,
              snippet: result.content
            }))
          })) : undefined
        };

        return response;
      },
      // Fallback response if operation fails
      {
        answer: 'We apologize, but we could not process your search at this time. Please try again in a moment.',
        sources: [],
        images: [],
        provider: isPro ? 'Pro Search' : 'Standard Search'
      }
    );
  } catch (error) {
    console.error('Search error:', {
      error: error instanceof Error ? error.message : error,
      query,
      timestamp: new Date().toISOString()
    });

    throw new SearchError(
      'We\'re experiencing technical difficulties. Please try again in a moment.',
      error
    );
  }
}