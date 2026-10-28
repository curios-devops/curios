-- An Animation saved as a video is a movie_projects row with video_mode 'animation'; the feed labels it
-- 'animation' instead of 'movie'. Same view otherwise (checked against the live definition 2026-10-28).
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
  WHERE m.status = 'complete' AND m.full_video_url IS NOT NULL
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
