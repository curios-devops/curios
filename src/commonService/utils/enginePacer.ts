// Per-engine pacing: two calls to the SAME search engine start at least 1s apart,
// app-wide (Brave's plan allows 1 req/s; Exa and Tavily get the same courtesy).
// Different engines never wait on each other, so parallel Exa + Tavily stays parallel.

export type SearchEngine = 'exa' | 'tavily' | 'brave';

const MIN_GAP_MS = 1000;
const nextSlot: Record<SearchEngine, number> = { exa: 0, tavily: 0, brave: 0 };

export async function paced<T>(engine: SearchEngine, call: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const start = Math.max(now, nextSlot[engine]);
  nextSlot[engine] = start + MIN_GAP_MS; // reserve the slot before awaiting, so concurrent callers queue up
  if (start > now) await new Promise((resolve) => setTimeout(resolve, start - now));
  return call();
}
