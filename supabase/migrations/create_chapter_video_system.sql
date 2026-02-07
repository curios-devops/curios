-- ============================================
-- Chapter-based Video System - Database Schema
-- ============================================

-- Tabla videos
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),  -- NULL si guest
  title TEXT NOT NULL,
  description TEXT,
  total_duration INTEGER NOT NULL,  -- segundos
  chapter_count INTEGER NOT NULL,
  status TEXT DEFAULT 'rendering',  -- 'rendering' | 'ready' | 'failed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla chapters
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  chapter_id TEXT NOT NULL,  -- 'chapter_001', 'chapter_002', etc.
  order_index INTEGER NOT NULL,
  duration INTEGER NOT NULL,  -- segundos
  storage_url TEXT NOT NULL,
  free BOOLEAN DEFAULT true,
  render_time INTEGER,  -- ms
  file_size INTEGER,  -- bytes
  user_id TEXT DEFAULT 'curios',  -- 'curios' para guests
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(video_id, chapter_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chapters_video_id ON chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(video_id, order_index);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- Storage bucket para videos (ejecutar solo una vez)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on tables
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Policy: Videos are readable by everyone
CREATE POLICY "Videos are publicly readable"
ON videos FOR SELECT
USING (true);

-- Policy: Authenticated users can insert videos
CREATE POLICY "Authenticated users can create videos"
ON videos FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own videos
CREATE POLICY "Users can update own videos"
ON videos FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Chapters are readable by everyone
CREATE POLICY "Chapters are publicly readable"
ON chapters FOR SELECT
USING (true);

-- Policy: Authenticated users can insert chapters
CREATE POLICY "Authenticated users can create chapters"
ON chapters FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update chapters from their videos
CREATE POLICY "Users can update own chapters"
ON chapters FOR UPDATE
USING (
  video_id IN (
    SELECT id FROM videos WHERE user_id = auth.uid()
  )
);

-- ============================================
-- Storage Policies
-- ============================================

-- Policy: Videos are publicly accessible for viewing
CREATE POLICY "Videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Policy: Authenticated users can upload videos
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'videos' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their own videos
CREATE POLICY "Users can update own video files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own videos
CREATE POLICY "Users can delete own video files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function: Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger: Auto-update updated_at on videos table
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Queries (for testing)
-- ============================================

-- Get all videos with chapter count
-- SELECT v.*, COUNT(c.id) as actual_chapter_count
-- FROM videos v
-- LEFT JOIN chapters c ON v.id = c.video_id
-- GROUP BY v.id
-- ORDER BY v.created_at DESC;

-- Get chapters for a specific video
-- SELECT * FROM chapters
-- WHERE video_id = 'your-video-id-here'
-- ORDER BY order_index ASC;

-- Get video with all chapters
-- SELECT v.*, 
--        json_agg(
--          json_build_object(
--            'id', c.id,
--            'chapter_id', c.chapter_id,
--            'order_index', c.order_index,
--            'duration', c.duration,
--            'storage_url', c.storage_url,
--            'free', c.free
--          ) ORDER BY c.order_index
--        ) as chapters
-- FROM videos v
-- LEFT JOIN chapters c ON v.id = c.video_id
-- WHERE v.id = 'your-video-id-here'
-- GROUP BY v.id;
