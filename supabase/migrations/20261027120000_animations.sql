-- Animation (Video page type): one live stage per question, written by the animation-studio edge
-- function — a 3D machine (three.js) or an animated story (SVG + GSAP) as one HTML page. Only the
-- function reads and writes it (service role); daily caps count rows by user or hashed connection.
CREATE TABLE IF NOT EXISTS public.animations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key TEXT NOT NULL UNIQUE,
  question TEXT NOT NULL,
  kind TEXT NOT NULL,
  style TEXT,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'making',
  response_id TEXT,
  html TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.animations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_animations_created ON public.animations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animations_user_created ON public.animations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_animations_ip_created ON public.animations(creator_ip_hash, created_at DESC);
