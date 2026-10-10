// Games 🎮 client — calls the games-search edge function (Exa browser games + RAWG).
import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';

export interface Game {
  name: string;
  slug: string;
  imageUrl: string | null;
  year: string;
  rating: number | null;
  metacritic: number | null;
  platforms: string[];
  genres: string[];
  url: string;
}

export interface PlayableGame { title: string; url: string; imageUrl: string | null; description: string; site: string }

export interface GamesResult {
  /** The game the query named, when it named one; `similar` is then based on it. */
  anchor: Game | null;
  similar: Game[];
  playable: PlayableGame[];
}

export async function searchGames(query: string): Promise<GamesResult> {
  try {
    const { data, error } = await supabase.functions.invoke('games-search', { body: { query } });
    if (error) throw error;
    return { anchor: data?.anchor ?? null, similar: data?.similar ?? [], playable: data?.playable ?? [] };
  } catch (error) {
    logger.warn('[games] search failed', { error: error instanceof Error ? error.message : String(error) });
    return { anchor: null, similar: [], playable: [] };
  }
}

// ---- Game fact sheet (GameFactPage) ----------------------------------------------

export interface GameInfo {
  name: string;
  year: string;
  /** ESRB age rating: short = boxed label ("E10+"), name = full ("Everyone 10+"). */
  esrb: { short: string; name: string } | null;
  genres: string[];
  genreId: number | null;
  /** RAWG user rating, 0–5. */
  rating: number | null;
  metacritic: number | null;
  platforms: string[];
  /** RAWG description (English) — grounds the explanation. */
  description: string;
  imageUrl: string | null;
  website: string | null;
  developers: { name: string; imageUrl: string | null }[];
  publishers: { name: string; imageUrl: string | null }[];
  stores: { name: string; domain: string; url: string }[];
  /** RAWG trailer (mp4); null → the page searches YouTube, then shows screenshots. */
  trailer: { name: string; url: string; preview: string | null } | null;
  videos: { name: string; url: string; preview: string | null }[];
  screenshots: string[];
  rawgUrl: string;
}

export type GameList = 'similar' | 'popular' | 'new_releases' | 'top_rated';
export type GamePlatform = 'all' | 'pc' | 'playstation' | 'xbox';

async function invoke<T>(body: object, pick: (data: any) => T, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase.functions.invoke('games-search', { body });
    if (error) throw error;
    return pick(data);
  } catch (error) {
    logger.warn('[games] games-search failed', { body, error: error instanceof Error ? error.message : String(error) });
    return fallback;
  }
}

/** Null when the query doesn't name a game (the page then shows the games list). */
export const fetchGameInfo = (query: string) =>
  invoke<GameInfo | null>({ query, detail: true }, (d) => (d?.found ? (d as GameInfo) : null), null);

export const fetchSimilarGames = (query: string) =>
  invoke<Game[]>({ query, similar: true }, (d) => d?.similar ?? [], []);

export const fetchPlayableGames = (query: string) =>
  invoke<PlayableGame[]>({ query, playable: true }, (d) => d?.playable ?? [], []);

export const fetchGameList = (list: Exclude<GameList, 'similar'>, platform: GamePlatform, genreId: number | null) =>
  invoke<Game[]>({ list, platform, genreId }, (d) => d?.items ?? [], []);
