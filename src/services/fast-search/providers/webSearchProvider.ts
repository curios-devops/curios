// Web Search Provider — Default tier routing.
// Exa is the primary engine; if it returns few results we supplement with Brave.

import { searchExa } from './engines/exaService';
import { searchBraveWeb } from './engines/braveAdapter';
import { logger } from '../../../utils/logger';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

// Below this many Exa results we consider it "few" and bring in Brave.
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

/**
 * Execute Default-tier web search: Exa primary, Brave fallback when sparse.
 */
export async function executeWebSearch(query: string): Promise<WebSearchResult[]> {
  if (!query?.trim()) {
    logger.warn('WebSearchProvider: Empty query provided');
    return [];
  }

  const exaResults = await searchExa(query, 10);

  if (exaResults.length >= MIN_RESULTS) {
    logger.info('WebSearchProvider: Exa search completed', { resultCount: exaResults.length });
    return exaResults;
  }

  // Few results from Exa → supplement with Brave.
  logger.info('WebSearchProvider: Exa sparse, falling back to Brave', {
    exaCount: exaResults.length,
  });
  const braveResults = await searchBraveWeb(query);
  return dedupeByUrl([...exaResults, ...braveResults]).slice(0, 10);
}
