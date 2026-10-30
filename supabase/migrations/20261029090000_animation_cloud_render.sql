-- Animations are recorded once, in the cloud (Cloud Run job animation-recorder), not by each viewer:
-- the video and its preview picture live on the animation's own row (landscape and "|portrait" rows).
ALTER TABLE public.animations
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS poster_url TEXT,
  ADD COLUMN IF NOT EXISTS render_status TEXT,            -- queued | ready | failed
  ADD COLUMN IF NOT EXISTS render_seconds INTEGER,        -- the job's run time (telemetry: Cloud Run minutes)
  ADD COLUMN IF NOT EXISTS render_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rendered_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_animations_rendered ON public.animations(rendered_at DESC);

-- A signed-in viewer's animation is their movie from the moment they open it (history, short /v/ link),
-- private until they post it. Save puts it in their Space; Post publishes it to the feed.
ALTER TABLE public.movie_projects
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS saved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS animation_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_movie_projects_user_animation
  ON public.movie_projects(user_id, animation_key) WHERE animation_key IS NOT NULL;
-- What the feed showed until now stays there.
UPDATE public.movie_projects SET is_public = true WHERE status = 'complete' AND full_video_url IS NOT NULL;

-- The feed shows only posted movies (checked against the live view on 2026-10-29).
CREATE OR REPLACE VIEW public.discovery_feed AS
  SELECT
    n.id,
    'curiosity_node'::text AS source_table,
    n.share_slug           AS slug,
    n.query                AS title,
    COALESCE(n.short_summary, left(n.answer, 200)) AS summary,
    n.cover_image,
    n.mode                 AS type,
    n.view_count, n.like_count, n.share_count,
    n.created_at
  FROM public.curiosity_nodes n
  WHERE n.is_public = true
  UNION ALL
  SELECT
    m.id,
    'movie_project'::text  AS source_table,
    m.id::text             AS slug,
    COALESCE(NULLIF(m.title, ''), m.question) AS title,
    m.description          AS summary,
    m.thumbnail_url        AS cover_image,
    CASE WHEN m.video_mode = 'animation' THEN 'animation' ELSE 'movie' END AS type,
    m.view_count, m.like_count, m.share_count,
    m.created_at
  FROM public.movie_projects m
  WHERE m.status = 'complete' AND m.full_video_url IS NOT NULL AND m.is_public
  UNION ALL
  SELECT
    c.id,
    'cinematic_video'::text AS source_table,
    c.id::text              AS slug,
    COALESCE(NULLIF(c.title, ''), c.query) AS title,
    c.description           AS summary,
    c.thumbnail_url         AS cover_image,
    'cinematic'::text       AS type,
    c.view_count, c.like_count, c.share_count,
    c.created_at
  FROM public.cinematic_videos c
  WHERE c.full_video_url IS NOT NULL;

GRANT SELECT ON public.discovery_feed TO anon, authenticated;
