// Reading a JSON reply while it streams: the items of an array that are already complete, and
// string fields already written. Lets the page start work (e.g. painting a swipe's frame) as
// soon as that piece of the reply exists, instead of waiting for the whole reply.

/** Raw text of each complete `{…}` item so far in the array under `key`. */
export function completedItems(text: string, key: string): string[] {
  const at = text.indexOf(`"${key}"`);
  if (at < 0) return [];
  const open = text.indexOf('[', at);
  if (open < 0) return [];
  const items: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) { items.push(text.slice(start, i + 1)); start = -1; } }
    else if (c === ']' && depth === 0) break;
  }
  return items;
}

/** A top-level string field once its closing quote has streamed in; undefined before that. */
export function stringField(text: string, key: string): string | undefined {
  const m = text.match(new RegExp(`"${key}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`));
  if (!m) return undefined;
  try { return JSON.parse(m[1]) as string; } catch { return undefined; }
}
