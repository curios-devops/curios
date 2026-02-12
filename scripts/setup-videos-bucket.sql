-- Setup script for 'videos' Supabase Storage bucket
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- 1. Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,  -- Public bucket (required for video playback)
  52428800,  -- 50MB limit per file
  ARRAY['video/webm', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow authenticated video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video read" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated video updates" ON storage.objects;

-- 2. Allow authenticated users to upload videos
CREATE POLICY "Allow authenticated video uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
);

-- 3. Allow public read access (required for video playback)
CREATE POLICY "Allow public video read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- 4. Allow users to delete their own videos (optional, for cleanup)
CREATE POLICY "Allow user delete own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' 
  AND auth.uid() = owner::uuid
);

-- 5. Allow authenticated users to update/overwrite videos (upsert)
CREATE POLICY "Allow authenticated video updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'videos';

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%video%'
ORDER BY policyname;
