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
}
export interface StockClip {
  id: number;
  url: string;
  width: number;
  height: number;
  duration: number;
  credit: string;
  pageUrl: string;
}
export interface CinematicScene extends CinematicShot {
  clip: StockClip;
}

export const MIN_SHOTS = 3;
export const MAX_SHOTS = 6;
const MAX_NARRATION = 220;

/** Keeps only usable shots and caps the film's length; null when it can't make a film. */
export function validatePlan(raw: unknown): CinematicPlan | null {
  const r = raw as { title?: unknown; shots?: unknown } | null;
  if (!r || !Array.isArray(r.shots)) return null;
  const shots = r.shots
    .map((s) => s as { narration?: unknown; search?: unknown })
    .filter((s) => typeof s.narration === 'string' && typeof s.search === 'string')
    .map((s) => ({ narration: (s.narration as string).trim().slice(0, MAX_NARRATION), search: (s.search as string).trim().slice(0, 60) }))
    .filter((s) => s.narration.length > 0 && s.search.length > 0)
    .slice(0, MAX_SHOTS);
  if (shots.length < MIN_SHOTS) return null;
  return { title: typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 90) : '', shots };
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
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

export async function planCinematic(question: string): Promise<CinematicPlan> {
  const raw = await callMovieLLMJson<unknown>(
    'You are a documentary director making a 30-45 second short film out of real stock footage. ' +
      'Plan 5 shots that tell a clear story with a beginning, a middle and an end. ' +
      'Each shot has one narration sentence (12-24 words, factual, in the same language as the question) ' +
      'and one stock-footage search: 2-4 concrete English words describing what the camera sees ' +
      '(e.g. "barcelona aerial city", "sagrada familia facade") — never abstract ideas, text, logos or charts.',
    `Question: ${question}`,
    { title: 'short film title in the question language', shots: '[{narration, search}]' },
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
