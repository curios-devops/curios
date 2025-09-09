import { getOpenAIClient } from './client';

interface ResponseUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  [key: string]: unknown;
}

export interface OpenAIResponse {
  output_text: string;
  model: string;
  usage?: ResponseUsage;
}

export async function createResponse(
  input: string,
  options: {
    model?: string;
    effort?: 'low' | 'medium' | 'high';
    verbosity?: 'low' | 'medium' | 'high';
  } = {}
): Promise<OpenAIResponse> {
  const openai = getOpenAIClient();
  
  try {
    const result = await openai.responses.create({
      model: options.model || 'gpt-4',
      input,
      reasoning: { effort: options.effort || 'medium' },
      text: { verbosity: options.verbosity || 'medium' },
    });

    return {
      output_text: result.output_text,
      model: result.model,
      usage: result.usage,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get response from OpenAI: ${errorMessage}`);
  }
}

export async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    const result = await createResponse('Write a haiku about code.', {
      model: 'gpt-4',
      effort: 'low',
      verbosity: 'low',
    });
    
    console.log('OpenAI API Test Successful!');
    console.log('Response:', result.output_text);
    return result;
  } catch (error) {
    console.error('OpenAI API Test Failed:', error);
    throw error;
  }
}
