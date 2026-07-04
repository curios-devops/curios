-- Enhance-in-place: the premium Enhance render now REPLACES the swipe's regular
-- image/video on the movie page. `enhanced` marks a scene whose assets came from the
-- enhance-swipe job. `title` was never persisted; the Home "latest enhanced" card can
-- now reopen the movie page from Supabase, which needs the swipe titles back.

ALTER TABLE public.movie_scenes
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS enhanced BOOLEAN NOT NULL DEFAULT false;
