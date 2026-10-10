// Movie 🍿 fact sheet client — calls the movie-info edge function (TMDB + OMDb).
import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';

export interface MovieInfo {
  title: string;
  originalTitle: string;
  year: string;
  certification: string;
  genres: string[];
  /** First TMDB genre id — scopes the genre-based "More to explore" lists. */
  genreId: number | null;
  runtimeMinutes: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerYoutubeId: string | null;
  videos: { youtubeId: string; name: string; type: string }[];
  /** Stills for the Images tab. */
  images: string[];
  directors: string[];
  cast: { name: string; character: string; photoUrl: string | null }[];
  watch: { link: string | null; providers: { name: string; logoUrl: string; type: string }[] };
  ratings: { source: string; value: string }[];
  /** wins / nominations = all awards (localizable); text = OMDb's English line. */
  awards: { text: string; oscars: { wins: number; nominations: number }; wins: number; nominations: number } | null;
  related: { title: string; year: string; posterUrl: string }[];
  imdbUrl: string | null;
  tmdbUrl: string;
}

/** TMDB language ("es-ES") and watch-provider region ("ES") from the UI language + browser locale. */
export function movieLocale(uiLang: string): { language: string; region: string } {
  const browserRegion = (navigator.language.split('-')[1] || '').toUpperCase();
  const region = browserRegion || (uiLang === 'en' ? 'US' : uiLang.toUpperCase());
  return { language: `${uiLang}-${region}`, region };
}

/** Null when no film matches the query (or the function is unavailable). */
export async function fetchMovieInfo(query: string, uiLang: string): Promise<MovieInfo | null> {
  try {
    const { data, error } = await supabase.functions.invoke('movie-info', {
      body: { query, ...movieLocale(uiLang) },
    });
    if (error) throw error;
    return data?.found ? (data as MovieInfo) : null;
  } catch (error) {
    logger.warn('[MovieInfo] lookup failed', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export type ExploreList = 'related' | 'popular' | 'now_playing' | 'upcoming' | 'free' | 'top_rated' | 'hidden_gems';
export type ExploreItem = MovieInfo['related'][number];

/** One "More to explore" list (TMDB); empty on failure. */
export async function fetchExploreList(list: Exclude<ExploreList, 'related'>, genreId: number | null, uiLang: string): Promise<ExploreItem[]> {
  try {
    const { data, error } = await supabase.functions.invoke('movie-info', {
      body: { list, genreId: genreId ?? undefined, ...movieLocale(uiLang) },
    });
    if (error) throw error;
    return (data?.related as ExploreItem[]) ?? [];
  } catch {
    return [];
  }
}

/** "1h 43m" from 103. */
export function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
