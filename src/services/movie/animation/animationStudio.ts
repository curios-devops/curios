// Animation (Video page type): asks the animation-studio edge function for the question's live stage.
// One per question, kept by the server: an animation already made opens at once; a new one is written
// by Luna/Sol/Astra in the background (1-3 minutes) while the page polls. Once written, the studio has it
// recorded once in the cloud (Cloud Run) as a video everyone shares.
import { supabase } from '../../../lib/supabase.ts';
import type { StageTheme } from './stage.ts';

export interface Animation {
  question: string;
  kind: 'machine' | 'story' | 'simulation';
  style: string;
  model: string;
  html: string;
  /** The story's own colours (its archetype's palette); machines, simulations and older animations have none. */
  stage?: StageTheme | null;
  /** The cloud recording: its video and picture once ready; render is queued / ready / failed (null: not asked). */
  videoUrl?: string | null;
  posterUrl?: string | null;
  render?: 'queued' | 'ready' | 'failed' | null;
}

type Answer = { ready?: boolean; animation?: Animation; left?: number; status?: string; error?: unknown };

async function call(body: Record<string, unknown>): Promise<Answer> {
  const { data, error } = await supabase.functions.invoke('animation-studio', { body });
  if (error) {
    // The function's own error code (sign_in_required, daily_limit…) travels in the response body.
    const ctx = (error as { context?: Response }).context;
    const detail = ctx ? await ctx.json().catch(() => null) : null;
    throw new Error(String((detail as { error?: unknown } | null)?.error ?? error.message));
  }
  return data as Answer;
}

/** The animation already made for this question, or how many new ones the viewer may still make today. */
export async function findAnimation(key: string): Promise<{ animation: Animation | null; making: boolean; left: number }> {
  const a = await call({ action: 'lookup', key });
  return { animation: a.ready && a.animation ? a.animation : null, making: a.status === 'making', left: a.left ?? 1 };
}

/** Starts it (unless it's already being made) and waits until the page is written. `lang`: the words' language
 *  when the question shows none of its own (a name, one word). */
export async function makeAnimation(key: string, question: string, tier: 'luna' | 'sol' | 'astra', signal: AbortSignal, already = false, kind?: 'simulation', lang?: string): Promise<Animation> {
  if (!already) {
    const started = await call({ action: 'start', key, question, tier, kind, lang });
    if (started.ready && started.animation) return started.animation;
  }
  return waitFor(key, signal);
}

/** The same animation re-composed for a phone held upright (same narration and steps); made once, then kept. */
export async function portraitAnimation(key: string, signal: AbortSignal): Promise<Animation> {
  const portraitKey = `${key}|portrait`;
  const started = await call({ action: 'portrait', key: portraitKey });
  if (started.ready && started.animation) return started.animation;
  return waitFor(portraitKey, signal);
}

/** Polls until the page for `key` is written. */
async function waitFor(key: string, signal: AbortSignal): Promise<Animation> {
  for (let i = 0; i < 200 && !signal.aborted; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 15000 : 4000));
    if (signal.aborted) break;
    const s = await call({ action: 'status', key }).catch(() => ({ status: 'making' }) as Answer);
    if (s.ready && s.animation) return s.animation;
    if (s.status === 'failed') throw new Error('failed');
  }
  throw new Error(signal.aborted ? 'aborted' : 'The animation took too long');
}

type Signed = { url: string; fields: Record<string, string> };

/** Uploads one file straight to Cloudinary with fields signed by the studio; XHR, for upload progress. */
export function uploadSigned(target: Signed, file: Blob, onProgress?: (done: number) => void): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(target.fields)) form.append(k, v);
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', target.url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
    xhr.onload = () => (xhr.status < 300 ? resolve(String(JSON.parse(xhr.responseText).secure_url)) : reject(new Error(`Cloudinary ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('Cloudinary upload failed'));
    xhr.send(form);
  });
}

/** The cloud recorder's report (render page): signed uploads, then done or failed. */
export async function renderReport(body: Record<string, unknown>): Promise<{ video?: Signed; poster?: Signed }> {
  const { data, error } = await supabase.functions.invoke('animation-studio', { body });
  if (error) throw new Error(error.message);
  return data;
}

/**
 * A signed-in viewer's animation as their movie (video_mode 'animation', private): made when they open it,
 * so it is in their history and has a short /v/ link at once; the video arrives with the cloud recording.
 * Save puts it in their Space; Post publishes it to the feed.
 */
export interface AnimationMovie { id: string; saved: boolean; posted: boolean; videoUrl: string | null }

export async function animationMovie(o: { userId: string; key: string; question: string; title: string; summary: string; narrative: string; beats: number; videoUrl?: string | null; posterUrl?: string | null }): Promise<AnimationMovie> {
  const pick = 'id, saved, is_public, full_video_url';
  const toMovie = (r: { id: unknown; saved: boolean; is_public: boolean; full_video_url: string | null }) => ({ id: String(r.id), saved: r.saved, posted: r.is_public, videoUrl: r.full_video_url });
  const { data: found } = await supabase.from('movie_projects').select(pick).eq('user_id', o.userId).eq('animation_key', o.key).maybeSingle();
  if (found) {
    if (!found.full_video_url && o.videoUrl) {
      await supabase.from('movie_projects').update({ full_video_url: o.videoUrl, thumbnail_url: o.posterUrl ?? null, status: 'complete' }).eq('id', found.id);
      return { ...toMovie(found), videoUrl: o.videoUrl };
    }
    return toMovie(found);
  }
  const { data, error } = await supabase.from('movie_projects').insert({
    user_id: o.userId, animation_key: o.key, question: o.question, title: o.title, description: o.summary, narrative: o.narrative,
    scene_count: o.beats, video_mode: 'animation', status: o.videoUrl ? 'complete' : 'rendering',
    full_video_url: o.videoUrl ?? null, thumbnail_url: o.posterUrl ?? null, viral: { title: o.title, caption: o.summary, hashtags: [] },
  }).select(pick).single();
  if (error) throw error;
  return toMovie(data);
}

/** Save (their Space) and Post (the public feed; posting also saves). */
export async function markAnimationMovie(id: string, change: { saved?: boolean; posted?: boolean }): Promise<void> {
  const { error } = await supabase.from('movie_projects').update({
    ...(change.saved !== undefined ? { saved: change.saved } : {}),
    ...(change.posted !== undefined ? { is_public: change.posted, ...(change.posted ? { saved: true } : {}) } : {}),
  }).eq('id', id);
  if (error) throw error;
}

/** A video the viewer's browser recorded (the cloud recording failed) goes onto their movie. */
export async function uploadOwnRecording(o: { key: string; movieId: string; video: Blob; poster: Blob | null }): Promise<string> {
  const { data, error } = await supabase.functions.invoke('animation-studio', { body: { action: 'upload', key: o.key } });
  if (error || !data?.video) throw new Error('upload not signed');
  const [videoUrl, posterUrl] = await Promise.all([uploadSigned(data.video, o.video), o.poster ? uploadSigned(data.poster, o.poster).catch(() => null) : null]);
  await supabase.from('movie_projects').update({ full_video_url: videoUrl, thumbnail_url: posterUrl, status: 'complete' }).eq('id', o.movieId);
  return videoUrl;
}
