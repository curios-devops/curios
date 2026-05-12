-- Fix 400 error: Make full_video_path nullable
-- This allows empty strings or NULL values for full_video_path
-- Since we're using external URLs (Cloudinary), we don't need local paths

ALTER TABLE public.cinematic_videos
ALTER COLUMN full_video_path DROP NOT NULL;
