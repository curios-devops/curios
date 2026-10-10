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
