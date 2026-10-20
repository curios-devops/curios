-- Video page hearts (2026-10-20).
--
-- 1. toggle_movie_like ran as the caller, and movie_projects only lets the OWNER update, so a
--    like on someone else's video was stored but like_count never moved. It now runs as
--    definer and only ever acts for the signed-in user (auth.uid()), whatever is passed.
-- 2. Cinematic films (stock-footage montages) get a row of their own so they can be liked:
--    who made it (creator), the question, and the like count. Shared links carry the film id
--    so everyone's hearts land on the same film.

CREATE OR REPLACE FUNCTION public.toggle_movie_like(project_uuid UUID, user_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  liked boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'sign in to like videos'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.movie_project_likes WHERE project_id = project_uuid AND user_id = me) INTO liked;
  IF liked THEN
    DELETE FROM public.movie_project_likes WHERE project_id = project_uuid AND user_id = me;
    UPDATE public.movie_projects SET like_count = GREATEST(like_count - 1, 0) WHERE id = project_uuid;
    RETURN false;
  END IF;
  INSERT INTO public.movie_project_likes (project_id, user_id) VALUES (project_uuid, me) ON CONFLICT DO NOTHING;
  UPDATE public.movie_projects SET like_count = like_count + 1 WHERE id = project_uuid;
  RETURN true;
END;
$$;

CREATE TABLE IF NOT EXISTS public.cinematic_films (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- creator
  question TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cinematic_films_user_question ON public.cinematic_films(user_id, question);

CREATE TABLE IF NOT EXISTS public.cinematic_film_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  film_id UUID REFERENCES public.cinematic_films(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, film_id)
);
CREATE INDEX IF NOT EXISTS idx_cinematic_film_likes_film_id ON public.cinematic_film_likes(film_id);

ALTER TABLE public.cinematic_films ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinematic_film_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cinematic films are viewable by everyone" ON public.cinematic_films;
CREATE POLICY "Cinematic films are viewable by everyone" ON public.cinematic_films FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users create their own cinematic films" ON public.cinematic_films;
CREATE POLICY "Users create their own cinematic films" ON public.cinematic_films FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Cinematic film likes are viewable by everyone" ON public.cinematic_film_likes;
CREATE POLICY "Cinematic film likes are viewable by everyone" ON public.cinematic_film_likes FOR SELECT USING (true);

GRANT SELECT ON public.cinematic_films TO anon;
GRANT SELECT, INSERT ON public.cinematic_films TO authenticated;
GRANT SELECT ON public.cinematic_film_likes TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.toggle_cinematic_like(film_uuid UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  liked boolean;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'sign in to like videos'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.cinematic_film_likes WHERE film_id = film_uuid AND user_id = me) INTO liked;
  IF liked THEN
    DELETE FROM public.cinematic_film_likes WHERE film_id = film_uuid AND user_id = me;
    UPDATE public.cinematic_films SET like_count = GREATEST(like_count - 1, 0) WHERE id = film_uuid;
    RETURN false;
  END IF;
  INSERT INTO public.cinematic_film_likes (film_id, user_id) VALUES (film_uuid, me) ON CONFLICT DO NOTHING;
  UPDATE public.cinematic_films SET like_count = like_count + 1 WHERE id = film_uuid;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_cinematic_like(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_cinematic_like(UUID) TO authenticated;
