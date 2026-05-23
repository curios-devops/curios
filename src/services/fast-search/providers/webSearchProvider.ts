// Web Search Provider - Handles web search through Tavily (primary) with Brave fallback

import { searchWithTavily as tavilySearch } from '../../../commonService/searchTools/tavilyService';
import { logger } from '../../../utils/logger';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

/**
 * Execute web search using Tavily (primary) with Brave fallback
 *
 * @param query - The search query
 * @returns Array of web search results (up to 10)
 */
export async function executeWebSearch(
  query: string
): Promise<WebSearchResult[]> {
  if (!query?.trim()) {
    logger.warn('WebSearchProvider: Empty query provided');
    return [];
  }

  // Use Tavily as primary search engine
  try {
    logger.debug('WebSearchProvider: Executing Tavily search', { query });
    const tavilyResults = await searchWithTavily(query);

    logger.info('WebSearchProvider: Tavily search completed', {
      resultCount: tavilyResults.length
    });
    return tavilyResults;
  } catch (error) {
    logger.error('WebSearchProvider: Tavily search failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // TODO: Add Brave fallback here if needed
    return [];
  }
}

/**
 * Execute web search using Tavily
 */
async function searchWithTavily(query: string): Promise<WebSearchResult[]> {
  const { results } = await tavilySearch(query);

  return results.map(result => ({
    title: result.title,
    url: result.url,
    snippet: result.content,
    content: result.content
  }));
}
