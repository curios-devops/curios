import { BaseAgent } from './baseAgent';
import { AgentResponse, Perspective } from './types';

export class PerspectiveAgent extends BaseAgent {
  constructor() {
    super(
      'Perspective Generator',
      'Generate key perspectives for a given topic'
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
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Generate 1-3 key perspectives for researching the given topic. 
            Return a valid JSON array of objects with 'id', 'title', and 'description' properties.
            Example format:
            [
              {
                "id": "historical",
                "title": "Historical Context",
                "description": "Understanding the historical background"
              }
            ]`
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
      throw new Error('No perspectives generated');
    }

    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed.perspectives) ? parsed.perspectives : [];
    } catch (error) {
      console.error('Failed to parse perspectives:', content);
      return [];
    }
  }
}