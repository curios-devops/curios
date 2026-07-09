-- Async movie-video jobs. The self-hosted RunPod render takes minutes — far beyond an
-- edge function's synchronous response window — so generate-movie-video now creates a row
-- here, kicks the RunPod job with a webhook, and returns immediately. The webhook fills in
-- video_url when done; the movie page polls this row.
--
-- Access model: the row's UUID is the capability — clients (including guests) poll by id.
-- SELECT is open; INSERT/UPDATE happen only via the service role (edge function).

CREATE TABLE IF NOT EXISTS public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,          -- may be 'curios-guest'; not an FK on purpose
  project_id TEXT,
  scene_id TEXT,
  runpod_job_id TEXT,

  status TEXT NOT NULL DEFAULT 'processing', -- processing | ready | error
  video_url TEXT,
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_jobs_select_by_id" ON public.video_jobs;
CREATE POLICY "video_jobs_select_by_id" ON public.video_jobs
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.video_jobs TO anon;
GRANT SELECT ON public.video_jobs TO authenticated;
