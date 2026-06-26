-- Migration: Curiosity Engine — Space + Share
-- Description: A CuriosityNode is the persistent snapshot of one Q&A interaction
--              (Fast Search / Stories / Explore). It is the single source of truth
--              behind the private Space (history), the public Share snapshot, and
--              the discovery Feed. Mirrors the proven movie_projects schema
--              (RLS, indexes, triggers, engagement RPCs).
-- Created: 2026-06-26

-- ──────────────────────────────────────────────────────────────────────────
-- curiosity_nodes: one row per persisted Q&A. Private by default; sharing
-- flips is_public=true and exposes it at /s/:share_slug.
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.curiosity_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  mode TEXT NOT NULL DEFAULT 'fast_search', -- fast_search | stories | explore

  -- Snapshot content (the agent's final output — never regenerated on read)
  query TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  short_summary TEXT,
  sources JSONB DEFAULT '[]'::jsonb,     -- [{ title, url, snippet }]
  images JSONB DEFAULT '[]'::jsonb,      -- [{ url, title, source }]
  videos JSONB DEFAULT '[]'::jsonb,      -- [{ url, title, thumbnail, source }]
  follow_ups JSONB DEFAULT '[]'::jsonb,  -- [string]
  cover_image TEXT,
  topics TEXT[] DEFAULT '{}',

  -- Share (the node IS the share in this MVP)
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_slug TEXT UNIQUE,

  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  agent_version TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curiosity_nodes_user_id ON public.curiosity_nodes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_curiosity_nodes_share_slug ON public.curiosity_nodes(share_slug);
CREATE INDEX IF NOT EXISTS idx_curiosity_nodes_public ON public.curiosity_nodes(is_public, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- Likes / Saves junction tables (movie_project pattern)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.node_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.curiosity_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);
CREATE INDEX IF NOT EXISTS idx_node_likes_user_id ON public.node_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_node_likes_node_id ON public.node_likes(node_id);

CREATE TABLE IF NOT EXISTS public.node_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id UUID REFERENCES public.curiosity_nodes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, node_id)
);
CREATE INDEX IF NOT EXISTS idx_node_saves_user_id ON public.node_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_node_saves_node_id ON public.node_saves(node_id);

-- ──────────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_curiosity_node_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_curiosity_nodes_updated_at ON public.curiosity_nodes;
CREATE TRIGGER trigger_update_curiosity_nodes_updated_at
  BEFORE UPDATE ON public.curiosity_nodes
  FOR EACH ROW EXECUTE FUNCTION update_curiosity_node_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- Engagement RPCs (mirror movie toggle_/increment_ functions)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_node_view_count(node_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.curiosity_nodes SET view_count = view_count + 1 WHERE id = node_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_node_share_count(node_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.curiosity_nodes SET share_count = share_count + 1 WHERE id = node_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION toggle_node_like(node_uuid UUID, user_uuid UUID)
RETURNS boolean AS $$
DECLARE liked boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.node_likes WHERE node_id = node_uuid AND user_id = user_uuid) INTO liked;
  IF liked THEN
    DELETE FROM public.node_likes WHERE node_id = node_uuid AND user_id = user_uuid;
    UPDATE public.curiosity_nodes SET like_count = GREATEST(like_count - 1, 0) WHERE id = node_uuid;
    RETURN false;
  ELSE
    INSERT INTO public.node_likes (node_id, user_id) VALUES (node_uuid, user_uuid) ON CONFLICT DO NOTHING;
    UPDATE public.curiosity_nodes SET like_count = like_count + 1 WHERE id = node_uuid;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION toggle_node_save(node_uuid UUID, user_uuid UUID)
RETURNS boolean AS $$
DECLARE saved boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.node_saves WHERE node_id = node_uuid AND user_id = user_uuid) INTO saved;
  IF saved THEN
    DELETE FROM public.node_saves WHERE node_id = node_uuid AND user_id = user_uuid;
    UPDATE public.curiosity_nodes SET save_count = GREATEST(save_count - 1, 0) WHERE id = node_uuid;
    RETURN false;
  ELSE
    INSERT INTO public.node_saves (node_id, user_id) VALUES (node_uuid, user_uuid) ON CONFLICT DO NOTHING;
    UPDATE public.curiosity_nodes SET save_count = save_count + 1 WHERE id = node_uuid;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.curiosity_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_saves ENABLE ROW LEVEL SECURITY;

-- Nodes: a node is readable if it is public OR it belongs to the requester.
CREATE POLICY "Curiosity nodes public or owner read" ON public.curiosity_nodes
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users insert their own curiosity nodes" ON public.curiosity_nodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own curiosity nodes" ON public.curiosity_nodes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own curiosity nodes" ON public.curiosity_nodes
  FOR DELETE USING (auth.uid() = user_id);

-- Likes / saves: public read; user manages own
CREATE POLICY "Node likes are viewable by everyone" ON public.node_likes FOR SELECT USING (true);
CREATE POLICY "Users manage their own node likes" ON public.node_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Node saves are viewable by everyone" ON public.node_saves FOR SELECT USING (true);
CREATE POLICY "Users manage their own node saves" ON public.node_saves FOR ALL USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- discovery_feed: read-only union of public nodes + public movies + public
-- cinematic videos in a common shape. Lets the Feed query one source without
-- migrating the movie/cinematic tables. Rows are pre-filtered to public content.
-- ──────────────────────────────────────────────────────────────────────────
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
    'movie'::text          AS type,
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

-- ──────────────────────────────────────────────────────────────────────────
-- Grants
-- ──────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.curiosity_nodes TO authenticated;
GRANT ALL ON public.node_likes TO authenticated;
GRANT ALL ON public.node_saves TO authenticated;

GRANT SELECT ON public.curiosity_nodes TO anon;
GRANT SELECT ON public.node_likes TO anon;
GRANT SELECT ON public.node_saves TO anon;

GRANT SELECT ON public.discovery_feed TO anon, authenticated;
