-- Migration: Cinematic Videos Table
-- Description: Stores complete cinematic video metadata and engagement data
-- Created: 2026-04-08

-- Create cinematic_videos table
CREATE TABLE IF NOT EXISTS public.cinematic_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Query and content
  query TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  narrative TEXT,

  -- Video assets
  full_video_url TEXT NOT NULL,
  full_video_path TEXT, -- Nullable - not needed when using external URLs like Cloudinary
  thumbnail_url TEXT,

  -- Metadata
  scene_count INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  aspect_ratio TEXT DEFAULT '16:9',

  -- Scene data (JSONB for flexibility)
  scenes JSONB DEFAULT '[]'::jsonb,

  -- Generation metadata
  generation_time_ms INTEGER,
  status TEXT DEFAULT 'complete',

  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cinematic_videos_user_id ON public.cinematic_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_cinematic_videos_created_at ON public.cinematic_videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cinematic_videos_status ON public.cinematic_videos(status);
CREATE INDEX IF NOT EXISTS idx_cinematic_videos_view_count ON public.cinematic_videos(view_count DESC);

-- Create user likes junction table
CREATE TABLE IF NOT EXISTS public.cinematic_video_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.cinematic_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_cinematic_likes_user_id ON public.cinematic_video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_cinematic_likes_video_id ON public.cinematic_video_likes(video_id);

-- Create user saves junction table
CREATE TABLE IF NOT EXISTS public.cinematic_video_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.cinematic_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_cinematic_saves_user_id ON public.cinematic_video_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_cinematic_saves_video_id ON public.cinematic_video_saves(video_id);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.cinematic_video_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.cinematic_videos(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cinematic_feedback_video_id ON public.cinematic_video_feedback(video_id);
CREATE INDEX IF NOT EXISTS idx_cinematic_feedback_user_id ON public.cinematic_video_feedback(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cinematic_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_cinematic_videos_updated_at ON public.cinematic_videos;
CREATE TRIGGER trigger_update_cinematic_videos_updated_at
  BEFORE UPDATE ON public.cinematic_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_cinematic_videos_updated_at();

-- Create function to increment view count
CREATE OR REPLACE FUNCTION increment_video_view_count(video_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.cinematic_videos
  SET view_count = view_count + 1
  WHERE id = video_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to toggle like
CREATE OR REPLACE FUNCTION toggle_video_like(video_uuid UUID, user_uuid UUID)
RETURNS boolean AS $$
DECLARE
  liked boolean;
BEGIN
  -- Check if already liked
  SELECT EXISTS(
    SELECT 1 FROM public.cinematic_video_likes
    WHERE video_id = video_uuid AND user_id = user_uuid
  ) INTO liked;

  IF liked THEN
    -- Unlike: Remove like and decrement count
    DELETE FROM public.cinematic_video_likes
    WHERE video_id = video_uuid AND user_id = user_uuid;

    UPDATE public.cinematic_videos
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = video_uuid;

    RETURN false;
  ELSE
    -- Like: Add like and increment count
    INSERT INTO public.cinematic_video_likes (video_id, user_id)
    VALUES (video_uuid, user_uuid)
    ON CONFLICT DO NOTHING;

    UPDATE public.cinematic_videos
    SET like_count = like_count + 1
    WHERE id = video_uuid;

    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to toggle save
CREATE OR REPLACE FUNCTION toggle_video_save(video_uuid UUID, user_uuid UUID)
RETURNS boolean AS $$
DECLARE
  saved boolean;
BEGIN
  -- Check if already saved
  SELECT EXISTS(
    SELECT 1 FROM public.cinematic_video_saves
    WHERE video_id = video_uuid AND user_id = user_uuid
  ) INTO saved;

  IF saved THEN
    -- Unsave: Remove save and decrement count
    DELETE FROM public.cinematic_video_saves
    WHERE video_id = video_uuid AND user_id = user_uuid;

    UPDATE public.cinematic_videos
    SET save_count = GREATEST(save_count - 1, 0)
    WHERE id = video_uuid;

    RETURN false;
  ELSE
    -- Save: Add save and increment count
    INSERT INTO public.cinematic_video_saves (video_id, user_id)
    VALUES (video_uuid, user_uuid)
    ON CONFLICT DO NOTHING;

    UPDATE public.cinematic_videos
    SET save_count = save_count + 1
    WHERE id = video_uuid;

    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE public.cinematic_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinematic_video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinematic_video_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cinematic_video_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view cinematic videos
CREATE POLICY "Cinematic videos are viewable by everyone"
  ON public.cinematic_videos FOR SELECT
  USING (true);

-- Policy: Users can insert their own videos
CREATE POLICY "Users can insert their own videos"
  ON public.cinematic_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own videos
CREATE POLICY "Users can update their own videos"
  ON public.cinematic_videos FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own videos
CREATE POLICY "Users can delete their own videos"
  ON public.cinematic_videos FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Anyone can view likes
CREATE POLICY "Likes are viewable by everyone"
  ON public.cinematic_video_likes FOR SELECT
  USING (true);

-- Policy: Users can manage their own likes
CREATE POLICY "Users can manage their own likes"
  ON public.cinematic_video_likes FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Anyone can view saves
CREATE POLICY "Saves are viewable by everyone"
  ON public.cinematic_video_saves FOR SELECT
  USING (true);

-- Policy: Users can manage their own saves
CREATE POLICY "Users can manage their own saves"
  ON public.cinematic_video_saves FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Anyone can view feedback
CREATE POLICY "Feedback is viewable by everyone"
  ON public.cinematic_video_feedback FOR SELECT
  USING (true);

-- Policy: Users can insert feedback
CREATE POLICY "Users can insert feedback"
  ON public.cinematic_video_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for cinematic assets (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('cinematic-assets', 'cinematic-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Anyone can view cinematic assets
CREATE POLICY "Cinematic assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cinematic-assets');

-- Storage policy: Authenticated users can upload cinematic assets
CREATE POLICY "Authenticated users can upload cinematic assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cinematic-assets' AND
    auth.role() = 'authenticated'
  );

-- Storage policy: Users can update their own cinematic assets
CREATE POLICY "Users can update their own cinematic assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cinematic-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: Users can delete their own cinematic assets
CREATE POLICY "Users can delete their own cinematic assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cinematic-assets' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Grant permissions
GRANT ALL ON public.cinematic_videos TO authenticated;
GRANT ALL ON public.cinematic_video_likes TO authenticated;
GRANT ALL ON public.cinematic_video_saves TO authenticated;
GRANT ALL ON public.cinematic_video_feedback TO authenticated;

GRANT SELECT ON public.cinematic_videos TO anon;
GRANT SELECT ON public.cinematic_video_likes TO anon;
GRANT SELECT ON public.cinematic_video_saves TO anon;
GRANT SELECT ON public.cinematic_video_feedback TO anon;
