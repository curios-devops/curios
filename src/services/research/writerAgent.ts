import { AgentResponse } from '../agents/types';
import { ResearchData, SearchResult } from './types';
import { logger } from '../../utils/logger';
import { secureOpenAI } from '../secureOpenAI';
import { env } from '../../config/env';

export class ResearchWriterAgent {
  private openai: typeof secureOpenAI | null = null;

  constructor() {
    // Initialize secure OpenAI client if API key is configured
    const { apiKey } = env.openai;
    if (apiKey?.trim()) {
      this.openai = secureOpenAI;
      logger.info('ResearchWriterAgent: Using secure OpenAI service');
    } else {
      logger.warn('ResearchWriterAgent: OpenAI API key not configured, using fallback responses');
    }
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

          const data = this.safeJsonParse(content);
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

  // Alias method for compatibility with ResearchManager
  synthesize(query: string, results: SearchResult[], _isPro: boolean = false): Promise<AgentResponse<ResearchData>> {
    return this.execute(query, results);
  }

  /**
   * Safe OpenAI API call with timeout and error handling
   */
  private async safeOpenAICall<T>(
    operation: () => Promise<T>,
    fallback: T,
    timeoutMs: number = 45000
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      logger.warn('OpenAI call failed, using fallback:', error);
      return fallback;
    }
  }

  /**
   * Safe JSON parsing with error handling
   */
  private safeJsonParse(content: string | null | undefined): Record<string, unknown> {
    if (!content?.trim()) {
      throw new Error('Empty content provided');
    }

    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      logger.warn('JSON parse failed:', error);
      // Return a basic structure if JSON parsing fails
      return {
        outline: ['Overview', 'Analysis', 'Conclusion'],
        content: content.trim(),
        followUpQuestions: [
          'What are the key takeaways?',
          'What additional research is needed?',
          'How does this impact the field?'
        ]
      };
    }
  }

  /**
   * Handle errors and return appropriate responses
   */
  private handleError(error: unknown): AgentResponse<ResearchData> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('ResearchWriterAgent error:', errorMessage);

    return {
      success: true, // Return success with fallback data to maintain flow
      data: this.getFallbackData(),
      error: `Research synthesis encountered an issue: ${errorMessage}`
    };
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