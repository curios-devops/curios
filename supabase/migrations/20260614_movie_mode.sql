-- Migration: Movie Mode
-- Description: Tables for the Movie service (question -> research -> script -> storyboard ->
--              gpt-image-2 images -> LTX image-to-video scenes -> stitched movie -> viral packaging).
-- Mirrors the proven cinematic_videos schema (RLS, indexes, triggers, engagement RPCs).
-- Created: 2026-06-14

-- ──────────────────────────────────────────────────────────────────────────
-- movie_projects: one row per generated movie (the cinematic_videos analog)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Question and enhanced derivations (Step 1)
  question TEXT NOT NULL,
  research_question TEXT,
  visual_story_question TEXT,

  -- Content
  title TEXT NOT NULL DEFAULT '',
  description TEXT,
  narrative TEXT,

  -- Final assets
  full_video_url TEXT,
  full_video_path TEXT,
  thumbnail_url TEXT,

  -- Metadata
  scene_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  aspect_ratio TEXT DEFAULT '16:9',
  generation_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'generating', -- generating | storyboard | rendering | complete | failed

  -- Viral packaging (Step 11) stored as JSONB: { title, caption, hashtags[], thumbnailText, viralScore }
  viral JSONB DEFAULT '{}'::jsonb,

  -- Sources/citations from grounding (Step 2)
  sources JSONB DEFAULT '[]'::jsonb,

  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_projects_user_id ON public.movie_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_projects_created_at ON public.movie_projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movie_projects_status ON public.movie_projects(status);
CREATE INDEX IF NOT EXISTS idx_movie_projects_view_count ON public.movie_projects(view_count DESC);

-- ──────────────────────────────────────────────────────────────────────────
-- movie_scenes: per-scene rows enable storyboard preview + individual retry
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.movie_projects(id) ON DELETE CASCADE,

  scene_order INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 6,
  narration TEXT,
  image_prompt TEXT,
  video_prompt TEXT,
  transition_style TEXT DEFAULT 'cut',

  image_url TEXT,
  video_url TEXT,
  narration_audio_url TEXT,

  status TEXT NOT NULL DEFAULT 'pending', -- pending | image_ready | rendering | ready | error
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_scenes_project_id ON public.movie_scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_movie_scenes_order ON public.movie_scenes(project_id, scene_order);

-- ──────────────────────────────────────────────────────────────────────────
-- movie_assets: every stored binary (image | scene_video | final | audio)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.movie_projects(id) ON DELETE CASCADE,
  scene_id UUID REFERENCES public.movie_scenes(id) ON DELETE CASCADE,

  kind TEXT NOT NULL, -- image | scene_video | final | audio
  storage_path TEXT,
  url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_assets_project_id ON public.movie_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_movie_assets_scene_id ON public.movie_assets(scene_id);

-- ──────────────────────────────────────────────────────────────────────────
-- movie_analytics: KPIs (primary KPI = shares per generated movie)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.movie_projects(id) ON DELETE CASCADE,

  completion_rate NUMERIC DEFAULT 0,
  avg_watch_time_seconds NUMERIC DEFAULT 0,
  shares INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  viral_score NUMERIC DEFAULT 0,
  engagement_score NUMERIC DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movie_analytics_project_id ON public.movie_analytics(project_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Likes / Saves / Feedback junction tables (cinematic pattern)
-- ──────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.movie_project_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.movie_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_movie_likes_user_id ON public.movie_project_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_likes_project_id ON public.movie_project_likes(project_id);

CREATE TABLE IF NOT EXISTS public.movie_project_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.movie_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_movie_saves_user_id ON public.movie_project_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_movie_saves_project_id ON public.movie_project_saves(project_id);

CREATE TABLE IF NOT EXISTS public.movie_project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.movie_projects(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movie_feedback_project_id ON public.movie_project_feedback(project_id);

-- ──────────────────────────────────────────────────────────────────────────
-- updated_at triggers
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_movie_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_movie_projects_updated_at ON public.movie_projects;
CREATE TRIGGER trigger_update_movie_projects_updated_at
  BEFORE UPDATE ON public.movie_projects
  FOR EACH ROW EXECUTE FUNCTION update_movie_updated_at();

DROP TRIGGER IF EXISTS trigger_update_movie_scenes_updated_at ON public.movie_scenes;
CREATE TRIGGER trigger_update_movie_scenes_updated_at
  BEFORE UPDATE ON public.movie_scenes
  FOR EACH ROW EXECUTE FUNCTION update_movie_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- Engagement RPCs (mirrors cinematic toggle_/increment_ functions)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_movie_view_count(project_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.movie_projects SET view_count = view_count + 1 WHERE id = project_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_movie_share_count(project_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.movie_projects SET share_count = share_count + 1 WHERE id = project_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION toggle_movie_like(project_uuid UUID, user_uuid UUID)
RETURNS boolean AS $$
DECLARE liked boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.movie_project_likes WHERE project_id = project_uuid AND user_id = user_uuid) INTO liked;
  IF liked THEN
    DELETE FROM public.movie_project_likes WHERE project_id = project_uuid AND user_id = user_uuid;
    UPDATE public.movie_projects SET like_count = GREATEST(like_count - 1, 0) WHERE id = project_uuid;
    RETURN false;
  ELSE
    INSERT INTO public.movie_project_likes (project_id, user_id) VALUES (project_uuid, user_uuid) ON CONFLICT DO NOTHING;
    UPDATE public.movie_projects SET like_count = like_count + 1 WHERE id = project_uuid;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION toggle_movie_save(project_uuid UUID, user_uuid UUID)
RETURNS boolean AS $$
DECLARE saved boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.movie_project_saves WHERE project_id = project_uuid AND user_id = user_uuid) INTO saved;
  IF saved THEN
    DELETE FROM public.movie_project_saves WHERE project_id = project_uuid AND user_id = user_uuid;
    UPDATE public.movie_projects SET save_count = GREATEST(save_count - 1, 0) WHERE id = project_uuid;
    RETURN false;
  ELSE
    INSERT INTO public.movie_project_saves (project_id, user_id) VALUES (project_uuid, user_uuid) ON CONFLICT DO NOTHING;
    UPDATE public.movie_projects SET save_count = save_count + 1 WHERE id = project_uuid;
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.movie_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_project_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_project_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_project_feedback ENABLE ROW LEVEL SECURITY;

-- Projects: public read; owner write
CREATE POLICY "Movie projects are viewable by everyone" ON public.movie_projects FOR SELECT USING (true);
CREATE POLICY "Users can insert their own movie projects" ON public.movie_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own movie projects" ON public.movie_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own movie projects" ON public.movie_projects FOR DELETE USING (auth.uid() = user_id);

-- Scenes / assets / analytics: public read; owner (via parent project) write
CREATE POLICY "Movie scenes are viewable by everyone" ON public.movie_scenes FOR SELECT USING (true);
CREATE POLICY "Owners manage their movie scenes" ON public.movie_scenes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.movie_projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.movie_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

CREATE POLICY "Movie assets are viewable by everyone" ON public.movie_assets FOR SELECT USING (true);
CREATE POLICY "Owners manage their movie assets" ON public.movie_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.movie_projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.movie_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

CREATE POLICY "Movie analytics are viewable by everyone" ON public.movie_analytics FOR SELECT USING (true);
CREATE POLICY "Owners manage their movie analytics" ON public.movie_analytics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.movie_projects p WHERE p.id = project_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.movie_projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

-- Likes / saves: public read; user manages own
CREATE POLICY "Movie likes are viewable by everyone" ON public.movie_project_likes FOR SELECT USING (true);
CREATE POLICY "Users manage their own movie likes" ON public.movie_project_likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Movie saves are viewable by everyone" ON public.movie_project_saves FOR SELECT USING (true);
CREATE POLICY "Users manage their own movie saves" ON public.movie_project_saves FOR ALL USING (auth.uid() = user_id);

-- Feedback: public read; user inserts own
CREATE POLICY "Movie feedback is viewable by everyone" ON public.movie_project_feedback FOR SELECT USING (true);
CREATE POLICY "Users can insert movie feedback" ON public.movie_project_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Storage bucket for movie assets
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('movie-assets', 'movie-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Movie assets are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'movie-assets');

CREATE POLICY "Authenticated users can upload movie assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'movie-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own movie assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'movie-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own movie assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'movie-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ──────────────────────────────────────────────────────────────────────────
-- Grants
-- ──────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.movie_projects TO authenticated;
GRANT ALL ON public.movie_scenes TO authenticated;
GRANT ALL ON public.movie_assets TO authenticated;
GRANT ALL ON public.movie_analytics TO authenticated;
GRANT ALL ON public.movie_project_likes TO authenticated;
GRANT ALL ON public.movie_project_saves TO authenticated;
GRANT ALL ON public.movie_project_feedback TO authenticated;

GRANT SELECT ON public.movie_projects TO anon;
GRANT SELECT ON public.movie_scenes TO anon;
GRANT SELECT ON public.movie_assets TO anon;
GRANT SELECT ON public.movie_analytics TO anon;
GRANT SELECT ON public.movie_project_likes TO anon;
GRANT SELECT ON public.movie_project_saves TO anon;
GRANT SELECT ON public.movie_project_feedback TO anon;
