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
  mode?: ArcadeMode;
  /** Style category id (arcadeStyles.ts); old rows: 'retro' / 'cyberpunk'. */
  style?: string;
  /** What A / B do ("DISPARA"); b = '' when unused. */
  buttons?: { a: string; b: string } | null;
  idea?: string | null;
  /** Screen size (128-512, set by style). */
  res?: number;
  /** 'x' = left/right only (arrow pad shows ◀ ▶). */
  axes?: 'x' | 'xy';
  /** AI-painted background and sprite sheet (16-bit era and newer); null = drawn by code. */
  art?: { bg?: string | null; sheet?: string | null } | null;
  votesUp?: number;
  votesDown?: number;
}

export type ArcadeMode = '2d' | '3d';

// 3D (first person) is offered only where it fits: shooters and dungeon RPGs, or when the
// player asked for it. Code, not a model call: instant and free.
export function offers3D(genres: string[], query: string): boolean {
  return genres.some((g) => g === 'Shooter' || g === 'RPG') || /\b3d\b|first[- ]person|primera persona/i.test(query);
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

/** Each remake uses the next model up: Luna → Sol → Astra (Astra stays). */
export function nextArcadeModel(model: string, models = appSettings.models): string {
  return model === models.luna ? models.sol : models.astra;
}

// v: 2 = this console has spr() / grad() / painted art (older app versions get the old prompt).
async function invokeArcade(body: object): Promise<ArcadeGame> {
  const { data, error } = await supabase.functions.invoke('arcade-generate', { body: { ...body, v: 2 } });
  if (error || !data?.code) throw new Error(error?.message ?? data?.error ?? 'arcade-generate failed');
  return data as ArcadeGame;
}

export type BuildEvent = { type: 'progress'; chars: number } | { type: 'fixing' } | { type: 'painting' };

async function streamArcade(body: object, onEvent: (e: BuildEvent) => void): Promise<ArcadeGame> {
  // The user's token when signed in, so the game is credited to them ("Creative" cards).
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/arcade-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ ...body, v: 2 }),
  });
  if (!res.ok || !res.body) throw new Error(`arcade-generate ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      if (!raw.startsWith('data: ')) continue;
      const ev = JSON.parse(raw.slice(6));
      if (ev.type === 'done') return ev.game as ArcadeGame;
      if (ev.type === 'error') throw new Error('arcade-generate failed');
      onEvent(ev);
    }
  }
  throw new Error('arcade-generate: stream ended');
}

/** Streams the generation: progress events (characters written so far) while the model works. */
export function generateArcadeGame(
  input: {
    inspiredBy: string; genres: string[]; description: string; screenshot: string | null;
    year: string; platforms: string[]; language: string; mode: ArcadeMode; style: string; idea: string; model: string;
  },
  onEvent: (e: BuildEvent) => void,
): Promise<ArcadeGame> {
  return streamArcade(input, onEvent);
}

/** One-tap idea suggestions for this game (Luna), cached for the session; [] on failure. */
export async function fetchArcadeIdeas(inspiredBy: string, genres: string[], description: string, language: string): Promise<string[]> {
  const key = `curios_arcade_ideas:${language}:${inspiredBy}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) ?? 'null');
    if (Array.isArray(cached)) return cached;
  } catch { /* storage blocked */ }
  const { data, error } = await supabase.functions.invoke('arcade-generate', { body: { ideas: { inspiredBy, genres, description }, language } });
  const ideas = !error && Array.isArray(data?.ideas) ? (data.ideas as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()).slice(0, 5) : [];
  try { if (ideas.length) sessionStorage.setItem(key, JSON.stringify(ideas)); } catch { /* storage blocked */ }
  return ideas;
}

/** "Remake": a better version of the game from the player's feedback, with a stronger model. */
export function improveArcadeGame(id: string, feedback: string, model: string, language: string, onEvent: (e: BuildEvent) => void): Promise<ArcadeGame> {
  return streamArcade({ improve: { id, feedback }, model, language }, onEvent);
}

/** The game threw in the smoke test → one server-side fix of the stored game. */
export function repairArcadeGame(id: string, error: string, model: string, language: string): Promise<ArcadeGame> {
  return invokeArcade({ repair: { id, error }, model, language });
}

export async function fetchArcadeGame(id: string): Promise<ArcadeGame | null> {
  const { data, error } = await supabase
    .from('arcade_games')
    .select('id, title, how_to, palette, code, inspired_by, mode, style, buttons, idea, votes_up, votes_down, res, axes, art')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    if (error) logger.warn('[arcade] load failed', { error: error.message });
    return null;
  }
  return {
    id: data.id, title: data.title, howTo: data.how_to ?? '', palette: data.palette ?? [], code: data.code,
    inspiredBy: data.inspired_by ?? '', mode: data.mode === '3d' ? '3d' : '2d', style: data.style, buttons: data.buttons, idea: data.idea, res: data.res, axes: data.axes === 'x' ? 'x' : 'xy', art: data.art, votesUp: data.votes_up, votesDown: data.votes_down,
  };
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

// ---- Votes (👍/👎) and saved games: remembered on this device -----------------------

const VOTES_KEY = 'curios_arcade_votes';
const SAVED_KEY = 'curios_arcade_saved';

function readJson<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T; } catch { return fallback; }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
}

export const myVote = (gameId: string): -1 | 0 | 1 => readJson<Record<string, -1 | 1>>(VOTES_KEY, {})[gameId] ?? 0;

/** Tapping the same thumb again removes the vote. Returns the new counters. */
export async function voteArcadeGame(gameId: string, vote: -1 | 1): Promise<{ up: number; down: number; mine: -1 | 0 | 1 } | null> {
  const prev = myVote(gameId);
  const next = prev === vote ? 0 : vote;
  const { data, error } = await supabase.rpc('arcade_vote', { game: gameId, vote: next, prev });
  if (error || !data?.[0]) return null;
  const votes = readJson<Record<string, -1 | 1>>(VOTES_KEY, {});
  if (next) votes[gameId] = next; else delete votes[gameId];
  writeJson(VOTES_KEY, votes);
  return { up: data[0].votes_up, down: data[0].votes_down, mine: next };
}

export interface SavedArcadeGame { id: string; title: string; inspiredBy: string }

export const savedArcadeGames = (): SavedArcadeGame[] => readJson<SavedArcadeGame[]>(SAVED_KEY, []);
export const isArcadeSaved = (id: string) => savedArcadeGames().some((g) => g.id === id);

/** "Save to play later" (the link, not any game state). Returns whether it is now saved. */
export function toggleSavedArcade(game: ArcadeGame): boolean {
  const list = savedArcadeGames();
  const saved = list.some((g) => g.id === game.id);
  writeJson(SAVED_KEY, saved ? list.filter((g) => g.id !== game.id) : [{ id: game.id, title: game.title, inspiredBy: game.inspiredBy }, ...list].slice(0, 30));
  return !saved;
}

// ---- "Creative" catalog ---------------------------------------------------------

export interface ArcadeCard {
  id: string;
  title: string;
  inspiredBy: string;
  palette: string[];
  style: string;
  mode: ArcadeMode;
  genres: string[];
  votesUp: number;
  plays: number;
  creatorId: string | null;
  creatorName: string | null;
  createdAt: string;
  /** Painted background (art games), shown on the card. */
  bg: string | null;
}

/** The latest games (sorting and filtering happen on the page — the catalog is small). */
export async function fetchArcadeCatalog(limit = 200): Promise<ArcadeCard[]> {
  const { data, error } = await supabase
    .from('arcade_games')
    .select('id, title, inspired_by, palette, style, mode, genres, votes_up, plays, creator_id, creator_name, created_at, bg:art->>bg')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { logger.warn('[arcade] catalog failed', { error: error.message }); return []; }
  return (data ?? []).map((g) => ({
    id: g.id, title: g.title, inspiredBy: g.inspired_by ?? '', palette: g.palette ?? [], style: g.style ?? 'retro_arcade',
    mode: g.mode === '3d' ? '3d' : '2d', genres: g.genres ?? [], votesUp: g.votes_up ?? 0, plays: g.plays ?? 0,
    creatorId: g.creator_id, creatorName: g.creator_name, createdAt: g.created_at, bg: g.bg ?? null,
  }));
}

export type CatalogSort = 'relevance' | 'popular' | 'new' | 'top_rated';

// Relevance: votes weigh most, plays count, and newer games get a boost that fades in days.
export function sortCatalog(games: ArcadeCard[], sort: CatalogSort, now = Date.now()): ArcadeCard[] {
  const age = (g: ArcadeCard) => Math.max(0, (now - new Date(g.createdAt).getTime()) / 86_400_000);
  const score: Record<CatalogSort, (g: ArcadeCard) => number> = {
    relevance: (g) => (g.votesUp * 3 + g.plays + 1) / Math.pow(age(g) + 2, 0.8),
    popular: (g) => g.plays,
    new: (g) => -age(g),
    top_rated: (g) => g.votesUp,
  };
  return [...games].sort((a, b) => score[sort](b) - score[sort](a) || age(a) - age(b));
}

/** One play, when a run starts (once per page view). */
export function countArcadePlay(id: string) {
  void supabase.rpc('arcade_play', { game: id }).then(undefined, () => undefined);
}

// ---- Player preferences on this device: volume, joystick or arrows -------------------

const MUTED_KEY = 'curios_arcade_muted';
const VOLUME_KEY = 'curios_arcade_volume';
const CONTROLS_KEY = 'curios_arcade_controls';

/** 0 (off) … 3 (full); players who had muted the old sound toggle start at 0. */
export const arcadeVolume = (): number => {
  const v = readJson<number>(VOLUME_KEY, readJson<boolean>(MUTED_KEY, false) === true ? 0 : 3);
  return [0, 1, 2, 3].includes(v) ? v : 3;
};
export const setArcadeVolume = (level: number) => writeJson(VOLUME_KEY, level);
export const arcadeControls = (): 'stick' | 'pad' => (readJson<string>(CONTROLS_KEY, 'stick') === 'pad' ? 'pad' : 'stick');
export const setArcadeControls = (mode: 'stick' | 'pad') => writeJson(CONTROLS_KEY, mode);
