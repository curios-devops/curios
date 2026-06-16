-- ──────────────────────────────────────────────────────────────────────────
-- Movie Mode: swipe refactor (additive).
-- Scenes are now "swipes" — independent knowledge frames. Only the core swipe
-- auto-renders video; secondary swipes lazy-generate on demand. We keep the
-- movie_scenes table and add the two columns the swipe model needs.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE public.movie_scenes
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS swipe_role TEXT NOT NULL DEFAULT 'core';

-- Fast lookup of a project's core swipe (the shareable unit).
CREATE INDEX IF NOT EXISTS idx_movie_scenes_core
  ON public.movie_scenes(project_id, is_core);
