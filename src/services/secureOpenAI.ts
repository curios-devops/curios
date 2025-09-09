// Secure OpenAI service that uses Netlify functions instead of direct API calls
// ARCHITECTURE NOTE: This service provides chat completion interface for agent orchestration
// For direct search integration, use simpleOpenAI.ts which handles swarm architecture
import { logger } from '../utils/logger';

interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
  tools?: unknown[];
  tool_choice?: unknown;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string | null;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ResponsesRequest {
  model: string;
  input?: string | unknown[];
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_output_tokens?: number;
  response_format?: { type: 'json_object' } | { type: 'text' };
  tools?: unknown[];
  tool_choice?: unknown;
}

interface ResponsesResponse {
  id?: string;
  output_text?: string;
  content?: Array<{ type: string; text?: string; annotations?: unknown[] }>;
  // minimal fields we use
}

class SecureOpenAIService {
  // Both services now use the same optimized endpoint
  private getResponsesEndpoint() {
    // Use the Vite proxy in development, direct endpoint in production
    return '/api/fetch-openai';
  }

  private getDefaultModel(model?: string) {
    return model || 'gpt-4o-mini';
  }

  private mapMessagesToResponsesInput(messages: ChatCompletionRequest['messages']) {
    // Basic mapping: concatenate messages into a single string input
    // Prefer system + user; include assistant where useful
    const parts = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    return parts;
  }

  async createResponse(request: ResponsesRequest): Promise<ResponsesResponse> {
    const model = this.getDefaultModel(request.model);
    try {
      const payload: Record<string, unknown> = {
        model,
        temperature: request.temperature,
        response_format: request.response_format || { type: 'text' },
        max_completion_tokens: request.max_output_tokens || 1500,
        reasoning_effort: 'medium'
      };

      if (request.input !== undefined) {
        payload.input = request.input;
      } else if (request.messages) {
        // Send messages directly instead of mapping to string
        payload.input = request.messages;
      }

      const endpoint = this.getResponsesEndpoint();
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI Responses error: ${res.status} - ${text}`);
      }
      const data: ResponsesResponse = await res.json();
      return data;
    } catch (err) {
      // Bubble up to fallback caller
      throw err;
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    try {
      logger.info('Making secure OpenAI chat completion request', {
        model: request.model,
        messageCount: request.messages.length
      });

      // Use Responses API as primary method
      const resp = await this.createResponse({
        model: this.getDefaultModel(request.model),
        messages: request.messages,
        temperature: request.temperature,
        response_format: request.response_format,
        tools: request.tools,
        tool_choice: request.tool_choice,
      });
      
      // Adapt Responses output to ChatCompletionResponse shape
      const text = resp.output_text || resp.content?.[0]?.text || '';
      const mapped: ChatCompletionResponse = {
        choices: [
          {
            message: { content: text, role: 'assistant' },
            finish_reason: 'stop',
          },
        ],
        usage: undefined,
      };
      
      logger.info('OpenAI Responses API successful', {
        model: request.model,
        responseLength: text.length
      });
      
      return mapped;
    } catch (error) {
      logger.error('Secure OpenAI service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: request.model
      });
      throw error;
    }
  }

  // Helper method that mimics the OpenAI SDK interface
  get chat() {
    return {
      completions: {
        create: (request: ChatCompletionRequest) => this.createChatCompletion({
          ...request,
          model: this.getDefaultModel(request.model),
        })
      }
    };
  }

  // Expose responses-like interface
  get responses() {
    return {
      create: (request: ResponsesRequest) => this.createResponse({
        ...request,
        model: this.getDefaultModel(request.model),
      })
    };
  }
}

// Export a singleton instance
export const secureOpenAI = new SecureOpenAIService();

// Export interface for compatibility
export type { ChatCompletionRequest, ChatCompletionResponse };
