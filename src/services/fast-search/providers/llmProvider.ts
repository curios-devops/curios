// LLM Provider - Handles single-pass LLM generation with openai-mini

import type { WebSearchResult } from './webSearchProvider';
import type { ImageResult, VideoResult } from './mediaSearchProvider';
import { FAST_SEARCH_SYSTEM_PROMPT, buildUserPrompt } from '../prompts/systemPrompt';
import { logger } from '../../../utils/logger';

export interface SearchContext {
  query: string;
  webResults: WebSearchResult[];
  images: ImageResult[];
  videos: VideoResult[];
  date: string;
  locale: string;
}

export interface LLMResponse {
  answer: string;
  followUps: string[];
}

const MODEL = 'gpt-5-mini'; // Fast, cost-effective GPT-5 model with Responses API support

/**
 * Generate structured answer using GPT-5 mini with Responses API + web_search tool
 * This combines web search and answer generation in a single API call
 *
 * @param context - The complete search context
 * @returns LLM response with answer and follow-up questions
 */
export async function generateAnswer(
  context: SearchContext
): Promise<LLMResponse> {
  logger.debug('LLMProvider: Generating answer with web search', {
    query: context.query,
    fallbackSourceCount: context.webResults.length
  });

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  // Build user message that asks for web search
  const userMessage = `Search the web and provide a comprehensive answer to: "${context.query}"

Requirements:
- Use current web information to answer accurately
- Provide a clear, well-structured response in markdown format
- Include 3-5 relevant follow-up questions
- Return response as JSON: {"answer": "markdown text", "followUps": ["question 1", "question 2", ...]}

Today's date: ${context.date}
Language: ${context.locale}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for web search + generation

  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          input: [
            { role: 'user', content: userMessage }
          ],
          model: MODEL,
          tools: [
            {
              type: 'web_search',
              search_context_size: 'low' // Fast, cost-effective search
            }
          ],
          response_format: { type: 'json_object' },
          max_output_tokens: 2000,
          reasoning: { effort: 'low' } // Fast reasoning for speed
        })
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('LLMProvider: API error', {
        status: response.status,
        error: errorText.substring(0, 300)
      });
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    logger.debug('LLMProvider: Received response from Responses API', {
      hasText: !!data.text,
      hasOutputText: !!data.output_text,
      rawDataPreview: JSON.stringify(data).substring(0, 500)
    });

    const result = parseResponse(data);

    logger.info('LLMProvider: Answer generated successfully with web search', {
      answerLength: result.answer.length,
      followUpCount: result.followUps.length
    });

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('LLMProvider: Generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Generate answer with streaming support using Responses API + web_search tool
 * Streams the answer as it's being generated
 *
 * @param context - The search context
 * @param onChunk - Callback for each chunk
 * @returns Follow-up questions after streaming completes
 */
export async function generateAnswerStreaming(
  context: SearchContext,
  onChunk: (chunk: string) => void
): Promise<{ followUps: string[] }> {
  logger.debug('LLMProvider: Generating answer with streaming + web search', {
    query: context.query
  });

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  // Build user message for streaming
  const userMessage = `Search the web and provide a comprehensive answer to: "${context.query}"

Requirements:
- Use current web information to answer accurately
- Provide a clear, well-structured response in markdown format
- Include 3-5 relevant follow-up questions at the end

Today's date: ${context.date}
Language: ${context.locale}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for streaming

  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          input: [
            { role: 'user', content: userMessage }
          ],
          model: MODEL,
          tools: [
            {
              type: 'web_search',
              search_context_size: 'low'
            }
          ],
          max_output_tokens: 2000,
          reasoning: { effort: 'low' }
        }),
        stream: true
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('LLMProvider: Streaming API error', {
        status: response.status,
        error: errorText.substring(0, 300)
      });
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    logger.debug('LLMProvider: Starting to read stream');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          // Handle both edge function format and Responses API format
          const content = json.content || json.delta || json.text || '';

          if (content && typeof content === 'string') {
            fullText += content;
            onChunk(content);
          }
        } catch (parseError) {
          // Ignore parse errors for incomplete chunks
          logger.debug('LLMProvider: Failed to parse stream chunk', {
            error: parseError instanceof Error ? parseError.message : 'Unknown'
          });
        }
      }
    }

    // Extract follow-ups from the full text
    const followUps = extractFollowUps(fullText);

    logger.info('LLMProvider: Streaming completed with web search', {
      answerLength: fullText.length,
      followUpCount: followUps.length
    });

    return { followUps };
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('LLMProvider: Streaming generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Parse non-streaming OpenAI response
 */
function parseResponse(data: any): LLMResponse {
  try {
    // Edge function returns text directly
    const content = data.text || data.choices?.[0]?.message?.content;

    if (!content) {
      logger.error('LLMProvider: No content in response', {
        hasText: !!data.text,
        hasChoices: !!data.choices,
        dataKeys: Object.keys(data)
      });
      throw new Error('No content in response');
    }

    // Try to parse as JSON first (if response_format was json_object)
    try {
      const parsed = JSON.parse(content);
      if (parsed.answer && Array.isArray(parsed.followUps)) {
        logger.debug('LLMProvider: Successfully parsed JSON response with structured data');
        return {
          answer: parsed.answer,
          followUps: parsed.followUps
        };
      }
      // If JSON but not in expected format, extract what we can
      if (parsed.answer) {
        logger.debug('LLMProvider: Parsed JSON with answer but no followUps');
        return {
          answer: parsed.answer,
          followUps: extractFollowUps(parsed.answer)
        };
      }
    } catch (parseError) {
      // Not JSON, will parse as markdown text below
      logger.debug('LLMProvider: Content is not JSON, parsing as markdown');
    }

    // Extract follow-ups from markdown text
    const followUps = extractFollowUps(content);

    return {
      answer: content,
      followUps
    };
  } catch (error) {
    logger.error('LLMProvider: Failed to parse response', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new Error('Failed to parse LLM response');
  }
}

/**
 * Extract follow-up questions from text
 * Looks for numbered lists or questions at the end
 */
function extractFollowUps(text: string): string[] {
  const followUps: string[] = [];

  // Look for a section with "Follow-up" or similar
  const followUpMatch = text.match(/(?:Follow-up|Related|Next).*?(?:Questions?|Topics?)?\s*[:]\s*([\s\S]+?)(?:\n\n|$)/i);

  if (followUpMatch) {
    const section = followUpMatch[1];
    // Extract numbered or bulleted items
    const items = section.match(/(?:^|\n)\s*(?:\d+\.|[-*])\s*(.+?)(?=\n|$)/g);
    if (items) {
      items.forEach(item => {
        const clean = item.replace(/^\s*(?:\d+\.|[-*])\s*/, '').trim();
        if (clean) followUps.push(clean);
      });
    }
  }

  // If no follow-ups found, generate some generic ones
  if (followUps.length === 0) {
    return [
      'What are the latest developments?',
      'How does this compare to alternatives?',
      'What are the main benefits?',
      'Are there any limitations?',
      'Where can I learn more?'
    ].slice(0, 3);
  }

  return followUps.slice(0, 5); // Limit to 5
}
