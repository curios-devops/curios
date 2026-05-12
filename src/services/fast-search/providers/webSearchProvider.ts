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
 * Execute web search using OpenAI's built-in web search tool
 * Uses GPT-5 models with web_search tool call
 */
async function searchWithOpenAI(query: string): Promise<WebSearchResult[]> {
  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a web search assistant. Use the web_search tool to find relevant information. Return results as a JSON array with title, url, and snippet fields.'
            },
            {
              role: 'user',
              content: `Search the web for: ${query}`
            }
          ],
          model: 'gpt-5-mini',
          tools: [{
            type: 'web_search',
            max_results: 10
          }],
          temperature: 0.3,
          max_output_tokens: 2000
        })
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();

    // Parse the response to extract search results
    // OpenAI returns tool calls with search results
    const results = parseOpenAISearchResults(data);
    return results.slice(0, 10);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Parse OpenAI API response to extract web search results
 */
function parseOpenAISearchResults(data: any): WebSearchResult[] {
  try {
    // Check if we have tool calls with web search results
    if (data.choices?.[0]?.message?.tool_calls) {
      const toolCalls = data.choices[0].message.tool_calls;
      const searchResults: WebSearchResult[] = [];

      for (const toolCall of toolCalls) {
        if (toolCall.type === 'web_search' && toolCall.results) {
          for (const result of toolCall.results) {
            if (result.title && result.url) {
              searchResults.push({
                title: result.title,
                url: result.url,
                snippet: result.snippet || result.content || '',
                content: result.content
              });
            }
          }
        }
      }

      if (searchResults.length > 0) {
        return searchResults;
      }
    }

    // Fallback: try to parse from content if structured as JSON
    const content = data.choices?.[0]?.message?.content;
    if (content && typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(item => item.title && item.url)
            .map(item => ({
              title: item.title,
              url: item.url,
              snippet: item.snippet || item.content || '',
              content: item.content
            }));
        }
      } catch {
        // Not JSON, ignore
      }
    }

    return [];
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
