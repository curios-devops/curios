import { SearchResult } from '../utils/types';
import { RETRY_OPTIONS } from '../utils/config';
import { withRetry, sanitizeResponse } from '../utils/utils';
import { fetchAIResponseWithSearch, getResponseText } from './simpleOpenAI';

export async function generateAnswer(
  query: string,
  searchResults: SearchResult[]
): Promise<string> {
  try {
    const sanitizedResults = sanitizeResponse(searchResults);
    
    // Use the new integrated function with search results
    const response = await withRetry(
      async () => {
        return await fetchAIResponseWithSearch(query, sanitizedResults);
      },
      RETRY_OPTIONS
    );

    const answer = getResponseText(response);
    if (!answer) throw new Error('No answer generated');
    
    return answer;
  } catch (error) {
    console.error('OpenAI generation error:', error);
    throw error;
  }
}