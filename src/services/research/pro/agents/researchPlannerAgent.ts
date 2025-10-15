import { AgentResponse } from '../../../../commonApp/types/index';

import { logger } from '../../../../utils/logger';

export interface PlanningRequest {
  query: string;
}

export interface PlanningResult {
  complexity: 'simple' | 'moderate' | 'complex';
  search_queries: string[];
  research_strategy: string;
  thinking_process: string;
  estimated_duration: string;
}

export class ResearchPlannerAgent {
  async execute(request: PlanningRequest): Promise<AgentResponse<PlanningResult>> {
    try {
      const { query } = request;
      
      logger.info('ResearchPlannerAgent: Starting planning', { query });

      const systemPrompt = `You are a Research Planning Agent responsible for analyzing queries and creating comprehensive research strategies.

Your task is to:
1. Assess query complexity (simple, moderate, complex)
2. Generate 2-4 strategic search queries that will comprehensively cover the topic
3. Create a focused research strategy
4. Provide reasoning for your approach

Guidelines:
- Simple queries: 2 search queries, straightforward fact-finding
- Moderate queries: 3 search queries, comparison or analysis needed
- Complex queries: 4 search queries, multi-faceted research required
- Make search queries specific and complementary
- Consider current events, technical aspects, practical applications
- Ensure queries avoid redundancy

Response must be valid JSON with this structure:
{
  "complexity": "simple|moderate|complex",
  "search_queries": ["query1", "query2", "query3", "query4"],
  "research_strategy": "detailed strategy explanation",
  "thinking_process": "step by step reasoning",
  "estimated_duration": "time estimate"
}`;

      const userPrompt = `Analyze this research query and create a comprehensive research plan:

Query: "${query}"

Provide a detailed research plan following the JSON structure specified.`;


      // Supabase Edge Function OpenAI completion
      const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
        ? import.meta.env.VITE_OPENAI_API_URL
        : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;
      if (!supabaseAnonKey) throw new Error('Supabase anon key not found in environment variables');
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];
      const fetchResponse = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ prompt: JSON.stringify({ messages }) })
      });
      if (!fetchResponse.ok) throw new Error('OpenAI completion failed');
      const data = await fetchResponse.json();
      const content = data.text || data.content || data.output_text;
      if (!content) throw new Error('No response content from planning agent');

      let planningResult: PlanningResult;
      try {
        planningResult = JSON.parse(content);
      } catch (_parseError) {
        logger.warn('Failed to parse planning response, using fallback', { content });
        planningResult = this.getFallbackPlan(query);
      }

      // Validate and sanitize the result
      planningResult = this.validatePlanningResult(planningResult, query);

      logger.info('ResearchPlannerAgent: Planning completed', {
        complexity: planningResult.complexity,
        queryCount: planningResult.search_queries.length
      });

      return {
        success: true,
        data: planningResult
      };

    } catch (error) {
      logger.error('ResearchPlannerAgent: Planning failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query
      });

      // Return fallback plan
      return {
        success: true,
        data: this.getFallbackPlan(request.query)
      };
    }
  }

  private validatePlanningResult(result: PlanningResult, query: string): PlanningResult {
    // Ensure search_queries is valid and not empty
    if (!result.search_queries || !Array.isArray(result.search_queries) || result.search_queries.length === 0) {
      result.search_queries = [query, `${query} latest research`, `${query} analysis`];
    }

    // Limit to 4 queries maximum
    if (result.search_queries.length > 4) {
      result.search_queries = result.search_queries.slice(0, 4);
    }

    // Ensure complexity is valid
    if (!['simple', 'moderate', 'complex'].includes(result.complexity)) {
      result.complexity = result.search_queries.length <= 2 ? 'simple' : 
                         result.search_queries.length <= 3 ? 'moderate' : 'complex';
    }

    // Ensure required fields are present
    result.research_strategy = result.research_strategy || `Comprehensive research on ${query}`;
    result.thinking_process = result.thinking_process || `Analyzing ${query} to determine research approach`;
    result.estimated_duration = result.estimated_duration || '3-5 minutes';

    return result;
  }

  private getFallbackPlan(query: string): PlanningResult {
    return {
      complexity: 'moderate',
      search_queries: [
        query,
        `${query} latest research`,
        `${query} analysis`
      ],
      research_strategy: `Comprehensive research approach for "${query}". Will search for current information, research findings, and analytical perspectives.`,
      thinking_process: `Query "${query}" requires moderate research complexity. Using comprehensive search strategy with 3 complementary queries.`,
      estimated_duration: '3-5 minutes'
    };
  }
}