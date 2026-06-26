// Article Service - Generate AI-enhanced article content with Tavily search

import { logger } from '../../utils/logger';
import { searchWithTavily } from '../../commonService/searchTools/tavilyService';

export interface ArticleContent {
  mainContent: string; // AI-generated markdown content
  sources: ArticleSource[];
}

export interface ArticleSource {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  domain: string;
}

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
 * Generate article content with OpenAI streaming, using Tavily results as context
 */
export async function generateArticleContentStreaming(
  title: string,
  _snippet: string,
  _originalUrl: string,
  onChunk: (chunk: string) => void,
  onSourcesFound?: (sources: ArticleSource[]) => void
): Promise<ArticleSource[]> {
  try {
    logger.info('[ARTICLE SERVICE] Step 1: Fetching Tavily context', { query: title });

    // Step 1: Get Tavily results for context
    const { results } = await searchWithTavily(title);

    logger.info('[ARTICLE SERVICE] Step 2: Tavily complete', { resultCount: results.length });

    // Build sources from Tavily
    const sources: ArticleSource[] = results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      domain: extractDomain(result.url)
    }));

    // Notify that sources are ready (BEFORE streaming starts - like fast-search)
    if (onSourcesFound && sources.length > 0) {
      logger.info('[ARTICLE SERVICE] Calling onSourcesFound callback', { count: sources.length });
      onSourcesFound(sources);
    }

    // Step 2: Build context from Tavily results with site names (like fast-search)
    const context = results
      .slice(0, 5) // Use top 5 results
      .map((r) => {
        // Extract site name from URL
        const siteName = (() => {
          try {
            const hostname = new URL(r.url).hostname.replace(/^www\./, '');
            const parts = hostname.split('.');
            return parts[0] || 'source';
          } catch {
            return 'source';
          }
        })();
        return `[${siteName}] ${r.title}\nURL: ${r.url}\nContent: ${r.content}`;
      })
      .join('\n\n');

    logger.info('[ARTICLE SERVICE] Step 3: Calling OpenAI with context');

    // Step 3: Call OpenAI with streaming
    const supabaseEdgeUrl = import.meta.env.VITE_OPENAI_API_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseEdgeUrl || !supabaseAnonKey) {
      throw new Error('OpenAI Edge Function not configured');
    }

    // Build prompt with citation instructions (exact copy from fast-search)
    const prompt = `Based on these search results, provide a comprehensive answer to: "${title}"

Search Results:
${context}

Requirements:
- Use inline citations with the website name like [wikipedia], [nytimes], [bbc], etc.
- If multiple sources from the same site, use [sitename +N] format like [wikipedia +2] for 3 wikipedia sources
- Provide a clear, well-structured response in markdown format
- Make response comprehensive and informative
- DO NOT include follow-up questions in the response text

Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

    const response = await fetch(supabaseEdgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({
        prompt: JSON.stringify({
          input: [{ role: 'user', content: prompt }],
          model: 'gpt-4o-mini',
          max_output_tokens: 2000
        }),
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Step 4: Process streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response reader');
    }

    const decoder = new TextDecoder();
    let buffer = '';

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
          const content = json.content || json.delta || json.text || '';
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          // Skip parse errors
        }
      }
    }

    logger.info('[ARTICLE SERVICE] Step 4: Streaming complete');
    return sources;

  } catch (error) {
    logger.error('[ARTICLE SERVICE] Error', { error });
    throw error;
  }
}
