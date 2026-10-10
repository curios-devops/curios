// Paragraph-by-paragraph narration: the first paragraph starts playing as soon as its
// audio is ready while the next one is generated in the background (a lightweight
// stream). stop() aborts pending TTS requests and closes playback — call it when the
// user leaves the page so no more audio is generated.
//
// Plays through Web Audio: the AudioContext is created inside the tap, and once a
// context is resumed in a user gesture, later buffers play without being blocked
// (mobile browsers block HTMLAudioElement.play() that arrives seconds after the tap).

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Split markdown into narratable chunks (markdown symbols stripped): one per paragraph,
 * except the first sentence goes alone so the first audio is short and starts quickly.
 */
export function toParagraphs(markdown: string): string[] {
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((p) => p.replace(/<[^>]*>/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const first = paragraphs[0];
  const cut = first ? first.search(/[.!?…](\s|$)/) : -1;
  if (cut > 0 && cut < first.length - 2) {
    paragraphs.splice(0, 1, first.slice(0, cut + 1), first.slice(cut + 1).trim());
  }
  return paragraphs;
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

async function tts(text: string, voiceId: string, gender: 'female' | 'male', signal: AbortSignal): Promise<ArrayBuffer> {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` };
  const post = (fn: string, body: object) =>
    fetch(`${SUPABASE_URL}/functions/v1/${fn}`, { method: 'POST', headers, body: JSON.stringify(body), signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${fn} ${r.status}`))));
  try {
    // v4 Turbo: same generation as eleven_v4, much faster first audio for live reading.
    const d = await post('elevenlabs-tts', { text, voiceId, stability: 0.45, similarityBoost: 0.75, style: 0.4, modelId: 'eleven_v4_turbo' });
    if (d.audio) return base64ToBuffer(d.audio);
  } catch (e) {
    if (signal.aborted) throw e;
  }
  // Fallback: OpenAI TTS with a voice of the same gender.
  const d = await post('openai-tts', { text, voice: gender === 'male' ? 'onyx' : 'nova', speed: 1, model: 'tts-1-hd' });
  const b64 = d.audioBase64 || d.audio;
  if (b64) return base64ToBuffer(b64);
  const url = d.audioUrl || d.url;
  if (!url) throw new Error('No audio');
  return fetch(url, { signal }).then((r) => r.arrayBuffer());
}

export type NarratorState = 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export class ParagraphNarrator {
  private ctx: AudioContext;
  private controller = new AbortController();
  private pending = new Map<number, Promise<ArrayBuffer>>();
  private source: AudioBufferSourceNode | null = null;
  private stopped = false;

  /** Construct synchronously inside the tap handler (before any await). */
  constructor(
    private paragraphs: string[],
    private voiceId: string,
    private gender: 'female' | 'male',
    private onState: (state: NarratorState) => void,
  ) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    void this.ctx.resume();
  }

  private fetchAt(i: number): Promise<ArrayBuffer> | undefined {
    if (i >= this.paragraphs.length) return undefined;
    if (!this.pending.has(i)) this.pending.set(i, tts(this.paragraphs[i], this.voiceId, this.gender, this.controller.signal));
    return this.pending.get(i);
  }

  async start(i = 0): Promise<void> {
    if (this.stopped) return;
    const next = this.fetchAt(i);
    if (!next) { this.onState('ended'); return; }
    this.onState('loading');
    try {
      const buffer = await this.ctx.decodeAudioData(await next);
      if (this.stopped) return;
      void this.fetchAt(i + 1); // generate the next paragraph while this one plays
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.ctx.destination);
      source.onended = () => { if (this.source === source) void this.start(i + 1); };
      this.source = source;
      source.start();
      this.onState(this.ctx.state === 'suspended' ? 'paused' : 'playing');
    } catch {
      if (!this.stopped) this.onState('error');
    }
  }

  pause() { void this.ctx.suspend().then(() => this.onState('paused')); }
  resume() { void this.ctx.resume().then(() => this.onState('playing')); }

  /** Abort pending generation and close playback (leaving the page). */
  stop() {
    this.stopped = true;
    this.controller.abort();
    this.source = null;
    void this.ctx.close().catch(() => {});
  }
}
