import { searchWeb } from './braveWeb';
import { searchImages } from './braveImages';
import { SearchResult, ImageResult } from '../types';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

// Helper function for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function searchWithBrave(
  query: string
): Promise<{ results: SearchResult[]; images: ImageResult[] }> {
  // Validate API key first
  if (!env.brave.apiKey?.trim()) {
    logger.error('Brave API key is missing');
    return { results: [], images: [] };
  }

  try {
    // Execute searches sequentially to avoid rate limits
    const webResults = await searchWeb(query);
    await sleep(2000); // Wait 2 seconds between requests
    const imageResults = await searchImages(query);

    logger.info('Combined search completed', {
      query,
      webResults: webResults.length,
      imageResults: imageResults.length
    });

    return {
      results: webResults,
      images: imageResults
    };
  } catch (error) {
    logger.error('Combined search failed', {
      query,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      results: [],
      images: []
    };
  }
}

export { searchWeb, searchImages };