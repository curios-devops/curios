// Paragraph-by-paragraph narration: the first paragraph starts playing as soon as its
// audio is ready while the next one is generated in the background (a lightweight
// stream). stop() aborts pending TTS requests and closes playback — call it when the
// user leaves the page so no more audio is generated.
//
// Plays through Web Audio: the AudioContext is created inside the tap, and once a
// context is resumed in a user gesture, later buffers play without being blocked
// (mobile browsers block HTMLAudioElement.play() that arrives seconds after the tap).
//
// iOS plays Web Audio in the "ambient" session, which the silent switch mutes — the
// narration was only audible once the trailer's <video> was unmuted. In the tap we ask
// for the "playback" session (Safari 16.4+) and, for older iOS, loop a silent <audio>
// element, which also moves the page to "playback".

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Markdown → plain-text paragraphs (links keep their text; symbols and HTML removed). */
function cleanParagraphs(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map((p) => p.replace(/<[^>]*>/g, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Split markdown into narratable chunks (markdown symbols stripped): one per paragraph,
 * except the first sentence goes alone so the first audio is short and starts quickly.
 */
export function toParagraphs(markdown: string): string[] {
  const paragraphs = cleanParagraphs(markdown);
  const first = paragraphs[0];
  const cut = first ? first.search(/[.!?…](\s|$)/) : -1;
  if (cut > 0 && cut < first.length - 2) {
    paragraphs.splice(0, 1, first.slice(0, cut + 1), first.slice(cut + 1).trim());
  }
  return paragraphs;
}

// A sentence shorter than this rides with the next one (fewer, more natural TTS calls).
const MIN_SENTENCE = 40;

/**
 * Sentence-sized chunks (Magazine): the first audio starts sooner, and leaving the page
 * wastes at most the one sentence prepared ahead. Citation markers ("[elpais]") are not
 * read. A sentence ends at . ! ? … followed by a space, so "1.153,11" stays whole.
 */
export function toSentences(markdown: string): string[] {
  const out: string[] = [];
  for (const paragraph of cleanParagraphs(markdown.replace(/\s*\[[^\]]*\](?!\()/g, ''))) {
    const parts = paragraph.split(/([.!?…]+["'”»)]*)\s+/);
    const sentences: string[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const s = `${parts[i]}${parts[i + 1] ?? ''}`.trim();
      if (s) sentences.push(s);
    }
    let carry = '';
    const start = out.length;
    for (const s of sentences) {
      carry = carry ? `${carry} ${s}` : s;
      if (carry.length >= MIN_SENTENCE) { out.push(carry); carry = ''; }
    }
    // A short tail joins the paragraph's last chunk; alone (e.g. a heading) it stays alone.
    if (carry) {
      if (out.length > start) out[out.length - 1] += ` ${carry}`;
      else out.push(carry);
    }
  }
  return out;
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

// 0.1 s of 16-bit mono silence as a WAV blob URL (the CSP allows blob: media, not data:).
function silentWav(): string {
  const samples = 800;
  const buf = new DataView(new ArrayBuffer(44 + samples * 2));
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) buf.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); buf.setUint32(4, 36 + samples * 2, true); str(8, 'WAVEfmt ');
  buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true);
  buf.setUint32(24, 8000, true); buf.setUint32(28, 16000, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true);
  str(36, 'data'); buf.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf.buffer], { type: 'audio/wav' }));
}

// 'held' = a paragraph finished and autoAdvance said stop (Cinematic with autoplay off).
export type NarratorState = 'loading' | 'playing' | 'paused' | 'held' | 'ended' | 'error';

export class ParagraphNarrator {
  private ctx: AudioContext;
  private controller = new AbortController();
  private pending = new Map<number, Promise<ArrayBuffer>>();
  private source: AudioBufferSourceNode | null = null;
  private stopped = false;
  private keepAlive: HTMLAudioElement | null = null;
  private gain: GainNode;

  /** Construct synchronously inside the tap handler (before any await). */
  constructor(
    private paragraphs: string[],
    private voiceId: string,
    private gender: 'female' | 'male',
    private onState: (state: NarratorState) => void,
    /** Fires as each paragraph starts playing, with its audio length (Cinematic syncs shots to it). */
    private onParagraph?: (index: number, durationSec: number) => void,
    /** Asked when a paragraph ends: false holds there instead of playing the next one. */
    private autoAdvance?: () => boolean,
  ) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = 'playback';
    try {
      this.keepAlive = new Audio(silentWav());
      this.keepAlive.loop = true;
      void this.keepAlive.play().catch(() => {});
    } catch { /* no HTMLAudioElement */ }
    this.ctx = new Ctx();
    this.gain = this.ctx.createGain();
    this.gain.connect(this.ctx.destination);
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
      source.connect(this.gain);
      source.onended = () => {
        if (this.source !== source) return;
        if (this.autoAdvance && !this.autoAdvance() && i + 1 < this.paragraphs.length) this.onState('held');
        else void this.start(i + 1);
      };
      this.source = source;
      source.start();
      this.onParagraph?.(i, buffer.duration);
      this.onState(this.ctx.state === 'suspended' ? 'paused' : 'playing');
    } catch {
      if (!this.stopped) this.onState('error');
    }
  }

  /** 0–1; 0 mutes. */
  setVolume(v: number) { this.gain.gain.value = Math.max(0, Math.min(1, v)); }

  pause() { void this.ctx.suspend().then(() => this.onState('paused')); }
  resume() { void this.ctx.resume().then(() => this.onState('playing')); }

  /** Abort pending generation and close playback (leaving the page). */
  stop() {
    this.stopped = true;
    this.controller.abort();
    this.source = null;
    if (this.keepAlive) { this.keepAlive.pause(); URL.revokeObjectURL(this.keepAlive.src); }
    this.keepAlive = null;
    void this.ctx.close().catch(() => {});
  }
}
