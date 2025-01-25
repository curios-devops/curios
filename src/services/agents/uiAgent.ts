import { BaseAgent } from './baseAgent';
import { AgentResponse } from './types';

export class UIAgent extends BaseAgent {
  constructor() {
    super(
      'UI Agent',
      'Handle user interaction and presentation of results'
    );
  }

  async execute(data: any): Promise<AgentResponse> {
    try {
      // Pass through the article content directly without OpenAI formatting
      const formattedData = {
        research: {
          results: data?.research?.results || [],
          perspectives: data?.research?.perspectives || []
        },
        article: data?.article || {
          content: 'We are experiencing high traffic. Please try again in a moment.',
          followUpQuestions: [],
          citations: []
        }
      };
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error) {
      return {
        success: true,
        data: this.getFallbackData(data)
      };
    }
  }

  protected getFallbackData(data?: any): any {
    return {
      research: {
        results: data?.research?.results || [],
        perspectives: data?.research?.perspectives || []
      },
      article: {
        content: data?.article?.content || 'We are experiencing high traffic. Please try again in a moment.',
        followUpQuestions: data?.article?.followUpQuestions || [],
        citations: data?.article?.citations || []
      }
    };
  }
}