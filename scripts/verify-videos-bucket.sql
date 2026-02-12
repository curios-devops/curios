-- Verification script for 'videos' bucket
-- Run this in Supabase SQL Editor to check configuration

-- 1. Check if bucket exists
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'videos';

-- 2. Check all policies for storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;

-- 3. Check specifically video-related policies
SELECT 
  policyname,
  roles,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_check,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_status
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%video%'
ORDER BY policyname;
