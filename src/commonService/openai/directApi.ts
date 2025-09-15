import { getOpenAIClient } from './client';

interface ResponseUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  [key: string]: unknown;
}

export interface OpenAIResponse {
  output_text: string;
  model: string;
  usage?: ResponseUsage;
}

export async function createResponse(
  input: string | Array<{role: string, content: string}>,
  options: {
    model?: string;
    effort?: 'low' | 'medium' | 'high';
    verbosity?: 'low' | 'medium' | 'high';
  } = {}
): Promise<OpenAIResponse> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
  const apiUrl = `${baseUrl}/api/fetch-openai`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        model: options.model || 'gpt-4o-mini',
        reasoning_effort: options.effort || 'medium',
        verbosity: options.verbosity || 'medium',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      output_text: result.output_text || '',
      model: result.model,
      usage: result.usage,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get response: ${errorMessage}`);
  }
}

export async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    const result = await createResponse([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Write a haiku about coding in the moonlight' }
    ], {
      model: 'gpt-4o-mini',
      effort: 'medium',
      verbosity: 'medium',
    });
    
    console.log('✅ OpenAI API Test Successful!');
    console.log('Model:', result.model);
    console.log('Response:', result.output_text);
    if (result.usage) {
      console.log('Usage:', {
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        total_tokens: result.usage.total_tokens
      });
    }
    return result;
  } catch (error) {
    console.error('❌ OpenAI API Test Failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.stack);
    }
    throw error;
  }
}
