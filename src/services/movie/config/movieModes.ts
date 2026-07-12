// Movie Mode visual styles (docs/Movie/moviemode.md).
// The user picks the RESULT ("watch it as anime"), not the technology. Each mode carries:
//  - imageStyle: style directive woven into the storyboard's styleAnchor / image prompts
//  - motionStyle: extra directive for the image-to-video motion prompt
//  - grounding: how much the real reference photo must be respected
//      anchor      → the photo IS the scene (faces, place, context preserved)
//      reference   → the photo inspires; framing/drama may open up
//      reinterpret → keep the subject's recognizable traits, restyle everything
//      free        → the photo (if any) only identifies the subject; creativity leads

import type { MovieMode } from '../types';

export type ModeGrounding = 'anchor' | 'reference' | 'reinterpret' | 'free';

export interface MovieModeSpec {
  id: MovieMode;
  label: string;
  emoji: string;
  grounding: ModeGrounding;
  imageStyle: string;
  motionStyle: string;
}

export const MOVIE_MODES: Record<MovieMode, MovieModeSpec> = {
  real: {
    id: 'real',
    label: 'Real',
    emoji: '🎥',
    grounding: 'anchor',
    imageStyle:
      'Photojournalistic documentary photography — authentic real-world look, natural lighting, faithful to the real subject, place and context. No stylization.',
    motionStyle: 'Physically-plausible, documentary-real motion only.',
  },
  cinematic: {
    id: 'cinematic',
    label: 'Cinematic',
    emoji: '🎬',
    grounding: 'reference',
    imageStyle:
      'Cinematic film still — dramatic lighting, anamorphic lens, epic wide compositions, movie-grade color grading.',
    motionStyle: 'Dramatic, film-like motion: open up the shot, add atmosphere and scale.',
  },
  cartoon: {
    id: 'cartoon',
    label: 'Cartoon',
    emoji: '🎨',
    grounding: 'reinterpret',
    imageStyle:
      '2D illustrated cartoon — bold outlines, flat vibrant colors, expressive characters. Reinterpret real subjects as illustrated characters that keep their recognizable traits.',
    motionStyle: 'Bouncy, expressive cartoon animation with squash-and-stretch energy.',
  },
  pixar: {
    id: 'pixar',
    label: 'Pixar-like',
    emoji: '🎮',
    grounding: 'reinterpret',
    imageStyle:
      'Pixar-like 3D animation — soft rounded shapes, warm cinematic lighting, expressive stylized characters, high-detail render.',
    motionStyle: 'Smooth, character-driven 3D animation with lively secondary motion.',
  },
  lego: {
    id: 'lego',
    label: 'LEGO',
    emoji: '🧱',
    grounding: 'reinterpret',
    imageStyle:
      'LEGO brick world — everything built from LEGO bricks, minifigure characters, glossy plastic textures, playful diorama look.',
    motionStyle: 'Stop-motion-style brick animation: minifigures and brick-built parts moving.',
  },
  anime: {
    id: 'anime',
    label: 'Anime',
    emoji: '🎌',
    grounding: 'reinterpret',
    imageStyle:
      'Japanese anime — cel shading, dramatic line work, expressive eyes, dynamic action framing.',
    motionStyle: 'Dynamic anime action: speed lines, dramatic pans, expressive character motion.',
  },
  retro80s: {
    id: 'retro80s',
    label: 'Retro 80s',
    emoji: '📺',
    grounding: 'reinterpret',
    imageStyle:
      'Retro 1980s aesthetic — VHS grain, neon palette, synthwave glow, period-accurate styling.',
    motionStyle: 'Retro broadcast motion: analog glitches, neon flicker, synthwave pulse.',
  },
  meme: {
    id: 'meme',
    label: 'Meme',
    emoji: '😂',
    grounding: 'free',
    imageStyle:
      'Exaggerated internet-meme style — comedic exaggeration of the situation while keeping its recognizable context, punchy and instantly shareable.',
    motionStyle: 'Comedic, exaggerated motion with punchline timing.',
  },
};

export const MOVIE_MODE_LIST: MovieModeSpec[] = Object.values(MOVIE_MODES);

export const DEFAULT_MOVIE_MODE: MovieMode = 'cinematic';

export function normalizeMovieMode(value: string | null | undefined): MovieMode | undefined {
  const v = (value || '').toLowerCase().trim();
  return v in MOVIE_MODES ? (v as MovieMode) : undefined;
}
