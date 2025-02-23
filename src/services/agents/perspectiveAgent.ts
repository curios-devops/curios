import { BaseAgent } from './baseAgent';
import { AgentResponse, Perspective } from './types';
import { logger } from '../../utils/logger';

/**
 * PerspectiveAgent generates search-oriented perspectives for a given topic.
 * It uses the OpenAI API to generate 2-3 perspectives, each containing an id, title, and description.
 */
export class PerspectiveAgent extends BaseAgent {
  constructor() {
    super(
      'Perspective Generator',
      'Generate search-oriented questions and perspectives for a given topic'
    );
  }

  /**
   * Executes the perspective generation process.
   * @param query - The input topic query.
   * @returns An AgentResponse containing the generated perspectives.
   */
  async execute(query: string): Promise<AgentResponse> {
    try {
      // Wait 1 second before generating perspectives to help respect rate limits.
      await this.delay(1000);
      const perspectives = await this.generatePerspectives(query);
      return {
        success: true,
        data: { perspectives }
      };
    } catch (error) {
      logger.error('PerspectiveAgent execution error:', error);
      return this.handleError(error);
    }
  }

  /**
   * Generates perspectives using the OpenAI API, with a fallback if necessary.
   * @param query - The input topic query.
   * @returns A Promise that resolves to an array of Perspective objects.
   */
  private async generatePerspectives(query: string): Promise<Perspective[]> {
    return this.safeOpenAICall<Perspective[]>(
      async () => {
        // (Optional) Additional delay can be inserted here if needed.
        const completion = await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Generate 2-3 search-oriented perspectives for the given topic.
Return a JSON object with a "perspectives" array. Each perspective should be an object with:
- id: A unique identifier (e.g., "perspective-1")
- title: A concise title
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
          logger.warn('No content received from OpenAI in PerspectiveAgent.');
          return this.getFallbackData();
        }

        const parsed = await this.safeJsonParse(content);
        if (!parsed?.perspectives || !Array.isArray(parsed.perspectives)) {
          logger.warn('Invalid JSON structure received in PerspectiveAgent.');
          return this.getFallbackData();
        }
        return parsed.perspectives;
      },
      this.getFallbackData()
    );
  }

  /**
   * Provides fallback perspectives when generation fails.
   * @returns An array of default Perspective objects.
   */
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

  /**
   * Returns a promise that resolves after a specified delay.
   *
   * @param ms - The delay in milliseconds.
   * @returns A Promise that resolves after the delay.
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
