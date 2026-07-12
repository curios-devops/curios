-- Movie Mode visual styles (docs/Movie/moviemode.md).
-- video_mode: the "Watch as…" style the movie was rendered in (real | cinematic | cartoon |
--             pixar | lego | anime | retro80s | meme). Lazy renders and Enhance respect it.
-- related_topics: "Continue Exploring" carousel — [{ title, imageUrl }] jsonb.

ALTER TABLE public.movie_projects
  ADD COLUMN IF NOT EXISTS video_mode text,
  ADD COLUMN IF NOT EXISTS related_topics jsonb NOT NULL DEFAULT '[]'::jsonb;
