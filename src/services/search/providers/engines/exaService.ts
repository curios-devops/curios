// Exa search engine (exa.ai) — proxied through the exa-search edge function.
// The browser can't call api.exa.ai directly (no CORS + it would leak the key),
// so the function makes the call server-side. Primary web engine for the
// Default tier and the contrapunto angle in Ask Deeper.

import type { WebSearchResult } from '../webSearchProvider';
import { logger } from '../../../../utils/logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gpfccicfqynahflehpqo.supabase.co';

/**
 * Search the web via Exa. Returns [] on any failure or if the key is missing,
 * so callers can fall back to Brave.
 */
export async function searchExa(query: string, numResults = 10): Promise<WebSearchResult[]> {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey?.trim()) {
    logger.warn('Exa: VITE_SUPABASE_ANON_KEY not configured');
    return [];
  }
  if (!query?.trim()) return [];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/exa-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ query: query.trim(), numResults }),
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
