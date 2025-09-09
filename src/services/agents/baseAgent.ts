// baseAgent.ts
import { Agent, AgentResponse } from './types';
import { env } from '../../config/env';
import { rateLimitQueue } from '../rateLimit';
import { secureOpenAI } from '../secureOpenAI';
import { logger } from '../../utils/logger';

/**
 * BaseAgent provides the foundational logic for all agents.
 * It implements common functionality such as error handling,
 * safe OpenAI API calls with rate limiting, JSON parsing, and fallback data.
 */
export abstract class BaseAgent implements Agent {
  name: string;
  instructions: string;
  functions?: Array<(...args: unknown[]) => Promise<unknown>>;
  protected openai: typeof secureOpenAI | null = null;
  protected timeout: number = 30000;

  constructor(name: string, instructions: string, functions?: Array<(...args: unknown[]) => Promise<unknown>>) {
    this.name = name;
    this.instructions = instructions;
    this.functions = functions;
    
    // Initialize secure OpenAI client if API key is configured
    const { apiKey } = env.openai;
    if (apiKey?.trim()) {
      this.openai = secureOpenAI;
      logger.info(`${name}: Using secure OpenAI service`);
    } else {
      logger.warn(`${name}: OpenAI API key not configured, using fallback responses`);
    }
  }

  /**
   * Handles errors by logging and returning fallback data.
   * @param error The caught error.
   * @returns An AgentResponse with fallback data.
   */
  protected handleError(error: unknown): AgentResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.warn(`${this.name} error:`, errorMessage);
    
    return {
      success: true,
      data: this.getFallbackData()
    };
  }

  /**
   * Wraps an asynchronous OpenAI API call with rate limiting and fallback support.
   * @param operation A function returning a Promise of type T.
   * @param fallback A fallback value of type T in case of errors.
   * @returns The result of the operation or the fallback value.
   */
  protected async safeOpenAICall<T>(
    operation: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    // Skip OpenAI call if no client is configured.
    if (!this.openai) {
      return fallback;
    }

    try {
      return await rateLimitQueue.add(async () => {
        try {
          return await operation();
        } catch (error) {
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
      console.warn(`${this.name}: OpenAI call failed:`, error);
      return fallback;
    }
  }

  /**
   * Provides fallback data when API calls fail.
   * This data structure includes a placeholder for video results.
   * @returns An object with default fallback values.
   */
  protected getFallbackData(): Record<string, unknown> {
    return {
      perspectives: [],
      content: '',
      sources: [],
      videos: []  // Added fallback for video results.
    };
  }

  /**
   * Safely parses a JSON string.
   * @param content A JSON string or null.
   * @returns The parsed object or null if parsing fails.
   */
  protected safeJsonParse(content: string | null): Record<string, unknown> | null {
    if (!content) return null;
    
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch (error) {
      console.warn(`${this.name}: JSON parse error:`, error);
      return null;
    }
  }

  /**
   * Abstract method that must be implemented by subclasses.
   * Executes the agent's main functionality.
   * @param args Parameters for execution.
   * @returns A Promise resolving to an AgentResponse.
   */
  abstract execute(...args: unknown[]): Promise<AgentResponse>;
}
