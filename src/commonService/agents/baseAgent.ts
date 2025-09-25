// baseAgent.ts
import { Agent, AgentResponse } from '../../commonApp/types';
import { rateLimitQueue } from '../utils/rateLimit';
import { logger } from '../../utils/logger';

/**
 * BaseAgent provides the foundational logic for all agents.
 * It implements common functionality such as error handling,
 * safe OpenAI API calls with rate limiting, JSON parsing, and fallback data.
 * 
 * NOTE: OpenAI API calls are made through Netlify functions to keep API keys secure.
 */
export abstract class BaseAgent implements Agent {
  name: string;
  instructions: string;
  functions?: Array<(...args: unknown[]) => Promise<unknown>>;
  protected timeout: number = 30000;

  constructor(name: string, instructions: string, functions?: Array<(...args: unknown[]) => Promise<unknown>>) {
    this.name = name;
    this.instructions = instructions;
    this.functions = functions;
    
    // All OpenAI API calls are made through secure Netlify functions
    logger.info(`${name}: Using secure Netlify function for OpenAI API calls`);
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
   * Makes a secure OpenAI API call through Netlify functions with rate limiting and fallback support.
   * @param input The input message for the OpenAI API
   * @param options Additional options for the API call
   * @param fallback A fallback value in case of errors
   * @returns The result of the operation or the fallback value
   */
  protected async safeOpenAICall<T>(
    input: string,
    options: {
      model?: string;
      temperature?: number;
      max_completion_tokens?: number;
      response_format?: { type: string };
      reasoning_effort?: string;
    } = {},
    fallback: T
  ): Promise<T> {
    try {
      return await rateLimitQueue.add(async () => {
        // Use Supabase Edge Function endpoint
        const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
          ? import.meta.env.VITE_OPENAI_API_URL
          : 'VITE_OPENAI_API_URL';
        // Get Supabase anon key from environment
        const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;
        if (!supabaseAnonKey) {
          logger.error(`${this.name}: Supabase anon key not found in environment variables`);
          return fallback;
        }
        logger.info(`${this.name}: Sending request to Supabase Edge Function`, { url: supabaseEdgeUrl });
        try {
          const response = await fetch(supabaseEdgeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`
            },
            body: JSON.stringify({ prompt: input })
          });
          logger.info(`${this.name}: OpenAI API response received`, { status: response.status, ok: response.ok });
          if (!response.ok) {
            if (response.status === 429) {
              logger.warn(`${this.name}: Rate limit exceeded, using fallback`);
              return fallback;
            }
            const errorText = await response.text();
            logger.error(`${this.name}: OpenAI API call failed`, { status: response.status, errorText });
            throw new Error(`OpenAI API call failed: ${response.status}`);
          }
          const data = await response.json();
          // The Supabase Edge Function returns { text }
          const content = data.text;
          if (content && typeof content === 'string') {
            if (options.response_format?.type === 'json_object') {
              try {
                return JSON.parse(content);
              } catch (_parseError) {
                logger.warn(`${this.name}: Failed to parse JSON response, using fallback`);
                return fallback;
              }
            }
            return content;
          }
          logger.warn(`${this.name}: No content in response, using fallback`);
          return fallback;
        } catch (error) {
          if (
            error instanceof Error && (
              error.message.includes('429') || 
              error.message.includes('quota') ||
              error.message.includes('insufficient_quota') ||
              error.message.includes('model_not_found')
            )
          ) {
            logger.warn(`${this.name}: OpenAI API error:`, error.message);
            return fallback;
          }
          throw error;
        }
      });
    } catch (error) {
      logger.warn(`${this.name}: OpenAI call failed:`, error);
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
