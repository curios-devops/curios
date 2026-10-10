// Curios Arcade client: create a mini game inspired by a video game (arcade-generate edge
// function), load a shared one, and the leaderboard (today's podium + all-time Hall of Fame).
import { supabase } from '../../../lib/supabase.ts';
import { appSettings } from '../../../config/appSettings.ts';
import { logger } from '../../../utils/logger.ts';
import type { QuestionTier } from '../../auto/modelTier.ts';

export interface ArcadeGame {
  id: string;
  title: string;
  howTo: string;
  palette: string[];
  code: string;
  inspiredBy: string;
}

// Perceived difficulty of squeezing the inspiration into a one-screen arcade game, from its
// genres (code, not a model call): simple genres → Luna, deep systems → Astra, else Sol.
const EASY_GENRES = ['Arcade', 'Puzzle', 'Casual', 'Platformer', 'Card', 'Board Games', 'Family', 'Educational'];
const COMPLEX_GENRES = ['Strategy', 'RPG', 'Simulation', 'Massively Multiplayer'];

export function arcadeTier(genres: string[]): QuestionTier {
  if (genres.some((g) => COMPLEX_GENRES.includes(g))) return 'complex';
  if (genres.length > 0 && genres.every((g) => EASY_GENRES.includes(g))) return 'easy';
  return 'normal';
}

export function arcadeModel(genres: string[], models = appSettings.models): string {
  const tier = arcadeTier(genres);
  return tier === 'easy' ? models.luna : tier === 'complex' ? models.astra : models.sol;
}

async function invokeArcade(body: object): Promise<ArcadeGame> {
  const { data, error } = await supabase.functions.invoke('arcade-generate', { body });
  if (error || !data?.code) throw new Error(error?.message ?? data?.error ?? 'arcade-generate failed');
  return data as ArcadeGame;
}

export function generateArcadeGame(input: {
  inspiredBy: string;
  genres: string[];
  description: string;
  screenshot: string | null;
  language: string;
}): Promise<ArcadeGame> {
  return invokeArcade({ ...input, model: arcadeModel(input.genres) });
}

/** The game threw in the smoke test → one server-side fix of the stored game. */
export function repairArcadeGame(id: string, error: string, genres: string[], language: string): Promise<ArcadeGame> {
  return invokeArcade({ repair: { id, error }, model: arcadeModel(genres), language });
}

export async function fetchArcadeGame(id: string): Promise<ArcadeGame | null> {
  const { data, error } = await supabase
    .from('arcade_games')
    .select('id, title, how_to, palette, code, inspired_by')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    if (error) logger.warn('[arcade] load failed', { error: error.message });
    return null;
  }
  return { id: data.id, title: data.title, howTo: data.how_to ?? '', palette: data.palette ?? [], code: data.code, inspiredBy: data.inspired_by ?? '' };
}

// ---- Leaderboard ------------------------------------------------------------------

export interface ArcadeScore { player: string; score: number }

const BOARD_SIZE = 10;

export async function postScore(gameId: string, player: string, score: number): Promise<boolean> {
  const { error } = await supabase.from('arcade_scores').insert({ game_id: gameId, player: player.trim().slice(0, 16), score });
  if (error) logger.warn('[arcade] score not saved', { error: error.message });
  return !error;
}

/** Today = since the player's local midnight; Hall of Fame = all time. */
export async function fetchBoards(gameId: string): Promise<{ today: ArcadeScore[]; allTime: ArcadeScore[] }> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const board = (since?: string) => {
    let q = supabase.from('arcade_scores').select('player, score').eq('game_id', gameId);
    if (since) q = q.gte('created_at', since);
    return q.order('score', { ascending: false }).order('created_at', { ascending: true }).limit(BOARD_SIZE);
  };
  const [today, allTime] = await Promise.all([board(midnight.toISOString()), board()]);
  return { today: (today.data ?? []) as ArcadeScore[], allTime: (allTime.data ?? []) as ArcadeScore[] };
}
