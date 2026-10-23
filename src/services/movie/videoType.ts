// The Video page's production technique ("director" decision). The user can pick one in the
// type selector; otherwise Auto asks Decisions (classify-intent, only:"video_style"), which
// chooses among the affordable automatic techniques: cinematic, video, animation.
//
// Fallback chain: any technique that fails → Video (the default); if Video can't render a
// clip, the viewer animates its still frame (Ken Burns). Immersion (the 'tour' id: a Viggle 3D
// world with its people) and Clips (a real video's moment) are chosen by hand only — each costs a Pro Credit.
import { supabase } from '../../lib/supabase.ts';
import type { MovieMode } from './types.ts';
import { Clapperboard, Film, Palette, PersonStanding, Rotate3d, Video, type LucideIcon } from 'lucide-react';
import AutoModeIcon from '../../components/icons/AutoModeIcon.tsx';

export type VideoType = 'video' | 'cinematic' | 'animation' | 'character' | 'tour' | 'clip';
export type VideoTypeChoice = VideoType | 'auto';

// Labels are locale keys vidType_<id>; hints document the intent; icons show in the type menu.
// (HD left the menu: the premium Veo render is "Mejorar" in the top bar.)
export const VIDEO_TYPES: { id: VideoTypeChoice; label: string; hint: string; icon: LucideIcon | typeof AutoModeIcon }[] = [
  { id: 'auto', label: 'Auto', hint: 'Curios picks the best technique for your question', icon: AutoModeIcon },
  { id: 'video', label: 'Video', hint: 'New generated scenes', icon: Film },
  { id: 'cinematic', label: 'Cinematic', hint: 'Real footage montage with narration and captions', icon: Video },
  { id: 'animation', label: 'Animation', hint: 'Animated explainer', icon: Palette },
  { id: 'character', label: 'Character', hint: 'A character tells you the answer', icon: PersonStanding },
  { id: 'tour', label: 'Immersion', hint: 'Step into the world (Viggle 3D) and live it through the eyes of its people', icon: Rotate3d },
  { id: 'clip', label: 'Clips', hint: 'The moment of a real video that answers — and you can talk to it', icon: Clapperboard },
];

const AUTO_TYPES: VideoType[] = ['cinematic', 'video', 'animation'];

export function parseVideoType(value: string | null | undefined): VideoTypeChoice {
  if (value === 'explore' || value === 'experience' || value === 'immersion') return 'tour'; // older names / Immersion
  return VIDEO_TYPES.some((t) => t.id === value) ? (value as VideoTypeChoice) : 'auto';
}

/** Animation reuses the generated-video pipeline in the Cartoon style. */
export function movieModeFor(type: VideoType): MovieMode | undefined {
  return type === 'animation' ? 'cartoon' : undefined;
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
