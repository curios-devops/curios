// Per-engine pacing: two calls to the SAME search engine start a gap apart, app-wide
// (Brave's plan allows 1 req/s and Tavily gets the same courtesy; Exa allows ~5 req/s).
// Different engines never wait on each other, so parallel Exa + Tavily stays parallel.

export type SearchEngine = 'exa' | 'tavily' | 'brave';

const MIN_GAP_MS: Record<SearchEngine, number> = { exa: 250, tavily: 1000, brave: 1000 };
const nextSlot: Record<SearchEngine, number> = { exa: 0, tavily: 0, brave: 0 };

export async function paced<T>(engine: SearchEngine, call: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const start = Math.max(now, nextSlot[engine]);
  nextSlot[engine] = start + MIN_GAP_MS[engine]; // reserve the slot before awaiting, so concurrent callers queue up
  if (start > now) await new Promise((resolve) => setTimeout(resolve, start - now));
  return call();
}
