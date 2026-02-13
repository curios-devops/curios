-- Verify video generation in production
-- Run this in Supabase SQL Editor after generating a video

-- 1. Check latest videos
SELECT 
  id,
  title,
  chapter_count,
  total_duration,
  status,
  created_at,
  completed_at
FROM videos 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check chapters for the latest video
SELECT 
  chapter_id,
  order_index,
  duration,
  file_size,
  render_time,
  storage_url,
  created_at
FROM chapters 
WHERE video_id = (SELECT id FROM videos ORDER BY created_at DESC LIMIT 1)
ORDER BY order_index;

-- 3. Get full video details with chapters
SELECT 
  v.id as video_id,
  v.title,
  v.status,
  v.chapter_count,
  v.total_duration as total_duration_seconds,
  COUNT(c.id) as chapters_saved,
  SUM(c.duration) as actual_duration,
  SUM(c.file_size) as total_file_size_bytes,
  ROUND(SUM(c.file_size) / 1024.0 / 1024.0, 2) as total_size_mb,
  AVG(c.render_time) as avg_render_time_ms
FROM videos v
LEFT JOIN chapters c ON c.video_id = v.id
WHERE v.created_at > NOW() - INTERVAL '1 hour'
GROUP BY v.id, v.title, v.status, v.chapter_count, v.total_duration
ORDER BY v.created_at DESC;

-- 4. Check storage files count
SELECT 
  COUNT(*) as total_files,
  ROUND(SUM((metadata->>'size')::bigint) / 1024.0 / 1024.0, 2) as total_mb
FROM storage.objects 
WHERE bucket_id = 'videos'
AND created_at > NOW() - INTERVAL '1 hour';
