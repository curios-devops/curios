// Article Service - Generate AI-enhanced article content

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
 * Generate AI-enhanced article content using LLM with web_search tool
 */
export async function generateArticleContent(
  title: string,
  snippet: string,
  originalUrl: string
): Promise<ArticleContent> {
  logger.debug('[ARTICLE SERVICE] Generating content', { title });

  const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseEdgeUrl || !supabaseAnonKey) {
    throw new Error('Supabase Edge Function not configured');
  }

  const userMessage = `You are writing an in-depth article about: "${title}"

Context: ${snippet}

Requirements:
- Search the web for comprehensive, up-to-date information about this topic
- Write a detailed article (500-800 words) with multiple sections
- Use markdown formatting with headers (##), bullet points, and paragraphs
- Include key facts, context, implications, and analysis
- Make it engaging and easy to read
- Focus on "why this matters" and "what happens next"
- Return as JSON: {"content": "markdown article text", "sources": [{"title": "...", "url": "..."}]}

Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

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
          response_format: { type: 'json_object' },
          max_output_tokens: 3000,
          reasoning: { effort: 'medium' } // Better quality for articles
        })
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[ARTICLE SERVICE] API error', { status: response.status, error: errorText });
      throw new Error(`Failed to generate article: ${response.status}`);
    }

    const data = await response.json();
    logger.debug('[ARTICLE SERVICE] Received response', { data });

    // Parse the LLM response
    let parsedContent;
    try {
      // The response might be wrapped in different formats
      const contentText = data.content || data.choices?.[0]?.message?.content || '';
      parsedContent = JSON.parse(contentText);
    } catch (e) {
      logger.error('[ARTICLE SERVICE] Failed to parse response', { error: e, data });
      throw new Error('Failed to parse AI response');
    }

    const mainContent = parsedContent.content || parsedContent.article || '';
    const rawSources = parsedContent.sources || [];

    // Format sources
    const sources: ArticleSource[] = [
      // Always include original source first
      {
        title: extractDomain(originalUrl),
        url: originalUrl,
        domain: extractDomain(originalUrl)
      },
      // Add AI-found sources
      ...rawSources.map((src: any) => ({
        title: src.title || extractDomain(src.url),
        url: src.url,
        domain: extractDomain(src.url)
      }))
    ];

    logger.debug('[ARTICLE SERVICE] Content generated successfully', {
      contentLength: mainContent.length,
      sourcesCount: sources.length
    });

    return {
      mainContent,
      sources
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - article generation took too long');
    }

    logger.error('[ARTICLE SERVICE] Error generating content', { error });
    throw error;
  }
}
