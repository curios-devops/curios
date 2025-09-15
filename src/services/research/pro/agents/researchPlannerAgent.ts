import { AgentResponse } from '../../../../commonApp/types/index';
import { secureOpenAI } from '../../../../commonService/openai/secureOpenAI';
import { logger } from '../../../../utils/logger';

export interface PlanningRequest {
  query: string;
  focusMode: string;
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
      const { query, focusMode } = request;
      
      logger.info('ResearchPlannerAgent: Starting planning', { query, focusMode });

      const systemPrompt = `You are a Research Planning Agent responsible for analyzing queries and creating comprehensive research strategies.

Your task is to:
1. Assess query complexity (simple, moderate, complex)
2. Generate 2-4 strategic search queries that will comprehensively cover the topic
3. Create a focused research strategy
4. Provide reasoning for your approach

Focus Mode Context: ${this.getFocusContext(focusMode)}

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
Focus Mode: ${focusMode}

Provide a detailed research plan following the JSON structure specified.`;

      const response = await secureOpenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from planning agent');
      }

      let planningResult: PlanningResult;
      try {
        planningResult = JSON.parse(content);
      } catch (_parseError) {
        logger.warn('Failed to parse planning response, using fallback', { content });
        planningResult = this.getFallbackPlan(query, focusMode);
      }

      // Validate and sanitize the result
      planningResult = this.validatePlanningResult(planningResult, query, focusMode);

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
        data: this.getFallbackPlan(request.query, request.focusMode)
      };
    }
  }

  private getFocusContext(focusMode: string): string {
    const contexts: Record<string, string> = {
      'health': 'Focus on medical research, health studies, clinical trials, and evidence-based health information',
      'academic': 'Prioritize peer-reviewed sources, academic papers, research institutions, and scholarly analysis',
      'finance': 'Emphasize financial data, market analysis, economic indicators, and investment research',
      'travel': 'Focus on current travel information, local insights, cultural aspects, and practical travel advice',
      'social': 'Look for social media trends, public opinion, community discussions, and social impact',
      'math': 'Emphasize mathematical concepts, proofs, applications, and technical accuracy',
      'video': 'Prioritize video content, visual explanations, and multimedia sources',
      'web': 'General web search covering all relevant online sources and current information'
    };
    
    return contexts[focusMode] || contexts['web'];
  }

  private validatePlanningResult(result: PlanningResult, query: string, focusMode: string): PlanningResult {
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
    result.research_strategy = result.research_strategy || `Comprehensive research on ${query} using ${focusMode} focus`;
    result.thinking_process = result.thinking_process || `Analyzing ${query} to determine research approach`;
    result.estimated_duration = result.estimated_duration || '3-5 minutes';

    return result;
  }

  private getFallbackPlan(query: string, focusMode: string): PlanningResult {
    return {
      complexity: 'moderate',
      search_queries: [
        query,
        `${query} latest research`,
        `${query} analysis ${focusMode}`
      ],
      research_strategy: `Comprehensive research approach for "${query}" using ${focusMode} focus mode. Will search for current information, research findings, and analytical perspectives.`,
      thinking_process: `Query "${query}" requires moderate research complexity. Using ${focusMode} focus to guide search strategy with 3 complementary queries.`,
      estimated_duration: '3-5 minutes'
    };
  }
}