// Finished searches kept for this visit, so coming back to a Search (e.g. from a song it
// opened) shows it again instantly — no new LLM or search-service calls. Memory first,
// sessionStorage as backup (mobile browsers may reload a backgrounded tab).
const STORAGE_KEY = 'curios_search_cache';
const MAX_ENTRIES = 8;
const TTL_MS = 30 * 60 * 1000;

type Entry<T> = { at: number; value: T };
const memory = new Map<string, Entry<unknown>>();

function readStorage(): Record<string, Entry<unknown>> {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}; } catch { return {}; }
}

export function getCached<T>(key: string): { at: number; value: T } | null {
  const hit = memory.get(key) ?? readStorage()[key];
  if (!hit || Date.now() - hit.at > TTL_MS) return null;
  return hit as Entry<T>;
}

export function setCached<T>(key: string, value: T, at = Date.now()) {
  const entry = { at, value };
  memory.set(key, entry);
  if (memory.size > MAX_ENTRIES) memory.delete(memory.keys().next().value as string);
  try {
    const all = { ...readStorage(), [key]: entry };
    const keep = Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ENTRIES);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(keep)));
  } catch { /* storage full or blocked: memory still works */ }
}
