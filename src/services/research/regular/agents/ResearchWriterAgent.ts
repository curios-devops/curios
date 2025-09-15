import { AgentResponse } from '../../types';
import { ResearchData, SearchResult } from '../../types';
import { logger } from '../../../../utils/logger';
import { secureOpenAI } from '../../../../commonService/openai/secureOpenAI';

export class ResearchWriterAgent {
  private openai: typeof secureOpenAI | null = null;

  constructor() {
    // All OpenAI API calls are made through secure Netlify functions
    this.openai = secureOpenAI;
    logger.info('ResearchWriterAgent: Using secure Netlify function for OpenAI API calls');
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
      logger.warn('OpenAI API call failed, using fallback:', error);
      return fallback;
    }
  }

  /**
   * Parse JSON safely with fallback
   */
  private safeJsonParse(jsonString: string): { [key: string]: unknown } | { content: string } {
    try {
      return JSON.parse(jsonString);
    } catch (_error) {
      logger.warn('Failed to parse JSON, returning raw content');
      return { content: jsonString };
    }
  }

  /**
   * Generate fallback response when OpenAI is not available
   */
  private getFallbackData(): ResearchData {
    return {
      outline: ['Introduction', 'Main Points', 'Conclusion'],
      content: '## Research Report\n\nThis is a fallback research report. The AI service is currently unavailable.\n\n### Introduction\n\n### Main Points\n\n### Conclusion',
      followUpQuestions: [
        'What are the latest developments on this topic?',
        'How does this compare to similar topics?',
        'What are the key challenges in this area?'
      ],
      sources: [],
      images: []
    };
  }

  /**
   * Handle errors and return appropriate response
   */
  private handleError(error: unknown): AgentResponse<ResearchData> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      data: this.getFallbackData()
    };
  }
}
