-- Setup script for reverse-image-searches Supabase Storage bucket
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- 1. Create the bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reverse-image-searches',
  'reverse-image-searches',
  true,  -- Public bucket (required for SERP API to access images)
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads" ON storage.objects;

-- 2. Allow authenticated users to upload images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reverse-image-searches' 
  AND (storage.foldername(name))[1] = 'uploads'
);

-- 3. Allow public read access (required for SERP API)
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reverse-image-searches');

-- 4. Allow users to delete their own uploads (optional, for cleanup)
CREATE POLICY "Allow user delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reverse-image-searches' 
  AND (auth.uid())::text = owner
);

-- 5. Allow anonymous uploads for guest users (if you want to support guest uploads)
CREATE POLICY "Allow anonymous uploads"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'reverse-image-searches'
  AND (storage.foldername(name))[1] = 'uploads'
);

-- Verify the bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'reverse-image-searches';

-- Verify policies were created
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%reverse-image%';
