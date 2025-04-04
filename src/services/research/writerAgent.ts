import { BaseAgent } from '../agents/baseAgent';
import { AgentResponse, ResearchData, SearchResult } from '../agents/types';
import { logger } from '../../utils/logger';

export class WriterAgent extends BaseAgent {
  constructor() {
    super(
      'Research Writer',
      'Synthesize information from multiple sources into a comprehensive report'
    );
  }

  async execute(query: string, results: SearchResult[]): Promise<AgentResponse<ResearchData>> {
    try {
      if (!this.openai) {
        return {
          success: true,
          data: this.getFallbackData()
        };
      }

      const context = results
        .map(result => `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}`)
        .join('\n\n');

      return await this.safeOpenAICall(
        async () => {
          const completion = await this.openai!.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a research writer synthesizing information from multiple sources.
            Create a comprehensive report in markdown format with:
            - An outline of main topics
            - Detailed content with citations
            - Follow-up questions for further research
            Output as JSON with outline, content, and followUpQuestions fields.`
              },
              {
                role: 'user',
                content: `Query: ${query}\n\nSources:\n${context}`
              }
            ],
            response_format: { type: "json_object" }
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error('No content generated');
          }

          const data = await this.safeJsonParse(content);
          return {
            success: true,
            data: {
              ...data,
              sources: results,
              images: [] // Images will be handled separately
            }
          };
        },
        {
          success: true,
          data: this.getFallbackData()
        }
      );
    } catch (error) {
      logger.error('Content synthesis failed:', error);
      return this.handleError(error);
    }
  }

  /**
   * Provides research-specific fallback data when synthesis fails.
   * @returns A ResearchData object with default values.
   */
  protected getFallbackData(): ResearchData {
    return {
      outline: ['Overview', 'Key Points', 'Conclusion'],
      content: 'We apologize, but we could not synthesize the research results at this time. Please try again in a moment.',
      followUpQuestions: [
        'What are the main aspects of this topic?',
        'What are the recent developments?',
        'What are the key challenges?'
      ],
      sources: [],
      images: []
    };
  }
}