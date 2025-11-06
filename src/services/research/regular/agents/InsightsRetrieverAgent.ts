// InsightsRetrieverAgent - Free Tier Insights
// Simple single search: Tavily (fallback to Brave)
// Takes combined query, returns 10 results

import { AgentResponse, SearchResult } from '../../../../commonApp/types/index';
import { braveSearchTool } from '../../../../commonService/searchTools/braveSearchTool';
import { searchWithTavily } from '../../../../commonService/searchTools/tavilyService';
import { logger } from '../../../../utils/logger';

export class InsightsRetrieverAgent {
  constructor() {
    logger.info('InsightsRetrieverAgent initialized (Free-tier: Tavily with Brave fallback)');
  }

  async execute(queries: string[]): Promise<AgentResponse<SearchResult[]>> {
    try {
      // Join all queries into a single search
      const combinedQuery = queries.join(' ').trim();
      
      if (!combinedQuery) {
        return {
          success: false,
          error: 'Search query cannot be empty'
        };
      }

      logger.info('InsightsRetrieverAgent executing single search', { 
        queriesCount: queries.length,
        combinedQuery 
      });

      let searchResults: SearchResult[] = [];

      // Try Tavily first (main engine for free tier)
      try {
        logger.info('🔍 Calling Tavily with combined query...');
        const tavilyResponse = await searchWithTavily(combinedQuery);
        searchResults = tavilyResponse.results || [];
        
        if (searchResults.length > 0) {
          logger.info('✅ Tavily search successful', { 
            resultsCount: searchResults.length 
          });
        } else {
          throw new Error('Tavily returned no results');
        }
      } catch (tavilyError) {
        // Fallback to Brave
        logger.warn('⚠️ Tavily failed, falling back to Brave', {
          error: tavilyError instanceof Error ? tavilyError.message : 'Unknown error'
        });
        
        try {
          const braveResponse = await braveSearchTool(combinedQuery);
          searchResults = braveResponse.web || [];
          
          logger.info('✅ Brave fallback successful', { 
            resultsCount: searchResults.length 
          });
        } catch (braveError) {
          logger.error('❌ Both Tavily and Brave failed', {
            tavilyError: tavilyError instanceof Error ? tavilyError.message : 'Unknown',
            braveError: braveError instanceof Error ? braveError.message : 'Unknown'
          });
          throw new Error('All search engines failed');
        }
      }

      // Take top 10 results
      const top10Results = searchResults
        .filter(r => r.url && r.url !== '#' && r.title && r.content)
        .slice(0, 10);

      logger.info('InsightsRetrieverAgent completed', {
        finalResultsCount: top10Results.length,
        targetCount: 10
      });

      return {
        success: true,
        data: top10Results
      };
      
    } catch (error) {
      logger.error('InsightsRetrieverAgent failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }
}
