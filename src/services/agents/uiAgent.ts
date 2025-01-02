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
      const formattedData = await this.formatOutput(data);
      
      return {
        success: true,
        data: formattedData
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  protected getFallbackData(): any {
    return {
      research: {
        results: [],
        perspectives: []
      },
      article: {
        content: 'We apologize, but we could not process your request at this time. Please try again.',
        followUpQuestions: [],
        citations: []
      }
    };
  }

  private async formatOutput(data: any): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Format the provided data for user presentation. 
            Return a valid JSON object with 'research' and 'article' properties.
            Example format:
            {
              "research": {
                "results": [],
                "perspectives": []
              },
              "article": {
                "content": "",
                "followUpQuestions": [],
                "citations": []
              }
            }`
        },
        {
          role: 'user',
          content: JSON.stringify(data)
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0]?.message?.content;
    const parsed = await this.safeJsonParse(content);
    
    return parsed || this.getFallbackData();
  }
}