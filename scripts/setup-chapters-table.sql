-- Create chapters table for video metadata
-- Run this in Supabase SQL Editor

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.chapters (
  id BIGSERIAL PRIMARY KEY,
  video_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration NUMERIC NOT NULL,
  storage_url TEXT NOT NULL,
  free BOOLEAN DEFAULT true,
  render_time INTEGER,
  file_size INTEGER,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique chapter per video
  UNIQUE(video_id, chapter_id)
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chapters_video_id ON public.chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON public.chapters(user_id);

-- 3. Enable Row Level Security
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist
DROP POLICY IF EXISTS "chapters_insert_policy" ON public.chapters;
DROP POLICY IF EXISTS "chapters_select_policy" ON public.chapters;
DROP POLICY IF EXISTS "chapters_update_policy" ON public.chapters;
DROP POLICY IF EXISTS "chapters_delete_policy" ON public.chapters;

-- 5. Create policies (allow public access for Studio)
CREATE POLICY "chapters_insert_policy"
ON public.chapters
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "chapters_select_policy"
ON public.chapters
FOR SELECT
TO public
USING (true);

CREATE POLICY "chapters_update_policy"
ON public.chapters
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "chapters_delete_policy"
ON public.chapters
FOR DELETE
TO public
USING (true);

-- 6. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.chapters;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 7. Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'chapters'
ORDER BY ordinal_position;

-- 8. Verify policies
SELECT 
  policyname,
  roles,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'chapters'
ORDER BY policyname;
