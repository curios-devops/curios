// Captions strip helpers. Half body (Anam) gets exact text as it is spoken;
// full body (Vivix) only reports start/stop of speech, so its captions are an
// approximation: words revealed at a natural speaking pace from the moment the
// presenter starts talking (then the full line once it stops).

export const WORDS_PER_SECOND = 2.6;

/** The part of `text` a viewer should have heard `elapsedMs` after speech began. */
export function revealWords(text: string, elapsedMs: number, wps = WORDS_PER_SECOND): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const n = Math.min(words.length, Math.max(0, Math.floor((elapsedMs / 1000) * wps)));
  return words.slice(0, n).join(' ');
}

/** Keep the strip short: only the tail that fits ~2–3 lines. */
export function captionTail(text: string, maxChars = 200): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(text.length - maxChars);
  return '…' + cut.slice(cut.indexOf(' ') + 1);
}
