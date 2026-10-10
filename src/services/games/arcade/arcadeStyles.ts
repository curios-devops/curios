// Curios Arcade style categories. The studio shows the ones that fit the inspiration's RAWG
// genres (code, not a model call); the chosen one sets the mood the model blends into the
// original game's colors, and the look of the controls (chunky retro or neon).
import type { ArcadeStyle } from './arcadeRuntime.ts';

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
}

export const CATEGORIES: ArcadeCategory[] = [
  { id: 'retro_arcade', examples: 'Pac-Man · Space Invaders · Galaga', look: 'retro', mood: ['#0b0b1a', '#2c2c80', '#e63946', '#ffd60a'] },
  { id: 'sandbox', examples: 'Minecraft · Terraria · LEGO', look: 'retro', mood: ['#7ec8e3', '#5b8c32', '#8b5a2b', '#f1f1f1'] },
  { id: 'cyberpunk', examples: 'Synthwave · Hackers · Neon', look: 'cyberpunk', mood: ['#07060d', '#2a1a5e', '#ff2e63', '#08f7fe'] },
  { id: 'fantasy', examples: 'Zelda · Diablo · D&D', look: 'retro', mood: ['#1d2b1f', '#4a6b3a', '#9b2c2c', '#e9c46a'] },
  { id: 'platformer', examples: 'Super Mario · Sonic · Celeste', look: 'retro', mood: ['#5c94fc', '#c84c0c', '#2e8b57', '#fcfcfc'] },
  { id: 'roguelike', examples: 'Hades · Vampire Survivors · Don\'t Starve', look: 'retro', mood: ['#140c1c', '#442434', '#d04648', '#deeed6'] },
  { id: 'racing', examples: 'Mario Kart · Rocket League', look: 'retro', mood: ['#2b2d42', '#8d99ae', '#ef233c', '#edf2f4'] },
  { id: 'puzzle', examples: 'Tetris · Portal · Monument Valley', look: 'retro', mood: ['#1b1b2f', '#3a506b', '#5bc0be', '#f2e9e4'] },
  { id: 'cozy', examples: 'Stardew Valley · Animal Crossing', look: 'retro', mood: ['#f4e9d8', '#9cc5a1', '#e07a5f', '#3d405b'] },
  { id: 'horror', examples: 'Survival horror · Escape rooms', look: 'retro', mood: ['#050505', '#2b2b2b', '#7a0000', '#c9c9b0'] },
  { id: 'scifi', examples: 'Space · Aliens · Starships', look: 'cyberpunk', mood: ['#02040f', '#16213e', '#e94560', '#4cc9f0'] },
  { id: 'party', examples: 'Fall Guys · Minigames', look: 'retro', mood: ['#ffd6e0', '#7bdff2', '#f15bb5', '#3a0ca3'] },
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

/** The three categories that best fit the genres (earlier = better fit); never fewer than two. */
export function relevantCategories(genres: string[], max = 3): ArcadeCategory[] {
  const score = new Map<CategoryId, number>();
  for (const g of genres) {
    (BY_GENRE[g] ?? []).forEach((id, i) => score.set(id, (score.get(id) ?? 0) + (4 - Math.min(i, 3))));
  }
  const ranked = CATEGORIES
    .filter((c) => score.has(c.id))
    .sort((a, b) => (score.get(b.id) ?? 0) - (score.get(a.id) ?? 0) || CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b));
  for (const fallback of ['retro_arcade', 'cyberpunk'] as const) {
    if (ranked.length >= 2) break;
    if (!ranked.some((c) => c.id === fallback)) ranked.push(CATEGORIES.find((c) => c.id === fallback)!);
  }
  return ranked.slice(0, max);
}

/** Look of the console and the score sheet for a stored style (old rows: 'retro' / 'cyberpunk'). */
export function lookOf(style: string | null | undefined): ArcadeStyle {
  return CATEGORIES.find((c) => c.id === style)?.look ?? (style === 'cyberpunk' ? 'cyberpunk' : 'retro');
}
