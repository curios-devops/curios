// The Video page's production technique ("director" decision). The user can pick one in the
// type selector; otherwise Auto asks Decisions (classify-intent, only:"video_style"), which
// chooses among the affordable automatic techniques: cinematic, video, animation.
//
// Fallback chain: any technique that fails or isn't connected → Video (the default);
// if Video can't render a clip, the viewer animates its still frame (Ken Burns).
import { supabase } from '../../lib/supabase.ts';
import type { MovieMode } from './types.ts';

export type VideoType = 'video' | 'cinematic' | 'animation' | 'hd' | 'character' | 'explore';
export type VideoTypeChoice = VideoType | 'auto';

export const VIDEO_TYPES: { id: VideoTypeChoice; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Curios picks the best technique for your question' },
  { id: 'video', label: 'Video', hint: 'New generated scenes' },
  { id: 'cinematic', label: 'Cinematic', hint: 'Real footage montage with narration and captions' },
  { id: 'animation', label: 'Animation', hint: 'Animated explainer' },
  { id: 'hd', label: 'HD', hint: 'Premium video (Veo) — 1 Pro Credit' },
  { id: 'character', label: 'Character', hint: 'A character tells you the answer' },
  { id: 'explore', label: 'Explore', hint: 'Walk through it (world model)' },
];

const AUTO_TYPES: VideoType[] = ['cinematic', 'video', 'animation'];

export function parseVideoType(value: string | null | undefined): VideoTypeChoice {
  return VIDEO_TYPES.some((t) => t.id === value) ? (value as VideoTypeChoice) : 'auto';
}

// No world-model provider is connected yet (WORLD_MODEL_API_KEY in .env is a placeholder).
// Explore says so and falls back to Video instead of passing a normal clip off as a world.
export const EXPLORE_AVAILABLE = false;

/** Animation reuses the generated-video pipeline in the Cartoon style. */
export function movieModeFor(type: VideoType): MovieMode | undefined {
  return type === 'animation' ? 'cartoon' : undefined;
}

/** The technique that actually runs, and the notice to show when it had to change. */
export function resolveVideoType(type: VideoType): { type: VideoType; notice?: string } {
  if (type === 'explore' && !EXPLORE_AVAILABLE) {
    return { type: 'video', notice: 'Explore (world model) isn’t connected yet — showing Video instead.' };
  }
  return { type };
}

/** Auto: ask Decisions; anything unexpected (or a timeout) means Video. */
export async function detectVideoType(query: string): Promise<VideoType> {
  try {
    const { data } = await Promise.race([
      supabase.functions.invoke('classify-intent', { body: { query, only: 'video_style' } }),
      new Promise<{ data: null }>((resolve) => setTimeout(() => resolve({ data: null }), 6000)),
    ]);
    const style = (data as { style?: string } | null)?.style;
    return AUTO_TYPES.includes(style as VideoType) ? (style as VideoType) : 'video';
  } catch {
    return 'video';
  }
}
