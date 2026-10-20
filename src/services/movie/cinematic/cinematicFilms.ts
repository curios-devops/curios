// Cinematic films are rebuilt from the question each time, so for hearts they get a small
// row of their own (cinematic_films: creator, question, title, cover, like_count). Shared
// links carry the film id (?film=) so everyone's hearts land on the same film.
import { supabase } from '../../../lib/supabase.ts';
import { logger } from '../../../utils/logger.ts';

/** The creator's film for this question (reused, not duplicated); null when it can't be saved. */
export async function saveCinematicFilm(userId: string, question: string, title: string, cover?: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('cinematic_films').select('id').eq('user_id', userId).eq('question', question).limit(1).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await supabase
    .from('cinematic_films').insert({ user_id: userId, question, title, cover_image: cover ?? null }).select('id').single();
  if (error) {
    logger.warn('[CinematicFilms] save failed', { error: error.message });
    return null;
  }
  return data.id as string;
}

export async function getFilmLikeState(filmId: string, userId?: string): Promise<{ count: number; liked: boolean } | null> {
  const [film, mine] = await Promise.all([
    supabase.from('cinematic_films').select('like_count').eq('id', filmId).maybeSingle(),
    userId
      ? supabase.from('cinematic_film_likes').select('film_id').eq('film_id', filmId).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!film.data) return null;
  return { count: (film.data.like_count as number) ?? 0, liked: Boolean(mine.data) };
}

export async function toggleCinematicLike(filmId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('toggle_cinematic_like', { film_uuid: filmId });
  if (error) throw error;
  return data as boolean;
}
