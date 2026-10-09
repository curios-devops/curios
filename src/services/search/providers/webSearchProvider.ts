// Web Search Provider — Default tier routing (one query, fast).
// Exa → Tavily → Brave: each engine runs only when the previous ones failed or came
// back sparse, and its results are merged in. Calls to the same engine are paced 1s
// apart app-wide (commonService/utils/enginePacer).

import { searchExa } from './engines/exaService';
import { searchBraveWeb } from './engines/braveAdapter';
import { searchWithTavily } from '../../../commonService/searchTools/tavilyService';
import { logger } from '../../../utils/logger';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

// Below this many results we consider the search "sparse" and bring in the next engine.
const MIN_RESULTS = 5;

function dedupeByUrl(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];
  for (const r of results) {
    if (!r?.url || seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }
  return out;
}

async function searchTavilyBasic(query: string): Promise<WebSearchResult[]> {
  try {
    const { results } = await searchWithTavily(query);
    return results.map((r) => ({ title: r.title, url: r.url, snippet: r.content, content: r.content }));
  } catch {
    return [];
  }
}

/**
 * Execute Default-tier web search: Exa → Tavily → Brave, stopping at the first
 * engine that brings the merged results up to MIN_RESULTS.
 */
export async function executeWebSearch(query: string): Promise<WebSearchResult[]> {
  if (!query?.trim()) {
    logger.warn('WebSearchProvider: Empty query provided');
    return [];
  }

  const chain: [string, (q: string) => Promise<WebSearchResult[]>][] = [
    ['exa', (q) => searchExa(q, 10).catch(() => [])],
    ['tavily', searchTavilyBasic],
    ['brave', searchBraveWeb],
  ];

  let results: WebSearchResult[] = [];
  for (const [engine, search] of chain) {
    results = dedupeByUrl([...results, ...(await search(query))]);
    if (results.length >= MIN_RESULTS) {
      logger.info('WebSearchProvider: search completed', { engine, resultCount: results.length });
      return results.slice(0, 10);
    }
    logger.info('WebSearchProvider: sparse, trying next engine', { after: engine, resultCount: results.length });
  }
  return results.slice(0, 10);
}
