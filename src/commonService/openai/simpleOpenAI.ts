// Simple OpenAI service following the tutorial pattern
// Uses fetch API to make requests to the serverless function
// ARCHITECTURE NOTE: This service handles direct search integration for swarm architecture
// For agent orchestration, use secureOpenAI.ts which provides chat completion interface

export interface SimpleOpenAIRequest {
  input: string;
}

export interface SimpleOpenAIResponse {
  output_text?: string;
  content?: Array<{ type: string; text?: string }>;
  error?: string;
}

/**
 * Simple function to fetch AI response following the tutorial pattern
 * Uses fetch API to make requests to the serverless function
 */
export const fetchAIResponse = async (input: string): Promise<SimpleOpenAIResponse> => {
  try {
  const supabaseEdgeUrl = 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      throw new Error('Supabase anon key not found in environment variables');
    }
    // Use a simple chat completion format
    const messages = [
      { role: 'user', content: input }
    ];
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({ messages })
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[OpenAI] Error fetching data from Supabase Edge Function:', error);
    throw error;
  }
};

/**
 * Helper function to get the response text
 */
export const getResponseText = (response: SimpleOpenAIResponse): string => {
  if (response.error) {
    throw new Error(response.error);
  }
  
  // Try different response formats
  if (response.output_text) {
    return response.output_text;
  }
  
  if (response.content && response.content.length > 0) {
    return response.content[0]?.text || '';
  }
  
  return '';
};

/**
 * Simple chat completion function
 */
export const createChatCompletion = async (messages: Array<{ role: string; content: string }>): Promise<string> => {
  // Use Supabase Edge Function for chat completions
  const supabaseEdgeUrl = 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key not found in environment variables');
  }
  const response = await fetch(supabaseEdgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      prompt: JSON.stringify({ messages })
    })
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  // Try to parse as JSON if possible
  let text = '';
  try {
    if (typeof data.text === 'string') {
      const parsed = JSON.parse(data.text);
      if (parsed && typeof parsed.content === 'string') {
        text = parsed.content;
      } else if (typeof parsed === 'string') {
        text = parsed;
      }
    }
  } catch (e) {
    text = typeof data.text === 'string' ? data.text : '';
  }
  if (!text && data.content) {
    text = data.content;
  }
  if (!text) {
    text = data.output_text || '';
  }
  return text;
};

/**
 * Enhanced AI response fetcher with Brave search results integration
 * Combines user query with search results for comprehensive answers
 */
export const fetchAIResponseWithSearch = async (
  query: string, 
  searchResults: Array<{ title: string; content: string; url?: string }>
): Promise<SimpleOpenAIResponse> => {
  try {
  const supabaseEdgeUrl = 'https://gpfccicfqynahflehpqo.supabase.co/functions/v1/fetch-openai';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseAnonKey) {
      throw new Error('Supabase anon key not found in environment variables');
    }
    // Compose messages for chat.completions API
    const messages = [
      { role: 'system', content: 'You are a helpful assistant that uses web search results to answer user questions. Use the provided search results to answer as accurately as possible.' },
      { role: 'user', content: `${query}\n\nSearch Results:\n${searchResults.map(r => `- ${r.title}: ${r.content}${r.url ? ` (${r.url})` : ''}`).join('\n')}` }
    ];
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({ messages })
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching AI response with search:', error);
    throw error;
  }
};


