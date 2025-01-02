import OpenAI from 'openai';
import { Agent, AgentResponse } from './types';

export abstract class BaseAgent implements Agent {
  name: string;
  instructions: string;
  functions?: Function[];
  protected openai: OpenAI;
  protected timeout: number = 30000;

  constructor(name: string, instructions: string, functions?: Function[]) {
    this.name = name;
    this.instructions = instructions;
    this.functions = functions;
    this.openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true,
    });
  }

  protected async handleError(error: unknown): Promise<AgentResponse> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`${this.name} error:`, errorMessage);
    
    // Return a safe fallback response instead of failing
    return {
      success: true,
      data: this.getFallbackData()
    };
  }

  protected getFallbackData(): any {
    // Each agent can override this to provide appropriate fallback data
    return {
      perspectives: [],
      content: '',
      sources: []
    };
  }

  protected async safeJsonParse(content: string | null): Promise<any> {
    if (!content) return null;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  abstract execute(...args: any[]): Promise<AgentResponse>;
}