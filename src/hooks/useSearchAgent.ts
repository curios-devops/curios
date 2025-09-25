import { useState } from 'react';
import { logger } from '../utils/logger';


interface SearchOptions {
  mode?: string;
  type?: string;
  pro?: boolean;
}

export function useSearchAgent() {
  const [loading, setLoading] = useState(false);

  const search = async (query: string, options: SearchOptions = {}) => {
    try {
      setLoading(true);

      // Configure the system message based on search type
      const systemMessage = options.pro
        ? `You are an advanced AI search assistant with access to premium features.
           Provide comprehensive, well-researched answers with multiple perspectives.
           Include relevant citations and follow-up questions.`
        : `You are a helpful AI search assistant.
           Provide clear, concise answers based on reliable sources.`;


      // Supabase Edge Function OpenAI completion
      const supabaseEdgeUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_API_URL)
        ? import.meta.env.VITE_OPENAI_API_URL
        : 'VITE_OPENAI_API_URL';
      const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined;
      if (!supabaseAnonKey) throw new Error('Supabase anon key not found in environment variables');
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: query }
      ];
      const fetchResponse = await fetch(supabaseEdgeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ prompt: JSON.stringify({ messages }) })
      });
      if (!fetchResponse.ok) throw new Error('OpenAI completion failed');
      const data = await fetchResponse.json();
      const content = data.text || data.content || data.output_text;
      return content;
    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    search,
    loading
  };
}