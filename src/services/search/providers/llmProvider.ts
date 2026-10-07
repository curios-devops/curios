// LLM Provider - Handles single-pass LLM generation with openai-mini

import type { WebSearchResult } from './webSearchProvider';
import type { ImageResult, VideoResult } from './mediaSearchProvider';
import { logger } from '../../../utils/logger';
import { appSettings } from '../../../config/appSettings';

export interface SearchContext {
  query: string;
  webResults: WebSearchResult[];
  images: ImageResult[];
  videos: VideoResult[];
  date: string;
  locale: string;
  /** Answer model for this question (Luna/Sol/Astra); defaults to Sol. */
  model?: string;
}

export interface LLMResponse {
  answer: string;
  followUps: string[];
}

// Default answer model (Sol); per-question tiers come from useAnswerModel. See app-settings.md MODELS.
const MODEL = appSettings.models.sol;

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

  // Editorial style guide, not a template: a ~1-minute read (300–600 words)
  // that feels written by an experienced editor. Structure adapts to the topic;
  // headings rotate; emojis are rare. See the Curios search style guide.
  const userMessage = `Question: "${context.query}"

Search Results:
${buildSourcesText(context.webResults)}

Write a concise, enjoyable, trustworthy overview that can be read in about one minute — like an experienced journalist or analyst, not an AI assistant. Follow this style guide as a communication strategy, NOT a fixed template: adapt the organization to the topic and do not use an identical structure every time.

Length: about 300–600 words, depending on how complex the topic is.

Flow (adaptive — use what fits, don't force every part):
- Open with a short title as a markdown "## " heading, then an introduction of 2–5 plain sentences that orients the reader: what this is, why it's worth knowing, and the core point. Write it as flowing prose — no rhetorical questions and no lead-in labels or colons (never "Why care?", "The main takeaway:", "Key point:", "In short:"). No generic openings like "This article discusses…".
- Expand with one natural section under a "### " heading that fits the topic (e.g. Why it matters, What's happening, Key context, Background, How it works, What changed, Bigger picture). Pick whichever fits; don't default to the same one.
- When it helps, highlight the key points as bullets: usually 4, never fewer than 3, rarely more than 5. One meaningful idea per bullet; bold only the key words; don't repeat the introduction.
- Close with a brief "### " section (e.g. Bottom line, In summary, Key insight, The big picture, Takeaway, TL;DR) written as one short paragraph, not another list. Vary the wording.

Adapt to the topic:
- News → what happened and why it matters. Science → explain the concept before implications. History → context first.
- Products → strengths, weaknesses, a practical recommendation. Comparisons → similarities, differences, conclusion. How-to → short explanation, then practical steps.

Style:
- Short paragraphs with good spacing, active voice, clear transitions, concrete language.
- Confident but never sensational. No filler, repetition, marketing language or excessive jargon. Prioritize clarity over completeness.
- Emojis: usually none, at most two in the whole answer, only where they genuinely help. Never in every heading, never decorative.
- Never expose internal reasoning. Don't invite the reader to "explore more" or "read on" — the answer should stand on its own.
- Ground every claim in the sources and prefer the most recent information. Add inline citations with the site name like [reuters], [bbc] — 1–2 most relevant per claim (use [site +N] when several come from the same site).

After the answer, add a section "## Follow-up Questions:" with 3–5 relevant questions as a numbered list (1., 2., …).

Finally, on its own last line: "## Know more: {label}" — a short action label (max ~7 words) naming the single most interesting concept from your answer worth going deeper into, e.g. "Know more about AI privacy", "See how it works", "Dive deeper into neural networks", "What happens next?". Avoid generic labels like "Expand", "More" or "Continue".

Today's date: ${context.date}
Language: ${context.locale}`;

  const fullText = await streamLLMText(userMessage, 1800, onChunk, 60000, context.model);
  const followUps = extractFollowUps(fullText);

  logger.info('LLMProvider: Streaming completed with web search', {
    answerLength: fullText.length,
    followUpCount: followUps.length
  });

  return { followUps };
}

/**
 * "Know more" progressive expansion: continues the same article one level
 * deeper, assuming the reader has read everything above. Streams the new
 * section and returns the next contextual label (recursive expansion).
 */
export async function generateExpansionStreaming(
  params: { query: string; previous: string; topic: string; sources: WebSearchResult[]; locale: string; model?: string },
  onChunk: (chunk: string) => void
): Promise<{ nextLabel: string | null }> {
  const userMessage = `You are continuing an article that answers: "${params.query}"

The reader has already read everything below and clicked "${params.topic}". Write the NEXT section of the same article — one level deeper on that topic.

Article so far:
"""
${params.previous}
"""

Search Results:
${buildSourcesText(params.sources)}

Progressive expansion rules:
- Treat this as the next page of the same document. Do not restart, do not summarize or repeat earlier sections, do not repeat the introduction, and don't redefine concepts already explained unless the new discussion needs it.
- Every paragraph must teach something not covered above. Never rewrite, paraphrase or restate earlier paragraphs or bullets, and never produce another overview or conclusion before adding new information.
- Go deeper, not sideways: overview → important facts → technical explanation → architecture → research → edge cases → future directions. Pick whichever direction naturally enriches the topic (technical implementation, history, science, real-world examples, adoption, limitations, controversies, future developments, alternatives, practical implications, expert perspectives).
- Begin with a natural transition, e.g. "One important aspect not yet discussed is…", "At a technical level…", "In practice…", "Researchers have also found…". Never start with "Here's a more detailed explanation" or "Let's expand on that".
- Same writing style as the article: "### " headings only when helpful, short paragraphs, optional bullets, concise but informative, no rigid template, at most one emoji. Don't force a conclusion — end naturally at the current depth.
- About 200–400 words. Ground claims in the sources; add inline citations like [reuters] where they support a claim.

Finally, on its own last line: "## Know more: {label}" — a short action label (max ~7 words) naming the next most interesting unanswered concept, more specialized than "${params.topic}". Avoid generic labels like "Expand", "More" or "Continue".

Today's date: ${new Date().toISOString().split('T')[0]}
Language: ${params.locale}`;

  const fullText = await streamLLMText(userMessage, 1400, onChunk, 60000, params.model);
  return { nextLabel: extractKnowMoreLabel(fullText) };
}

/** Pull the agent's "## Know more: {label}" line out of a response, if any. */
export function extractKnowMoreLabel(text: string): string | null {
  const m = text.match(/^\s*#{0,3}\s*\**Know more:\**\s*(.+?)\s*$/im);
  const label = m?.[1]?.replace(/[*_"→]+/g, '').trim();
  return label || null;
}

/**
 * Format a list of web results as a citation-friendly text block.
 * Shared by the default (concise) and deep (structured) synthesis flows.
 */
export function buildSourcesText(webResults: WebSearchResult[]): string {
  return webResults
    .map((result) => {
      const siteName = extractSiteName(result.url);
      return `[${siteName}] ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}`;
    })
    .join('\n\n');
}

/**
 * Low-level streaming primitive: POSTs a single user message to the OpenAI edge
 * function and streams the text back via onChunk. Returns the full text.
 * Shared by the default (concise) and deep (structured) synthesis flows.
 */
export async function streamLLMText(
  userMessage: string,
  maxOutputTokens: number,
  onChunk: (chunk: string) => void,
  timeoutMs = 60000,
  model: string = MODEL,
  // 'minimal' cuts gpt-5 latency ~3x for short, live outputs (Character mode).
  reasoningEffort: 'minimal' | 'low' = 'low'
): Promise<string> {
  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          model,
          max_output_tokens: maxOutputTokens,
          reasoning: { effort: reasoningEffort }
        }),
        stream: true
      }),
      signal: controller.signal
    });

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

    return fullText;
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
export function extractFollowUps(text: string): string[] {
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
