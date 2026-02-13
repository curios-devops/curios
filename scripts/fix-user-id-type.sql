-- Fix user_id column type to UUID
-- Run this in Supabase SQL Editor

-- 0. Drop policies that depend on user_id
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can view own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can delete own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can insert own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can view own chapters" ON public.chapters;

-- 1. Drop user_id from videos table
ALTER TABLE public.videos 
  DROP COLUMN IF EXISTS user_id CASCADE;

-- 2. Add it back as UUID (nullable for testing)
ALTER TABLE public.videos 
  ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 3. Drop user_id from chapters table
ALTER TABLE public.chapters 
  DROP COLUMN IF EXISTS user_id CASCADE;

-- 4. Add it back as UUID (nullable for testing)
ALTER TABLE public.chapters 
  ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON public.videos(user_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON public.chapters(user_id);

-- 6. Verify the fix
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('videos', 'chapters')
  AND column_name = 'user_id'
ORDER BY table_name;
