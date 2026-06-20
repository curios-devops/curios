// Exa search engine (exa.ai) — direct client call, same pattern as Tavily.
// Primary web engine for the Default tier and the contrapunto angle in Ask Deeper.

import type { WebSearchResult } from '../webSearchProvider';
import { logger } from '../../../../utils/logger';

/**
 * Search the web via Exa. Returns [] on any failure or if the key is missing,
 * so callers can fall back to Brave.
 */
export async function searchExa(query: string, numResults = 10): Promise<WebSearchResult[]> {
  const apiKey = import.meta.env.VITE_EXA_API_KEY;
  if (!apiKey?.trim()) {
    logger.warn('Exa: VITE_EXA_API_KEY not configured');
    return [];
  }
  if (!query?.trim()) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query: query.trim(),
        type: 'auto',
        numResults,
        contents: { text: { maxCharacters: 600 } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      logger.warn('Exa: API error', { status: res.status });
      return [];
    }

    const data = await res.json();
    return (data.results || [])
      .filter((r: { url?: string; title?: string }) => r?.url && r?.title)
      .map((r: { title: string; url: string; text?: string; summary?: string }) => {
        const text = (r.text || r.summary || '').toString().trim();
        return {
          title: String(r.title).trim(),
          url: String(r.url).trim(),
          snippet: text.slice(0, 600),
          content: text,
        };
      });
  } catch (error) {
    clearTimeout(timeoutId);
    logger.warn('Exa: search failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return [];
  }
}
