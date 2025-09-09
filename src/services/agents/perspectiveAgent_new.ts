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
      return await this.handleError(error);
    }
  }

  /**
   * Generates perspectives using the OpenAI API, with a fallback if necessary.
   * @param query - The input topic query.
   * @returns A Promise that resolves to an array of Perspective objects.
   */
  private async generatePerspectives(query: string): Promise<Perspective[]> {
    const fallbackData = this.getFallbackData();
    return await this.safeOpenAICall<Perspective[]>(
      async () => {
        // Use the modern OpenAI Responses API
        const response = await this.openai!.responses.create({
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
          max_output_tokens: 1000,
          response_format: { type: "json_object" }
        });

        // Handle modern API response format
        const content = response?.output_text || response?.content?.[0]?.text;
        if (!content) {
          logger.warn('No content received from OpenAI in PerspectiveAgent.');
          return fallbackData.perspectives;
        }

        const parsed = await this.safeJsonParse(content);
        if (!parsed?.perspectives || !Array.isArray(parsed.perspectives)) {
          logger.warn('Invalid JSON structure received in PerspectiveAgent.');
          return fallbackData.perspectives;
        }
        return parsed.perspectives;
      },
      fallbackData.perspectives
    );
  }

  /**
   * Provides fallback perspectives when generation fails.
   * @returns An object with default fallback values including perspectives.
   */
  protected getFallbackData(): { perspectives: Perspective[] } {
    return {
      perspectives: [
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
      ]
    };
  }

  /**
   * Returns a promise that resolves after a specified delay.
   *
   * @param ms - The delay in milliseconds.
   * @returns A Promise that resolves after the delay.
   */
  private async delay(ms: number): Promise<void> {
    return await new Promise(resolve => setTimeout(resolve, ms));
  }
}
