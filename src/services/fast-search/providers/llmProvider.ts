// LLM Provider - Handles single-pass LLM generation with openai-mini

import type { WebSearchResult } from './webSearchProvider';
import type { ImageResult, VideoResult } from './mediaSearchProvider';
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
 * Extract site name from URL for citation format
 */
function extractSiteName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return hostname
      .replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, '')
      .split('.')[0];
  } catch {
    return 'source';
  }
}

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
 * Generate answer with streaming support using search results from Tavily/Brave
 * Streams the answer as it's being generated
 *
 * @param context - The search context with web results
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

  // Build sources text from search results
  const sourcesText = context.webResults
    .map((result) => {
      const siteName = extractSiteName(result.url);
      return `[${siteName}] ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}`;
    })
    .join('\n\n');

  // Build user message for streaming with search results
  const userMessage = `Based on these search results, provide a comprehensive answer to: "${context.query}"

Search Results:
${sourcesText}

Requirements:
- Use inline citations with the website name like [wikipedia], [nytimes], [bbc], etc.
- If multiple sources from the same site, use [sitename +N] format like [wikipedia +2] for 3 wikipedia sources
- Provide a clear, well-structured response in markdown format
- Make response comprehensive and informative
- At the end, include a section "## Follow-up Questions:" with 3-5 relevant questions users might ask next
- Format follow-ups as a numbered list (1., 2., etc.)

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
          max_output_tokens: 1200, // Balanced comprehensive responses
          reasoning: { effort: 'low' }
        }),
        stream: true
      }),
      signal: controller.signal
    });

    // Don't clear timeout yet - keep it active during streaming
    // clearTimeout(timeoutId);

    if (!response.ok) {
      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      let readResult;
      try {
        readResult = await reader.read();
      } catch (readError) {
        logger.error('LLMProvider: reader.read() error', {
          error: readError instanceof Error ? readError.message : String(readError)
        });
        throw readError;
      }

      const { done, value } = readResult;

      if (done) {
        break;
      }

      const decoded = decoder.decode(value, { stream: true });
      buffer += decoded;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        if (!line.startsWith('data: ')) {
          logger.warn('LLMProvider: Unexpected line format', { line: line.substring(0, 100) });
          continue;
        }

        const data = line.slice(6);
        if (data === '[DONE]') {
          continue;
        }

        try {
          const json = JSON.parse(data);
          // Handle both edge function format and Responses API format
          const content = json.content || json.delta || json.text || '';

          if (content && typeof content === 'string') {
            fullText += content;
            onChunk(content);
          }
        } catch (parseError) {
          logger.warn('LLMProvider: Failed to parse stream chunk', {
            error: parseError instanceof Error ? parseError.message : 'Unknown',
            data: data.substring(0, 200)
          });
        }
      }
    }

    // Clear timeout after streaming completes successfully
    clearTimeout(timeoutId);

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

  // Look for a section with "Follow-up" or similar (with ## or ### markdown headers)
  const followUpMatch = text.match(/##?\s*(?:Follow-up|Related|Next).*?(?:Questions?|Topics?)\s*[:]*\s*([\s\S]+?)(?=##|$)/i);

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

  logger.debug('LLMProvider: Extracted follow-ups', {
    foundCount: followUps.length,
    hasFollowUpSection: !!followUpMatch,
    textPreview: text.substring(text.length - 300)
  });

  // Return empty array if no follow-ups found (controller will generate dynamic ones)
  return followUps.slice(0, 5); // Limit to 5
}
