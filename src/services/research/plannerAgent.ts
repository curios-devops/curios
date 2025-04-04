import { BaseAgent } from '../agents/baseAgent';
import { AgentResponse, WebSearchPlan } from '../agents/types';
import { logger } from '../../utils/logger';

export class PlannerAgent extends BaseAgent {
  constructor() {
    super(
      'Research Planner',
      'Create structured research plans from user queries'
    );
  }

  async execute(query: string): Promise<AgentResponse<WebSearchPlan>> {
    try {
      if (!this.openai) {
        return {
          success: true,
          data: this.getFallbackData()
        };
      }

      return await this.safeOpenAICall(
        async () => {
          const completion = await this.openai!.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a research planner. Given a query, create a structured plan of web searches to perform.
            Output a JSON object with an array of 'searches', each containing:
            - reason: Why this search is important
            - query: The actual search term to use`
              },
              {
                role: 'user',
                content: query
              }
            ],
            response_format: { type: "json_object" }
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No plan generated');
          }

          const plan = await this.safeJsonParse(content);
          return { success: true, data: plan };
        },
        {
          success: true,
          data: this.getFallbackData()
        }
      );
    } catch (error) {
      logger.error('Planning failed:', error);
      return this.handleError(error);
    }
  }
}