import { BaseAgent } from '../../../../common/agents/baseAgent';
import { AgentResponse } from '../../../../commonApp/types';
import { WebSearchPlan } from '../../types';
import { logger } from '../../../../utils/logger';

export class PlannerAgent extends BaseAgent {
  constructor() {
    super(
      'Research Planner',
      'Create structured research plans from user queries'
    );
  }

  async execute(query: string): Promise<AgentResponse<WebSearchPlan>> {
    try {
      const systemMessage = `You are a research planner. Given a query, create a structured plan of web searches to perform.
Output a JSON object with an array of 'searches', each containing:
- reason: Why this search is important
- query: The actual search term to use`;

      const input = `${systemMessage}\n\nUser Query: ${query}`;

      const result = await super.safeOpenAICall(
        input,
        {
          model: 'gpt-4.1-mini-2025-04-14',
          temperature: 0.3,
          max_completion_tokens: 1200,
          response_format: { type: 'json_object' },
          reasoning_effort: 'medium'
        },
        { success: true, data: this.getFallbackData() }
      );

      if (typeof result === 'object' && result.success && result.data) {
        return result as AgentResponse<WebSearchPlan>;
      }

      // If result is a string, try to parse it
      if (typeof result === 'string') {
        try {
          const plan = JSON.parse(result);
          return { success: true, data: plan };
        } catch (parseError) {
          logger.error('Failed to parse planning result:', parseError);
          return { success: true, data: this.getFallbackData() };
        }
      }

      return { success: true, data: this.getFallbackData() };
    } catch (error) {
      logger.error('Planning failed:', error);
      return super.handleError(error);
    }
  }

  protected getFallbackData(): WebSearchPlan {
    return {
      searches: [
        {
          reason: 'General information about the query',
          query: 'general information about the topic'
        }
      ]
    };
  }
}