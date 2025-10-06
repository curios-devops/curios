// baseAgent.ts
import { Agent, AgentResponse } from '../../commonApp/types';
import { logger } from '../../utils/logger';

/**
 * BaseAgent provides minimal foundation for agents following Swarm architecture.
 * 
 * Swarm Principles:
 * - Lightweight: Minimal abstractions, no complex logic
 * - Stateless: No rate limiting, no queues, no caching
 * - Simple: Clear error handling, straightforward execution
 * 
 * NOTE: OpenAI API calls are made through Supabase Edge Functions to keep API keys secure.
 */
export abstract class BaseAgent implements Agent {
  name: string;
  instructions: string;
  functions?: Array<(...args: unknown[]) => Promise<unknown>>;

  constructor(name: string, instructions: string, functions?: Array<(...args: unknown[]) => Promise<unknown>>) {
    this.name = name;
    this.instructions = instructions;
    this.functions = functions;
  }

  /**
   * Simple error handler. Logs the error and returns fallback data.
   * @param error The caught error.
   * @param context Optional context string for logging.
   * @returns An AgentResponse with fallback data.
   */
  protected handleError(error: unknown, context?: string): AgentResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const logContext = context ? `${this.name} (${context})` : this.name;
    
    logger.error(`${logContext}: ${errorMessage}`);
    
    return {
      success: true,
      data: this.getFallbackData()
    };
  }

  

  /**
   * Provides fallback data when operations fail.
   * Override in subclasses for agent-specific defaults.
   * @returns An object with default fallback values.
   */
  protected getFallbackData(): Record<string, unknown> {
    return {
      perspectives: [],
      content: '',
      sources: [],
      videos: []
    };
  }

  /**
   * Abstract method that must be implemented by subclasses.
   * Executes the agent's main functionality.
   * @param args Parameters for execution.
   * @returns A Promise resolving to an AgentResponse.
   */
  abstract execute(...args: unknown[]): Promise<AgentResponse>;
}
