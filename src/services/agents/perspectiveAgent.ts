import { BaseAgent } from './baseAgent';
import { AgentResponse, Perspective } from './types';

export class PerspectiveAgent extends BaseAgent {
  constructor() {
    super(
      'Perspective Generator',
      'Generate search-oriented questions and perspectives for a given topic'
    );
  }

  async execute(query: string): Promise<AgentResponse> {
    try {
      const perspectives = await this.generatePerspectives(query);
      
      return {
        success: true,
        data: { perspectives }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  private async generatePerspectives(query: string): Promise<Perspective[]> {
    return this.safeOpenAICall(
      async () => {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',  // Updated to use gpt-4o-mini
          messages: [
            {
              role: 'system',
              content: `Generate 2-3 search-oriented perspectives for the given topic.
                Return a JSON object with a 'perspectives' array containing objects with:
                - id: A unique identifier (e.g., "perspective-1")
                - title: A clear, concise title
                - description: A brief explanation`
            },
            {
              role: 'user',
              content: query
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          return this.getFallbackData();
        }

        const parsed = await this.safeJsonParse(content);
        if (!parsed?.perspectives || !Array.isArray(parsed.perspectives)) {
          return this.getFallbackData();
        }

        return parsed.perspectives;
      },
      this.getFallbackData()
    );
  }

  protected getFallbackData(): Perspective[] {
    return [
      {
        id: 'overview',
        title: 'General Overview',
        description: 'Key facts and basic information'
      },
      {
        id: 'latest',
        title: 'Latest Information',
        description: 'Recent updates and current status'
      }
    ];
  }
}