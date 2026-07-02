-- Enhanced videos: the premium (gpt-image-2 + Gemini Omni Flash) renders a user triggers via
-- the movie "Enhance" action. Backs (1) the server-owned background job — the enhance-swipe
-- edge function creates a row, then finishes + fills it in via EdgeRuntime.waitUntil even if the
-- browser navigates away/reloads — and (2) the Home "unseen" carousel: rows with status='ready'
-- AND seen_at IS NULL surface on top of Home; once viewed, seen_at is set and they drop into the
-- existing Discover feed (the parent movie_project already appears there once complete).

CREATE TABLE IF NOT EXISTS public.enhanced_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.movie_projects(id) ON DELETE CASCADE,
  swipe_order INTEGER NOT NULL DEFAULT 0,

  title TEXT NOT NULL DEFAULT '',
  image_prompt TEXT,
  video_prompt TEXT,

  image_url TEXT,
  video_url TEXT,

  status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | error
  error TEXT,

  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Home carousel query: a user's ready-but-unseen renders, newest first.
CREATE INDEX IF NOT EXISTS idx_enhanced_videos_unseen
  ON public.enhanced_videos(user_id, status, seen_at, created_at DESC);

ALTER TABLE public.enhanced_videos ENABLE ROW LEVEL SECURITY;

-- Owner-only access (service role, used by the edge function, bypasses RLS).
DROP POLICY IF EXISTS "enhanced_videos_select_own" ON public.enhanced_videos;
CREATE POLICY "enhanced_videos_select_own" ON public.enhanced_videos
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "enhanced_videos_insert_own" ON public.enhanced_videos;
CREATE POLICY "enhanced_videos_insert_own" ON public.enhanced_videos
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "enhanced_videos_update_own" ON public.enhanced_videos;
CREATE POLICY "enhanced_videos_update_own" ON public.enhanced_videos
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "enhanced_videos_delete_own" ON public.enhanced_videos;
CREATE POLICY "enhanced_videos_delete_own" ON public.enhanced_videos
  FOR DELETE TO authenticated USING (user_id = auth.uid());

GRANT ALL ON public.enhanced_videos TO authenticated;
