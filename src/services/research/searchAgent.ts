import { AgentResponse, SearchResult, WebSearchItem, SearchOptions } from './types';
import { performSearch } from '../searchService';
import { logger } from '../../utils/logger';
import { env } from '../../config/env';
import OpenAI from 'openai';

export class SearchAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.openai.apiKey,
      organization: env.openai.orgId,
      dangerouslyAllowBrowser: true
    });
  }

  async search(searches: WebSearchItem[], useWebSearchTool = false): Promise<AgentResponse<SearchResult[]>> {
    try {
      const results: SearchResult[] = [];

      if (useWebSearchTool) {
        // Use OpenAI's WebSearchTool for deep research
        for (const search of searches) {
          try {
            const completion = await this.openai.chat.completions.create({
              model: "gpt-4-turbo-preview",
              messages: [
                {
                  role: "system",
                  content: "You are a research assistant. Search the web and provide detailed, accurate information."
                },
                {
                  role: "user",
                  content: search.query
                }
              ],
              tools: [{
                type: "retrieval",
                id: "search"
              }],
              tool_choice: "auto"
            });

            const searchResult = completion.choices[0]?.message?.content;
            if (searchResult) {
              results.push({
                title: search.query,
                url: "OpenAI Web Search",
                content: searchResult
              });
            }
          } catch (error) {
            logger.warn(`WebSearchTool failed for query "${search.query}":`, error);
          }
        }
      } else {
        // Use existing search implementation for regular searches
        const searchPromises = searches.map(async (search) => {
          try {
            const response = await performSearch(search.query);
            return response.sources.map(source => ({
              title: source.title,
              url: source.url,
              content: source.snippet
            }));
          } catch (error) {
            logger.warn(`Search failed for query "${search.query}":`, error);
            return [];
          }
        });

        const searchResults = await Promise.all(searchPromises);
        
        // Flatten and deduplicate results
        const seen = new Set<string>();
        for (const resultSet of searchResults) {
          for (const result of resultSet) {
            if (!seen.has(result.url)) {
              seen.add(result.url);
              results.push(result);
            }
          }
        }
      }

      return { success: true, data: results };
    } catch (error) {
      logger.error('Search agent failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }
}