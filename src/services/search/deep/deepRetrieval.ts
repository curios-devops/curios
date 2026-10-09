// Ask Deeper — Step B: broad retrieval.
// Runs the three expanded queries in parallel against the existing Fast Search
// providers, then deduplicates by URL and reranks by cross-query frequency so
// sources corroborated by more than one angle float to the top. Capped at ~30.

import type { WebSearchResult } from '../providers/webSearchProvider';
import { searchImages, searchVideos, type ImageResult, type VideoResult } from '../providers/mediaSearchProvider';
import { searchTavilyDeep } from '../providers/engines/tavilyDeep';
import { searchExa } from '../providers/engines/exaService';
import { searchBraveWeb } from '../providers/engines/braveAdapter';
import type { ExpandedQueries } from './queryExpansion';
import { logger } from '../../../utils/logger';

const MAX_DEEP_SOURCES = 30;

type WebEngine = (query: string) => Promise<WebSearchResult[]>;

/** Try engines in order; the first with results wins. Never throws. */
async function firstNonEmpty(query: string, engines: WebEngine[]): Promise<WebSearchResult[]> {
  for (const engine of engines) {
    const results = await engine(query).catch(() => [] as WebSearchResult[]);
    if (results.length > 0) return results;
  }
  return [];
}

export interface DeepRetrievalResult {
  webResults: WebSearchResult[];
  images: ImageResult[];
  videos: VideoResult[];
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Dedupe web results by normalized URL while counting how many of the parallel
 * searches surfaced each one; results seen by more searches rank higher.
 */
function dedupeAndRerank(resultGroups: WebSearchResult[][]): WebSearchResult[] {
  const byUrl = new Map<string, { result: WebSearchResult; hits: number; firstIndex: number }>();
  let order = 0;

  for (const group of resultGroups) {
    for (const result of group) {
      if (!result?.url) continue;
      const key = normalizeUrl(result.url);
      const existing = byUrl.get(key);
      if (existing) {
        existing.hits += 1;
      } else {
        byUrl.set(key, { result, hits: 1, firstIndex: order++ });
      }
    }
  }

  return Array.from(byUrl.values())
    // More cross-query hits first; ties keep original discovery order.
    .sort((a, b) => (b.hits - a.hits) || (a.firstIndex - b.firstIndex))
    .map((entry) => entry.result)
    .slice(0, MAX_DEEP_SOURCES);
}

function dedupeImages(imageGroups: ImageResult[][]): ImageResult[] {
  const seen = new Set<string>();
  const out: ImageResult[] = [];
  for (const group of imageGroups) {
    for (const img of group) {
      if (!img?.url || seen.has(img.url)) continue;
      seen.add(img.url);
      out.push(img);
    }
  }
  return out.slice(0, 12);
}

/**
 * Fetch all three expanded queries in parallel and merge into a deduped,
 * reranked source set. Never throws — a failed sub-search just contributes
 * nothing.
 */
export async function executeDeepRetrieval(
  queries: ExpandedQueries,
  opts: { skipSerpApiImages?: boolean } = {}
): Promise<DeepRetrievalResult> {
  // One engine per angle, all in parallel, so no engine is hit twice at once:
  //   principal → Tavily Deep (advanced) · expansion → Exa · contrapunto → Brave
  // An angle whose engine fails or comes back empty falls back to the other engines
  // (the per-engine pacer spaces any repeat call 1s apart).
  const tavily = (q: string) => searchTavilyDeep(q);
  const exa = (q: string) => searchExa(q, 10);
  const brave = (q: string) => searchBraveWeb(q);
  const [principalGroup, expansionGroup, contraGroup, imgPrincipal, imgExpansion, vids] =
    await Promise.all([
      firstNonEmpty(queries.principal, [tavily, exa, brave]),
      firstNonEmpty(queries.expansion, [exa, tavily, brave]),
      firstNonEmpty(queries.contrapunto, [brave, exa, tavily]),
      searchImages(queries.principal, { skipSerpApi: opts.skipSerpApiImages }).catch(() => [] as ImageResult[]),
      searchImages(queries.expansion, { skipSerpApi: opts.skipSerpApiImages }).catch(() => [] as ImageResult[]),
      searchVideos(queries.principal).catch(() => [] as VideoResult[]),
    ]);

  const webGroups = [principalGroup, expansionGroup, contraGroup];
  const webResults = dedupeAndRerank(webGroups);
  const images = dedupeImages([imgPrincipal, imgExpansion]);

  logger.info('DeepRetrieval: completed', {
    rawCounts: {
      principal: principalGroup.length,
      expansion: expansionGroup.length,
      contrapunto: contraGroup.length,
    },
    dedupedWebCount: webResults.length,
    imageCount: images.length,
    videoCount: vids.length,
  });

  return { webResults, images, videos: vids };
}
