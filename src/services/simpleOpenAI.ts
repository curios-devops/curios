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
    const response = await fetch('/api/fetch-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data from OpenAI:', error);
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
  // Convert messages to a single input string
  const input = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
  
  const response = await fetchAIResponse(input);
  return getResponseText(response);
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
    const response = await fetch('/api/fetch-openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        searchResults,
        model: 'gpt-4o-mini' // Use reliable model that supports temperature
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


