// Cinematic (real-footage montage) for the Video page. The director plans a short film as a
// shot list — one narrated sentence + one stock-footage search per shot — then each shot gets
// its own Pexels clip (free for commercial use; we still credit the videographer).
// The model only writes words and search terms; sizes, timing and layout are decided in code.
import { supabase } from '../../../lib/supabase.ts';
import { callMovieLLMJson } from '../core/llm.ts';

export interface CinematicShot {
  narration: string;
  search: string;
}
export interface CinematicPlan {
  title: string;
  shots: CinematicShot[];
  /** Up to 4 follow-up questions for "Continue exploring". */
  related: string[];
}
export interface StockClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  credit: string;
  pageUrl: string;
  /** Pexels poster frame (shot rail thumbnail). */
  image: string;
}
export interface CinematicScene extends CinematicShot {
  clip: StockClip;
}

export const MIN_SHOTS = 3;
export const MAX_SHOTS = 6;
const MAX_NARRATION = 220;

// How to say it: ElevenLabs v4 reads bracketed audio tags in the script as delivery directions
// (no SSML; `speed` is ignored — verified 2026-10-21). The director may use only these,
// documented by ElevenLabs and tested in Spanish with eleven_v4_turbo (never read aloud).
// Anything else is dropped: an unknown tag can come out as a sound effect.
export const DELIVERY_TAGS = [
  'excited', 'curious', 'awe', 'serious', 'warm', 'playful',
  'whispers', 'softly', 'shouts',
  'slowly', 'drawn out', 'rushed', 'pause', 'long pause',
  'laughs', 'sighs',
] as const;

/** Keeps only allowed delivery tags (lower-cased) and tidies the spacing around them. */
export function cleanDelivery(text: string): string {
  return text
    .replace(/\[([^\]]{1,24})\]/g, (_m, tag: string) => {
      const t = tag.trim().toLowerCase();
      return (DELIVERY_TAGS as readonly string[]).includes(t) ? `[${t}]` : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** What the captions and the page show: the words, without the delivery tags. */
export function captionText(narration: string): string {
  return narration.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
}

/** Keeps only usable shots and caps the film's length; null when it can't make a film. */
export function validatePlan(raw: unknown): CinematicPlan | null {
  const r = raw as { title?: unknown; shots?: unknown } | null;
  // Faster models sometimes return the list as JSON text inside a string.
  let list = r?.shots;
  if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = null; } }
  if (!r || !Array.isArray(list)) return null;
  const shots = list
    .map((s) => s as { narration?: unknown; search?: unknown })
    .filter((s) => typeof s.narration === 'string' && typeof s.search === 'string')
    .map((s) => {
      // Tags don't count toward the caption limit; a script too long loses its tags first.
      let narration = cleanDelivery(s.narration as string);
      if (captionText(narration).length > MAX_NARRATION) narration = captionText(narration).slice(0, MAX_NARRATION);
      return { narration, search: (s.search as string).trim().slice(0, 60) };
    })
    .filter((s) => captionText(s.narration).length > 0 && s.search.length > 0)
    .slice(0, MAX_SHOTS);
  if (shots.length < MIN_SHOTS) return null;
  let related = (r as { related?: unknown }).related;
  if (typeof related === 'string') { try { related = JSON.parse(related); } catch { related = []; } }
  return {
    title: typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 90) : '',
    shots,
    related: Array.isArray(related) ? related.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim().slice(0, 90)).slice(0, 4) : [],
  };
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image?: string;
  user?: { name?: string };
  video_files: { width: number; height: number; link: string; file_type: string }[];
}

/** Best clip for a 16:9 player: landscape, HD (not 4K — it has to stream), long enough, unused. */
export function pickClip(videos: PexelsVideo[], used: Set<number>): StockClip | null {
  const scored = videos
    .filter((v) => !used.has(v.id))
    .map((v) => {
      const files = v.video_files.filter((f) => f.file_type === 'video/mp4' && f.width >= 960 && f.width > f.height);
      const file = files.sort((a, b) => Math.abs(a.width - 1280) - Math.abs(b.width - 1280))[0];
      const score = (v.width > v.height ? 2 : 0) + (v.duration >= 5 ? 1 : 0) + (v.duration <= 40 ? 1 : 0);
      return { v, file, score };
    })
    .filter((c) => c.file)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best?.file) return null;
  return {
    id: best.v.id,
    url: best.file.link,
    width: best.file.width,
    height: best.file.height,
    duration: best.v.duration,
    credit: best.v.user?.name || 'Pexels',
    pageUrl: best.v.url,
    image: best.v.image || '',
  };
}

/**
 * Splits narration into caption cards: at most `maxLines` lines of at most `maxChars`
 * characters, breaking between words. Fixed limits are what keeps captions readable.
 */
export function captionChunks(text: string, maxChars = 42, maxLines = 2): string[][] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) line = word;
    else if (line.length + 1 + word.length <= maxChars) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) chunks.push(lines.slice(i, i + maxLines));
  return chunks;
}

/**
 * Caption type scale for a player `width` px wide: font 3.6% of the width (15–30px) and as
 * many characters per line as fit in 86% of it (24–42), so two lines never wrap into three.
 */
export function captionFit(width: number): { fontPx: number; maxChars: number } {
  const fontPx = Math.round(Math.min(30, Math.max(15, width * 0.036)));
  // ~0.62em per semibold character, minus the plate's 1em of side padding.
  const maxChars = Math.min(42, Math.max(24, Math.floor((width * 0.86 - fontPx) / (fontPx * 0.62))));
  return { fontPx, maxChars };
}

/** Which caption card is on screen `elapsed` seconds into a shot lasting `duration`. */
export function chunkAt(chunks: string[][], elapsed: number, duration: number): number {
  if (chunks.length <= 1 || duration <= 0) return 0;
  const weights = chunks.map((c) => c.join(' ').length);
  const total = weights.reduce((a, b) => a + b, 0);
  let t = 0;
  for (let i = 0; i < chunks.length; i++) {
    t += (weights[i] / total) * duration;
    if (elapsed < t) return i;
  }
  return chunks.length - 1;
}

/** `context`: fresh web results (Exa) so the narration is current and grounded. */
export async function planCinematic(question: string, context: { title: string; snippet: string }[] = []): Promise<CinematicPlan> {
  const facts = context.slice(0, 6).map((c, i) => `[${i + 1}] ${c.title}: ${c.snippet.slice(0, 300)}`).join('\n');
  const raw = await callMovieLLMJson<unknown>(
    'You are a documentary director making a 30-45 second short film out of real stock footage. ' +
      'Plan 5 shots that tell a clear story with a beginning, a middle and an end. ' +
      'Each shot has one narration sentence (12-24 words, factual, in the same language as the question) ' +
      'and one stock-footage search: 2-4 concrete English words describing what the camera sees ' +
      '(e.g. "barcelona aerial city", "sagrada familia facade") — never abstract ideas, text, logos or charts. ' +
      'When web results are given, base the facts on them (they are recent). Also suggest 4 short follow-up questions ' +
      'the viewer may want to watch next, in the question language. ' +
      'You also direct HOW each line is read aloud: add 0-2 audio tags per narration, in square brackets, ' +
      'placed right before the words they color — e.g. "[curious] Why does it hover? [pause] [excited] Eighty wingbeats a second!". ' +
      `Use only these tags: ${DELIVERY_TAGS.map((t) => `[${t}]`).join(' ')}. One emotion per phrase; ` +
      'vary the delivery across the film (a hushed opening, an excited reveal, a slow, warm ending) and let punctuation help ' +
      '(... slows down, ! adds energy). Tags are not counted in the 12-24 words.',
    facts ? `Question: ${question}\n\nWeb results:\n${facts}` : `Question: ${question}`,
    { title: 'string: short film title in the question language', shots: 'array of objects { narration: string (with optional audio tags), search: string }', related: 'array of 4 strings' },
    0.4,
  );
  const plan = validatePlan(raw);
  if (!plan) throw new Error('The director could not plan this film');
  return plan;
}

async function searchVideos(query: string): Promise<PexelsVideo[]> {
  const { data, error } = await supabase.functions.invoke('pexels-search', {
    body: { query, type: 'videos', perPage: 8, orientation: 'landscape' },
  });
  if (error) throw error;
  return ((data as { videos?: PexelsVideo[] } | null)?.videos) ?? [];
}

/**
 * One distinct clip per shot (searches run in parallel). A shot with no result retries a
 * shorter query; still nothing → it borrows another shot's clip. Fewer than MIN_SHOTS real
 * clips means the footage doesn't fit the story → throw, and the page falls back to Video.
 */
export async function findClips(plan: CinematicPlan): Promise<CinematicScene[]> {
  const results = await Promise.all(plan.shots.map(async (shot) => {
    const first = await searchVideos(shot.search).catch(() => []);
    if (first.length) return first;
    const shorter = shot.search.split(/\s+/).slice(0, 2).join(' ');
    return shorter !== shot.search ? searchVideos(shorter).catch(() => []) : [];
  }));
  const used = new Set<number>();
  const clips = results.map((videos) => {
    const clip = pickClip(videos, used);
    if (clip) used.add(clip.id);
    return clip;
  });
  const found = clips.filter((c): c is StockClip => Boolean(c));
  if (found.length < MIN_SHOTS) throw new Error('Not enough real footage for this story');
  return plan.shots.map((shot, i) => ({ ...shot, clip: clips[i] ?? found[i % found.length] }));
}
