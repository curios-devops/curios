import OpenAI from 'openai';
import { Agent, AgentResponse } from './types';
import { env } from '../../config/env';
import { rateLimitQueue } from '../rateLimit';

export abstract class BaseAgent implements Agent {
  name: string;
  instructions: string;
  functions?: Function[];
  protected openai: OpenAI | null = null;
  protected timeout: number = 30000;

  constructor(name: string, instructions: string, functions?: Function[]) {
    this.name = name;
    this.instructions = instructions;
    this.functions = functions;
    
    // Initialize OpenAI client with new configuration
    const { apiKey, orgId, projectId } = env.openai;
    if (apiKey?.trim()) {
      this.openai = new OpenAI({
        apiKey,
        organization: orgId,
        defaultHeaders: {
          'OpenAI-Organization': orgId,
          'X-Project-ID': projectId,
        },
        dangerouslyAllowBrowser: true,
      });
    } else {
      console.warn(`${name}: OpenAI API key not configured, using fallback responses`);
    }
  }

  protected async handleError(error: unknown): Promise<AgentResponse> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.warn(`${this.name} error:`, errorMessage);
    
    // Return success with fallback data instead of error
    return {
      success: true,
      data: this.getFallbackData()
    };
  }

  protected async safeOpenAICall<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    // Skip OpenAI call if no client
    if (!this.openai) {
      return fallback;
    }

    try {
      // Add request to rate limit queue
      return await rateLimitQueue.add(async () => {
        try {
          return await operation();
        } catch (error) {
          // Handle rate limit and quota errors silently
          if (
            error instanceof Error && (
              error.message.includes('429') || 
              error.message.includes('quota') ||
              error.message.includes('insufficient_quota') ||
              error.message.includes('model_not_found')
            )
          ) {
            console.warn(`${this.name}: OpenAI API error:`, error.message);
            return fallback;
          }
          throw error;
        }
      });
    } catch (error) {
      // Log error without throwing
      console.warn(`${this.name}: OpenAI call failed:`, error);
      return fallback;
    }
  }

  protected getFallbackData(): any {
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
      console.warn(`${this.name}: JSON parse error:`, error);
      return null;
    }
  }

  abstract execute(...args: any[]): Promise<AgentResponse>;
}