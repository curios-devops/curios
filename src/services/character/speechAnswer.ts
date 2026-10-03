// Half-body (Anam) answers: no director, no actions — just a spoken reply
// streamed straight into the avatar as the LLM writes it, then 3 suggestions
// after a separator line.

import { executeWebSearch, type WebSearchResult } from '../search/providers/webSearchProvider';
import { buildSourcesText, streamLLMText } from '../search/providers/llmProvider';
import { mark } from './timing';

export const SUGGESTIONS_MARKER = '§§';

/**
 * Splits a growing LLM stream into speech (forwarded live) and the trailing
 * suggestions block. Holds back a character so a marker split across two
 * chunks is never spoken.
 */
export class SpeechSplitter {
  private buf = '';
  private sent = 0;
  private done = false;
  constructor(private emit: (speech: string) => void) {}

  feed(chunk: string) {
    if (this.done) { this.buf += chunk; return; }
    this.buf += chunk;
    const at = this.buf.indexOf(SUGGESTIONS_MARKER);
    const safeEnd = at >= 0 ? at : Math.max(this.sent, this.buf.length - (SUGGESTIONS_MARKER.length - 1));
    if (safeEnd > this.sent) {
      this.emit(this.buf.slice(this.sent, safeEnd));
      this.sent = safeEnd;
    }
    if (at >= 0) this.done = true;
  }

  /** Flush remaining speech (no marker arrived) and return the parts. */
  finish(): { speech: string; suggestions: string[] } {
    const at = this.buf.indexOf(SUGGESTIONS_MARKER);
    if (at < 0 && this.buf.length > this.sent) this.emit(this.buf.slice(this.sent));
    const speech = (at >= 0 ? this.buf.slice(0, at) : this.buf).trim();
    let suggestions: string[] = [];
    if (at >= 0) {
      try {
        const parsed = JSON.parse(this.buf.slice(at + SUGGESTIONS_MARKER.length).match(/\[[\s\S]*\]/)?.[0] ?? '[]');
        suggestions = Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string').slice(0, 3) : [];
      } catch { suggestions = []; }
    }
    return { speech, suggestions };
  }
}

export async function speakAnswer(params: {
  question: string;
  name: string;
  history: Array<{ role: 'user' | 'character'; text: string }>;
  locale: string;
  onSpeech: (text: string) => void;
}): Promise<{ speech: string; suggestions: string[]; sources: WebSearchResult[] }> {
  const { question, name, history, locale, onSpeech } = params;
  mark('anam answer: web search → start');
  const sources = (await executeWebSearch(question).catch(() => [])).slice(0, 6);
  mark('anam answer: web search ← done', { results: sources.length });

  const prompt = `You are ${name}, a warm presenter answering out loud in a live video call.

Conversation so far:
${history.slice(-6).map((h) => `${h.role === 'user' ? 'User' : name}: ${h.text}`).join('\n') || '(none)'}

User asks: "${question}"

Search Results:
${buildSourcesText(sources)}

Answer in language "${locale}" in 40–80 spoken words: direct, accurate, grounded in the sources, natural sentences. No markdown, no emojis, no URLs, no citations, no lists.
Then on a new line write exactly ${SUGGESTIONS_MARKER} followed by a JSON array of 3 short follow-up questions in language "${locale}".`;

  const splitter = new SpeechSplitter(onSpeech);
  let first = true;
  await streamLLMText(prompt, 700, (chunk) => {
    if (first) { mark('anam answer: first LLM token'); first = false; }
    splitter.feed(chunk);
  }, 45000, undefined, 'minimal');
  const out = splitter.finish();
  mark('anam answer: LLM ← done');
  return { ...out, sources };
}
