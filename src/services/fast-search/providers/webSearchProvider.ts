// Web Search Provider - Handles web search through OpenAI or Tavily

import { searchWithTavily as tavilySearch } from '../../../commonService/searchTools/tavilyService';
import { logger } from '../../../utils/logger';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

/**
 * Execute web search using OpenAI web search tool
 * Falls back to Tavily if OpenAI tool is unavailable
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

  try {
    // Priority 1: Try OpenAI web search tool (GPT-5 models support web_search tool)
    logger.debug('WebSearchProvider: Attempting OpenAI web search', { query });
    const openAIResults = await searchWithOpenAI(query);

    if (openAIResults.length > 0) {
      logger.info('WebSearchProvider: OpenAI search successful', {
        resultCount: openAIResults.length
      });
      return openAIResults;
    }

    logger.warn('WebSearchProvider: OpenAI returned no results, falling back to Tavily');
  } catch (error) {
    logger.warn('WebSearchProvider: OpenAI search failed, falling back to Tavily', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Priority 2: Fallback to Tavily
  try {
    logger.debug('WebSearchProvider: Attempting Tavily search', { query });
    const tavilyResults = await searchWithTavilyFallback(query);

    logger.info('WebSearchProvider: Tavily search completed', {
      resultCount: tavilyResults.length
    });
    return tavilyResults;
  } catch (error) {
    logger.error('WebSearchProvider: All search methods failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Execute web search using OpenAI Responses API with web_search tool
 * Uses GPT-5 mini with web_search tool for fast, accurate results
 *
 * NOTE: This returns empty array to skip OpenAI web search.
 * The actual web search + answer generation happens together in llmProvider
 * using Responses API with web_search tool in a single call.
 */
async function searchWithOpenAI(query: string): Promise<WebSearchResult[]> {
  logger.debug('WebSearchProvider: Skipping separate web search (handled by Responses API)');
  // Return empty to trigger Tavily fallback for image/source carousels
  // The actual answer generation will use web_search tool in Responses API
  return [];
}

/**
 * Parse OpenAI API response to extract web search results
 * The search preview model returns results in the content
 */
function parseOpenAISearchResults(data: any): WebSearchResult[] {
  try {
    // Extract content from response (edge function returns it as .text)
    const content = data.text || data.choices?.[0]?.message?.content;

    if (!content || typeof content !== 'string') {
      logger.warn('WebSearchProvider: No content in OpenAI response');
      return [];
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);

      // Handle if results are nested under a key
      const resultsArray = Array.isArray(parsed) ? parsed :
                          Array.isArray(parsed.results) ? parsed.results :
                          Array.isArray(parsed.search_results) ? parsed.search_results : null;

      if (!resultsArray) {
        logger.warn('WebSearchProvider: Parsed JSON but no array found', { parsed });
        return [];
      }

      const results = resultsArray
        .filter(item => item && item.title && item.url)
        .map(item => ({
          title: String(item.title),
          url: String(item.url),
          snippet: String(item.snippet || item.description || item.content || ''),
          content: item.content
        }));

      return results;
    } catch (parseError) {
      logger.warn('WebSearchProvider: Failed to parse OpenAI JSON response', {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        contentPreview: content.substring(0, 200)
      });
      return [];
    }
  } catch (error) {
    logger.error('WebSearchProvider: Failed to parse OpenAI search results', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
}

/**
 * Execute web search using Tavily as fallback
 */
async function searchWithTavilyFallback(query: string): Promise<WebSearchResult[]> {
  const { results } = await tavilySearch(query);

  return results.map(result => ({
    title: result.title,
    url: result.url,
    snippet: result.content,
    content: result.content
  }));
}
