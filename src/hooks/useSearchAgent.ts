import { useState } from 'react';
import { logger } from '../utils/logger';
import { secureOpenAI } from '../services/secureOpenAI';

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

      // Use the appropriate model based on pro status
      const model = 'gpt-4o-mini';

      const completion = await secureOpenAI.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: query }
        ],
        tools: [{
          type: 'retrieval',
          id: 'web-search'
        }],
        tool_choice: 'auto',
        temperature: options.pro ? 0.7 : 0.5
      });

      return completion.choices[0]?.message?.content;
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