-- Song recognition (Music mode's "listen" button): one row per recognized clip, written by the
-- song-recognize edge function. Only the function reads and writes it (service role); daily caps
-- count rows by user or hashed connection. The clip itself is deleted right after recognition.
CREATE TABLE IF NOT EXISTS public.song_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  artist TEXT,
  shazam_key TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.song_recognitions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_song_recognitions_created ON public.song_recognitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_recognitions_user_created ON public.song_recognitions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_song_recognitions_ip_created ON public.song_recognitions(creator_ip_hash, created_at DESC);
