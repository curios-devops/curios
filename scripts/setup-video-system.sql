-- Complete video system: videos + chapters tables
-- Run this in Supabase SQL Editor

-- ========================================
-- 1. VIDEOS TABLE (for sharing complete videos)
-- ========================================

-- Check if videos table exists and get its id type
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'videos') THEN
    RAISE NOTICE 'Videos table already exists, skipping creation';
  ELSE
    CREATE TABLE public.videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT,
      query TEXT, -- Nullable to support existing videos
      total_chapters INTEGER NOT NULL DEFAULT 0,
      total_duration DECIMAL(10,2) NOT NULL DEFAULT 0,
      thumbnail_url TEXT,
      status TEXT DEFAULT 'processing', -- processing, ready, failed
      user_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  END IF;
END $$;

-- Index for user's videos
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "videos_insert_policy" ON public.videos;
DROP POLICY IF EXISTS "videos_select_policy" ON public.videos;
DROP POLICY IF EXISTS "videos_update_policy" ON public.videos;

-- Create policies
CREATE POLICY "videos_insert_policy"
ON public.videos FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "videos_select_policy"
ON public.videos FOR SELECT TO public USING (true);

CREATE POLICY "videos_update_policy"
ON public.videos FOR UPDATE TO public USING (true) WITH CHECK (true);

-- ========================================
-- 2. CHAPTERS TABLE (for individual chapters)
-- ========================================

DROP TABLE IF EXISTS public.chapters CASCADE;

CREATE TABLE public.chapters (
  id BIGSERIAL PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration DECIMAL(10,2) NOT NULL, -- Decimal for 6.5 seconds
  storage_url TEXT NOT NULL,
  free BOOLEAN DEFAULT true,
  render_time INTEGER,
  file_size BIGINT, -- Changed to BIGINT for larger files
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(video_id, chapter_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chapters_video_id ON public.chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON public.chapters(user_id);

-- Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "chapters_insert_policy" ON public.chapters;
DROP POLICY IF EXISTS "chapters_select_policy" ON public.chapters;
DROP POLICY IF EXISTS "chapters_update_policy" ON public.chapters;
DROP POLICY IF EXISTS "chapters_delete_policy" ON public.chapters;

-- Create policies
CREATE POLICY "chapters_insert_policy"
ON public.chapters FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "chapters_select_policy"
ON public.chapters FOR SELECT TO public USING (true);

CREATE POLICY "chapters_update_policy"
ON public.chapters FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "chapters_delete_policy"
ON public.chapters FOR DELETE TO public USING (true);

-- ========================================
-- 3. TRIGGERS
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Videos trigger
DROP TRIGGER IF EXISTS set_videos_updated_at ON public.videos;
CREATE TRIGGER set_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Chapters trigger
DROP TRIGGER IF EXISTS set_chapters_updated_at ON public.chapters;
CREATE TRIGGER set_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- 4. VERIFY
-- ========================================

-- Verify videos table
SELECT 'VIDEOS TABLE' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'videos'
ORDER BY ordinal_position;

-- Verify chapters table
SELECT 'CHAPTERS TABLE' as table_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'chapters'
ORDER BY ordinal_position;

-- Verify policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename IN ('videos', 'chapters')
ORDER BY tablename, policyname;
