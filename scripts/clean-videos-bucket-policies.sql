-- Clean and recreate videos bucket policies
-- This will fix the duplicate and conflicting policies

-- 1. Drop ALL existing video-related policies
DROP POLICY IF EXISTS "Allow anon video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated video updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video read" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own video files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own video files" ON storage.objects;

-- 2. Create clean, simple policies

-- Allow anyone (anon + authenticated) to upload videos
CREATE POLICY "videos_upload_policy"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'videos');

-- Allow anyone to read videos (for playback)
CREATE POLICY "videos_read_policy"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Allow anyone to update/overwrite videos
CREATE POLICY "videos_update_policy"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');

-- Allow anyone to delete videos
CREATE POLICY "videos_delete_policy"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'videos');

-- 3. Verify the new policies
SELECT 
  policyname,
  roles,
  cmd as operation
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE 'videos_%'
ORDER BY policyname;
