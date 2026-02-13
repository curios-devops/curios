-- Fix total_duration column type
-- Run this in Supabase SQL Editor

-- 1. Drop the column if it exists with wrong type
ALTER TABLE public.videos 
  DROP COLUMN IF EXISTS total_duration;

-- 2. Add it back with correct DECIMAL type
ALTER TABLE public.videos 
  ADD COLUMN total_duration DECIMAL(10,2) DEFAULT 0;

-- 3. Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'videos'
  AND column_name = 'total_duration';
