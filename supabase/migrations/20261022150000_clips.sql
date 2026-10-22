-- Clips: the moment of a real video that answers a question (a film/TV scene from find-scene, or a
-- YouTube segment), one per question so the same question never pays twice. A find-scene clip is
-- copied to our storage (its URL is signed and expires). Written only by the clip-search edge fn.
CREATE TABLE IF NOT EXISTS public.clip_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key TEXT NOT NULL UNIQUE,      -- normalized question
  question TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('youtube', 'scene')),
  video_id TEXT,                          -- YouTube id (source youtube)
  video_url TEXT,                         -- our MP4 copy (source scene)
  start_s NUMERIC NOT NULL DEFAULT 0,     -- the answering segment (YouTube); 0..duration for a scene
  end_s NUMERIC NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  credit TEXT NOT NULL DEFAULT '',        -- channel, or film/series + year
  source_url TEXT NOT NULL DEFAULT '',    -- the original (YouTube page / TMDB page)
  thumbnail TEXT NOT NULL DEFAULT '',
  why TEXT NOT NULL DEFAULT '',
  overview TEXT NOT NULL DEFAULT '',
  fiction BOOLEAN NOT NULL DEFAULT false, -- characters may answer in generated clips; real people never
  moments JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{ t, label }]
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ t, d, text }] seconds, for questions to the clip
  related JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{ question, search }]
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_ip_hash TEXT,                   -- guests: hash of their IP (never the IP itself)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clip_answers_user_created ON public.clip_answers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clip_answers_ip_created ON public.clip_answers(creator_ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clip_answers_created ON public.clip_answers(created_at DESC);

ALTER TABLE public.clip_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clip answers are viewable by everyone" ON public.clip_answers;
CREATE POLICY "Clip answers are viewable by everyone" ON public.clip_answers FOR SELECT USING (true);
GRANT SELECT ON public.clip_answers TO anon, authenticated;

-- Questions asked to a clip (each one generates Pruna clips and costs a Pro Credit): counted for
-- the daily caps and kept with the answer.
CREATE TABLE IF NOT EXISTS public.clip_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID REFERENCES public.clip_answers(id) ON DELETE CASCADE,
  at_s NUMERIC NOT NULL DEFAULT 0,        -- where the viewer paused
  question TEXT NOT NULL,
  answer JSONB NOT NULL DEFAULT '{}'::jsonb, -- { text, voice, shots: [{ videoUrl, line }] }
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clip_questions_user_created ON public.clip_questions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clip_questions_ip_created ON public.clip_questions(creator_ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clip_questions_created ON public.clip_questions(created_at DESC);
ALTER TABLE public.clip_questions ENABLE ROW LEVEL SECURITY; -- edge function only (service role)
