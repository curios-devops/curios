import OpenAI from 'openai';
import { SearchResult } from './types';
import { RETRY_OPTIONS } from './config';
import { withRetry, sanitizeResponse } from './utils';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateAnswer(
  query: string,
  searchResults: SearchResult[]
): Promise<string> {
  try {
    const sanitizedResults = sanitizeResponse(searchResults);
    const context = sanitizedResults
      .map(result => `Source: ${result.url}\nTitle: ${result.title}\nContent: ${result.content}`)
      .join('\n\n');

    const systemPrompt = `You are a helpful AI assistant that provides accurate, well-structured answers based on search results. 
    Format your response in clear paragraphs with proper citations to sources. 
    If the search results don't contain enough information, acknowledge this and provide the best possible answer with available data.
    Always maintain a neutral, factual tone.`;

    const userPrompt = `Based on the following search results, provide a comprehensive answer to the question: "${query}"\n\nSearch Results:\n${context}`;

    const completion = await withRetry(
      async () => {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 500,
        });
        
        const answer = response.choices[0]?.message?.content;
        if (!answer) throw new Error('No answer generated');
        return answer;
      },
      RETRY_OPTIONS
    );

    return completion;
  } catch (error) {
    console.error('OpenAI generation error:', error);
    throw error;
  }
}