// Article Service - Generate AI-enhanced article content with streaming

import { logger } from '../../utils/logger';

export interface ArticleContent {
  mainContent: string; // AI-generated markdown content
  sources: ArticleSource[];
}

export interface ArticleSource {
  title: string;
  url: string;
  favicon?: string;
  domain: string;
}

const MODEL = 'gpt-5-mini';

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

/**
 * Generate AI-enhanced article content using LLM with web_search tool and streaming
 */
export async function generateArticleContentStreaming(
  title: string,
  snippet: string,
  originalUrl: string,
  onChunk: (chunk: string) => void
): Promise<ArticleSource[]> {
  logger.debug('[ARTICLE SERVICE] Generating content with streaming', { title });

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  const userMessage = `You are writing an in-depth article about: "${title}"

Context: ${snippet}

Requirements:
- Search the web for comprehensive, up-to-date information about this topic
- Write a detailed article (600-1000 words) with multiple sections
- Use markdown formatting with headers (##), bullet points, and paragraphs
- Use inline citations like [source] for key facts
- Include key facts, context, implications, and analysis
- Make it engaging and easy to read
- Focus on "why this matters" and "what happens next"
- Write the article directly as markdown text

Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

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
              search_context_size: 'medium' // More context for better article
            }
          ],
          max_output_tokens: 3000,
          reasoning: { effort: 'medium' } // Better quality for articles
        }),
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errorText = await response.text();
      logger.error('[ARTICLE SERVICE] API error', { status: response.status, error: errorText });
      throw new Error(`Failed to generate article: ${response.status}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeoutId);
      throw new Error('Failed to get response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

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
          logger.warn('[ARTICLE SERVICE] Unexpected line format', { line: line.substring(0, 100) });
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

          if (content) {
            onChunk(content);
          }
        } catch (e) {
          logger.warn('[ARTICLE SERVICE] Failed to parse streaming chunk', { error: e, data: data.substring(0, 100) });
        }
      }
    }

    clearTimeout(timeoutId);

    // Return sources (original source only for now, as web_search sources aren't easily extractable)
    const sources: ArticleSource[] = [
      {
        title: extractDomain(originalUrl),
        url: originalUrl,
        domain: extractDomain(originalUrl)
      }
    ];

    logger.debug('[ARTICLE SERVICE] Streaming complete', {
      sourcesCount: sources.length
    });

    return sources;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - article generation took too long');
    }

    logger.error('[ARTICLE SERVICE] Error generating content', { error });
    throw error;
  }
}
