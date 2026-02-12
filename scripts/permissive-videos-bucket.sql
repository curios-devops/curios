-- TEMPORARY: Disable RLS for testing (NOT RECOMMENDED FOR PRODUCTION)
-- This will allow uploads without authentication checks
-- Run this ONLY for testing, then re-enable with proper policies

-- Option 1: Make bucket completely public (temporary testing only)
UPDATE storage.buckets 
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['video/webm', 'video/mp4']
WHERE id = 'videos';

-- Option 2: Drop ALL existing policies and create permissive ones
DROP POLICY IF EXISTS "Allow authenticated video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video read" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated video updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous video uploads" ON storage.objects;

-- Create super permissive policies for testing
CREATE POLICY "Allow all uploads to videos bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow all reads from videos bucket"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Allow all updates to videos bucket"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'videos')
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Allow all deletes from videos bucket"
ON storage.objects
FOR DELETE
USING (bucket_id = 'videos');

-- Verify
SELECT policyname, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%videos bucket%';
