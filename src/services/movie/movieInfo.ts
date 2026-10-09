// Movie 🍿 fact sheet client — calls the movie-info edge function (TMDB + OMDb).
import { supabase } from '../../lib/supabase.ts';
import { logger } from '../../utils/logger.ts';

export interface MovieInfo {
  title: string;
  originalTitle: string;
  year: string;
  certification: string;
  genres: string[];
  runtimeMinutes: number | null;
  overview: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  trailerYoutubeId: string | null;
  videos: { youtubeId: string; name: string; type: string }[];
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

/** "1h 43m" from 103. */
export function formatRuntime(minutes: number | null): string {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
