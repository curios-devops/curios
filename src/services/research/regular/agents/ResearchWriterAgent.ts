import { AgentResponse, ResearchData, SearchResult } from '../../types';
import { logger } from '../../../../utils/logger';
// TODO: Refactor to use Supabase Edge Function for OpenAI chat completions
export class ResearchWriterAgent {
  constructor() {
    logger.info('ResearchWriterAgent: Refactor to use Supabase Edge Function for OpenAI API calls');
  }

  async execute(query: string, results: SearchResult[]): Promise<AgentResponse<ResearchData>> {
    try {
      const context = results
        .map(result => `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}`)
        .join('\n\n');
      return await this.safeOpenAICall(
        async () => {
          const supabaseEdgeUrl = 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai';
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const response = await fetch(supabaseEdgeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({
              prompt: JSON.stringify({
                messages: [
                  {
                    role: 'system',
                    content: `You are a research writer synthesizing information from multiple sources.\nCreate a comprehensive report in markdown format with:\n- An outline of main topics\n- Detailed content with citations\n- Follow-up questions for further research\nOutput as JSON with outline, content, and followUpQuestions fields.`
                  },
                  {
                    role: 'user',
                    content: `Query: ${query}\n\nSources:\n${context}`
                  }
                ],
                response_format: { type: "json_object" }
              })
            })
          });
          const data = await response.json();
          const content = data.text || data.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error('No content generated');
          }
          const parsed = this.safeJsonParse(content);
          // Ensure all required ResearchData fields are present
          // Use type guards to safely access properties
          const getString = (obj: any, key: string, fallback: string) => typeof obj[key] === 'string' ? obj[key] : fallback;
          const getArray = (obj: any, key: string, fallback: any[]) => Array.isArray(obj[key]) ? obj[key] : fallback;
          return {
            success: true,
            data: {
              query,
              headline: getString(parsed, 'headline', 'Research Report'),
              markdown_report: getString(parsed, 'markdown_report', getString(parsed, 'content', '')),
              sources: results,
              images: getArray(parsed, 'images', []),
              outline: getArray(parsed, 'outline', ['Introduction', 'Main Points', 'Conclusion']),
              followUpQuestions: getArray(parsed, 'followUpQuestions', []),
            }
          };
        },
        {
          success: true,
          data: {
            ...this.getFallbackData(),
            images: (this.getFallbackData().images ?? []) as any[],
            outline: (this.getFallbackData().outline ?? []) as any[],
            followUpQuestions: (this.getFallbackData().followUpQuestions ?? []) as any[]
          }
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
      query: 'N/A',
      headline: 'Research Report',
      markdown_report: '## Research Report\n\nThis is a fallback research report. The AI service is currently unavailable.\n\n### Introduction\n\n### Main Points\n\n### Conclusion',
      sources: [],
      images: [], // always an array, never undefined
      outline: ['Introduction', 'Main Points', 'Conclusion'],
      followUpQuestions: [
        'What are the latest developments on this topic?',
        'How does this compare to similar topics?',
        'What are the key challenges in this area?'
      ]
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
