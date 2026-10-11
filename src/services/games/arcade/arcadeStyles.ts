// Curios Arcade style categories. The studio shows the ones that fit the inspiration's RAWG
// genres (code, not a model call); the chosen one sets the mood the model blends into the
// original game's colors, and the look of the controls (chunky retro or neon).
import type { ArcadeStyle, ButtonShape } from './arcadeRuntime.ts';

export type CategoryId =
  | 'retro_arcade' | 'sandbox' | 'cyberpunk' | 'fantasy' | 'platformer' | 'roguelike'
  | 'racing' | 'puzzle' | 'cozy' | 'horror' | 'scifi' | 'party';

export interface ArcadeCategory {
  id: CategoryId;
  /** Shown under the name; game names aren't translated. */
  examples: string;
  /** Controls and type: neon (Orbitron, glow) or retro (pixel font, plastic buttons). */
  look: ArcadeStyle;
  /** Mood colors for the preview card (bg, ground, enemy, hero). */
  mood: [string, string, string, string];
  /** Shape of the on-screen joystick and buttons, so the controls match the style too. */
  shape: ButtonShape;
}

export const CATEGORIES: ArcadeCategory[] = [
  { id: 'retro_arcade', shape: 'round', examples: 'Pac-Man · Space Invaders · Galaga', look: 'retro', mood: ['#0b0b1a', '#2c2c80', '#e63946', '#ffd60a'] },
  { id: 'sandbox', shape: 'square', examples: 'Minecraft · Terraria · LEGO', look: 'retro', mood: ['#7ec8e3', '#5b8c32', '#8b5a2b', '#f1f1f1'] },
  { id: 'cyberpunk', shape: 'ring', examples: 'Synthwave · Hackers · Neon', look: 'cyberpunk', mood: ['#07060d', '#2a1a5e', '#ff2e63', '#08f7fe'] },
  { id: 'fantasy', shape: 'gem', examples: 'Zelda · Diablo · D&D', look: 'retro', mood: ['#1d2b1f', '#4a6b3a', '#9b2c2c', '#e9c46a'] },
  { id: 'platformer', shape: 'round', examples: 'Super Mario · Sonic · Celeste', look: 'retro', mood: ['#5c94fc', '#c84c0c', '#2e8b57', '#fcfcfc'] },
  { id: 'roguelike', shape: 'gem', examples: 'Hades · Vampire Survivors · Don\'t Starve', look: 'retro', mood: ['#140c1c', '#442434', '#d04648', '#deeed6'] },
  { id: 'racing', shape: 'round', examples: 'Mario Kart · Rocket League', look: 'retro', mood: ['#2b2d42', '#8d99ae', '#ef233c', '#edf2f4'] },
  { id: 'puzzle', shape: 'square', examples: 'Tetris · Portal · Monument Valley', look: 'retro', mood: ['#1b1b2f', '#3a506b', '#5bc0be', '#f2e9e4'] },
  { id: 'cozy', shape: 'round', examples: 'Stardew Valley · Animal Crossing', look: 'retro', mood: ['#f4e9d8', '#9cc5a1', '#e07a5f', '#3d405b'] },
  { id: 'horror', shape: 'gem', examples: 'Survival horror · Escape rooms', look: 'retro', mood: ['#050505', '#2b2b2b', '#7a0000', '#c9c9b0'] },
  { id: 'scifi', shape: 'hex', examples: 'Space · Aliens · Starships', look: 'cyberpunk', mood: ['#02040f', '#16213e', '#e94560', '#4cc9f0'] },
  { id: 'party', shape: 'round', examples: 'Fall Guys · Minigames', look: 'retro', mood: ['#ffd6e0', '#7bdff2', '#f15bb5', '#3a0ca3'] },
];

// RAWG genre → categories that fit it, best first.
const BY_GENRE: Record<string, CategoryId[]> = {
  Arcade: ['retro_arcade', 'party'],
  Shooter: ['retro_arcade', 'scifi', 'horror', 'cyberpunk'],
  Action: ['retro_arcade', 'cyberpunk', 'roguelike', 'fantasy'],
  Adventure: ['fantasy', 'horror', 'scifi', 'sandbox'],
  RPG: ['fantasy', 'roguelike'],
  Strategy: ['fantasy', 'scifi', 'sandbox'],
  Platformer: ['platformer', 'retro_arcade'],
  Racing: ['racing', 'cyberpunk', 'party'],
  Sports: ['racing', 'party'],
  Fighting: ['retro_arcade', 'cyberpunk', 'party'],
  Puzzle: ['puzzle', 'cozy'],
  'Board Games': ['puzzle', 'party'],
  Card: ['puzzle', 'cozy'],
  Educational: ['puzzle', 'cozy'],
  Simulation: ['cozy', 'sandbox', 'scifi'],
  Casual: ['cozy', 'party', 'puzzle'],
  Family: ['party', 'cozy', 'platformer'],
  'Massively Multiplayer': ['fantasy', 'scifi'],
};

// Tags RAWG puts on many games; they only count when nothing more specific is there.
const GENERIC_GENRES = new Set(['Casual', 'Family', 'Indie']);

// Fill-ins when few categories fit: action-friendly moods that look clearly different.
const FILL: CategoryId[] = ['retro_arcade', 'scifi', 'cyberpunk', 'fantasy', 'platformer', 'horror'];

/** The five categories that best fit the genres (earlier = better fit), topped up with fill-ins. */
export function relevantCategories(genres: string[], max = 5): ArcadeCategory[] {
  const specific = genres.filter((g) => !GENERIC_GENRES.has(g) && BY_GENRE[g]);
  const score = new Map<CategoryId, number>();
  for (const g of specific.length ? specific : genres) {
    (BY_GENRE[g] ?? []).forEach((id, i) => score.set(id, (score.get(id) ?? 0) + (4 - Math.min(i, 3))));
  }
  const ranked = CATEGORIES
    .filter((c) => score.has(c.id))
    .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b));
  for (const id of FILL) {
    if (ranked.length >= max) break;
    if (!ranked.some((c) => c.id === id)) ranked.push(CATEGORIES.find((c) => c.id === id)!);
  }
  return ranked.slice(0, max);
}

/** Joystick and button shape for a stored style (old rows: round, neon rings). */
export function shapeOf(style: string | null | undefined): ButtonShape {
  return CATEGORIES.find((c) => c.id === style)?.shape ?? (style === 'cyberpunk' ? 'ring' : 'round');
}

/** Look of the console and the score sheet for a stored style (old rows: 'retro' / 'cyberpunk'). */
export function lookOf(style: string | null | undefined): ArcadeStyle {
  return CATEGORIES.find((c) => c.id === style)?.look ?? (style === 'cyberpunk' ? 'cyberpunk' : 'retro');
}
