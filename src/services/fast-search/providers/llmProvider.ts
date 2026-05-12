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

const MODEL = 'gpt-5-mini'; // Fast, cost-effective model

/**
 * Generate structured answer using openai-mini in a single pass
 * Takes search context and returns formatted answer with follow-ups
 *
 * @param context - The complete search context
 * @returns LLM response with answer and follow-up questions
 */
export async function generateAnswer(
  context: SearchContext
): Promise<LLMResponse> {
  logger.debug('LLMProvider: Generating answer', {
    query: context.query,
    sourceCount: context.webResults.length
  });

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  // Build sources for prompt
  const sources = context.webResults.map(result => ({
    title: result.title,
    url: result.url,
    snippet: result.snippet
  }));

  const userPrompt = buildUserPrompt(context.query, sources, context.locale);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          messages: [
            { role: 'system', content: FAST_SEARCH_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          model: MODEL,
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_output_tokens: 1500
        })
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const result = parseResponse(data);

    logger.info('LLMProvider: Answer generated successfully', {
      answerLength: result.answer.length,
      followUpCount: result.followUps.length
    });

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('LLMProvider: Generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate answer with streaming support
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
  logger.debug('LLMProvider: Generating answer with streaming', {
    query: context.query,
    sourceCount: context.webResults.length
  });

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  // Build sources for prompt
  const sources = context.webResults.map(result => ({
    title: result.title,
    url: result.url,
    snippet: result.snippet
  }));

  const userPrompt = buildUserPrompt(context.query, sources, context.locale);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for streaming

  try {
    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          messages: [
            { role: 'system', content: FAST_SEARCH_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          model: MODEL,
          stream: true,
          temperature: 0.7,
          max_output_tokens: 1500
        })
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    // Extract follow-ups from the full text
    // Assuming the LLM includes them at the end
    const followUps = extractFollowUps(fullText);

    logger.info('LLMProvider: Streaming completed', {
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
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    // Try to parse as JSON first (if response_format was json_object)
    try {
      const parsed = JSON.parse(content);
      if (parsed.answer && Array.isArray(parsed.followUps)) {
        return {
          answer: parsed.answer,
          followUps: parsed.followUps
        };
      }
    } catch {
      // Not JSON, parse as markdown text
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
