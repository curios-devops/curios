-- Migrate existing videos table to add new columns
-- Run this in Supabase SQL Editor

-- 1. Add missing columns to videos table
ALTER TABLE public.videos 
  ADD COLUMN IF NOT EXISTS query TEXT,
  ADD COLUMN IF NOT EXISTS total_chapters INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_duration DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Update existing videos to have default status if null
UPDATE public.videos 
SET status = 'processing' 
WHERE status IS NULL;

-- 3. Create index for status if not exists
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);

-- 4. Verify the updated structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'videos'
ORDER BY ordinal_position;
