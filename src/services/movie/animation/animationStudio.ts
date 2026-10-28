// Animation (Video page type): asks the animation-studio edge function for the question's live stage.
// One per question, kept by the server: an animation already made opens at once; a new one is written
// by Luna/Sol/Astra in the background (1-3 minutes) while the page polls.
import { supabase } from '../../../lib/supabase.ts';

export interface Animation {
  question: string;
  kind: 'machine' | 'story' | 'simulation';
  style: string;
  model: string;
  html: string;
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

/** Starts it (unless it's already being made) and waits until the page is written. */
export async function makeAnimation(key: string, question: string, tier: 'luna' | 'sol' | 'astra', signal: AbortSignal, already = false, kind?: 'simulation'): Promise<Animation> {
  if (!already) {
    const started = await call({ action: 'start', key, question, tier, kind });
    if (started.ready && started.animation) return started.animation;
  }
  for (let i = 0; i < 200 && !signal.aborted; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 15000 : 4000));
    if (signal.aborted) break;
    const s = await call({ action: 'status', key }).catch(() => ({ status: 'making' }) as Answer);
    if (s.ready && s.animation) return s.animation;
    if (s.status === 'failed') throw new Error('failed');
  }
  throw new Error(signal.aborted ? 'aborted' : 'The animation took too long');
}

export interface SavedAnimation { id: string; videoUrl: string; posterUrl: string | null }

/**
 * The recorded video and its preview picture go straight to Cloudinary (signed by the studio), and the
 * video is kept as the viewer's movie (video_mode 'animation'): their history, its share page and the feed.
 */
export async function saveAnimationVideo(o: {
  key: string; userId: string; question: string; title: string; summary: string; narrative: string;
  beats: number; seconds: number; aspect: string; video: Blob; poster: Blob | null;
  /** Share of the video uploaded so far (0-1). */
  onProgress?: (done: number) => void;
}): Promise<SavedAnimation> {
  const { data, error } = await supabase.functions.invoke('animation-studio', { body: { action: 'upload', key: o.key } });
  if (error || !data?.video) throw new Error('upload not signed');
  // XHR rather than fetch: it reports upload progress.
  const upload = (target: { url: string; fields: Record<string, string> }, file: Blob, onProgress?: (done: number) => void) =>
    new Promise<string>((resolve, reject) => {
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
  const [videoUrl, posterUrl] = await Promise.all([upload(data.video, o.video, o.onProgress), o.poster ? upload(data.poster, o.poster).catch(() => null) : null]);
  const { data: row, error: saveError } = await supabase.from('movie_projects').insert({
    user_id: o.userId, question: o.question, title: o.title, description: o.summary, narrative: o.narrative,
    full_video_url: videoUrl, thumbnail_url: posterUrl, scene_count: o.beats, duration_seconds: Math.round(o.seconds),
    aspect_ratio: o.aspect, video_mode: 'animation', status: 'complete', viral: { title: o.title, caption: o.summary, hashtags: [] },
  }).select('id').single();
  if (saveError) throw saveError;
  return { id: String(row.id), videoUrl, posterUrl };
}
