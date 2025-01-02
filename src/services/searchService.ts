import { SearchResponse } from '../types';
import { SwarmController } from './agents/swarmController';

export class SearchError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'SearchError';
  }
}

const swarmController = new SwarmController();

export async function performSearch(
  query: string,
  onStatusUpdate?: (status: string) => void
): Promise<SearchResponse> {
  try {
    if (!query.trim()) {
      throw new SearchError('Search query cannot be empty');
    }

    // Process query using swarm controller
    const { research, article, images } = await swarmController.processQuery(query, onStatusUpdate);

    const response: SearchResponse = {
      answer: article.content,
      sources: research.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
      })),
      images: images || [],
      provider: 'Multi-source'
    };

    return response;
  } catch (error) {
    if (error instanceof SearchError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('Search error details:', {
      query,
      error: error instanceof Error ? error.stack : error
    });
    
    throw new SearchError(errorMessage, error);
  }
}