-- Setup script for studio-videos Supabase Storage bucket
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
-- This bucket stores video chunks and final stitched videos

-- 1. Create the studio-videos bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-videos',
  'studio-videos',
  true,  -- Public bucket (required for video playback in browser)
  52428800,  -- 50MB limit per file (chunks are typically 5-15MB)
  ARRAY['video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow authenticated video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video read" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon video uploads" ON storage.objects;

-- 2. Allow authenticated users to upload videos
CREATE POLICY "Allow authenticated video uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-videos'
);

-- 3. Allow public read access (required for video playback)
CREATE POLICY "Allow public video read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'studio-videos');

-- 4. Allow users to delete their own videos (for cleanup)
CREATE POLICY "Allow user delete own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'studio-videos' 
  AND auth.uid() = owner::uuid
);

-- 5. Allow anonymous uploads (for Netlify functions calling from server-side)
-- This is needed because Netlify functions use service role key
CREATE POLICY "Allow anon video uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'studio-videos'
);

-- 6. Verify bucket was created
SELECT 
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'studio-videos';

-- Expected output:
-- id: studio-videos
-- name: studio-videos
-- public: true
-- file_size_limit: 52428800
-- allowed_mime_types: {video/mp4, video/webm}

-- Note: After running this script, videos will be accessible at:
-- https://[PROJECT_REF].supabase.co/storage/v1/object/public/studio-videos/[filename]
