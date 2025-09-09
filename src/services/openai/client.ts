import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

// In a real app, you'd want to get this from a secure source
const FALLBACK_API_KEY = 'your-fallback-api-key-here';

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const isBrowser = typeof window !== 'undefined';
    const apiKey = process.env.OPENAI_API_KEY || FALLBACK_API_KEY;
    
    if (!apiKey && !isBrowser) {
      throw new Error('OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.');
    }
    
    openaiInstance = new OpenAI({
      apiKey: isBrowser ? 'dummy-key' : apiKey, // Dummy key for browser as we use the proxy
      baseURL: isBrowser ? '/api/openai' : undefined,
      dangerouslyAllowBrowser: true, // Required for browser usage with proxy
    });
  }
  
  return openaiInstance;
}

// For server-side usage with a specific API key
export function setOpenAIClient(apiKey: string): OpenAI {
  openaiInstance = new OpenAI({
    apiKey,
  });
  return openaiInstance;
}
