-- Tour (360° / 3D) video type: one Viggle scene per question, kept so the same question never
-- pays for a second scene ($0.06 each). The .spz and panorama are copied to our storage
-- (Viggle's signed URLs expire in 3 h). Written only by the viggle-scene edge function.
CREATE TABLE IF NOT EXISTS public.scene_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_key TEXT NOT NULL UNIQUE,      -- normalized question
  question TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  overview TEXT NOT NULL DEFAULT '',
  scene_prompt TEXT NOT NULL DEFAULT '',
  related JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ question, search }]
  spz_url TEXT NOT NULL,
  panorama_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- who made it
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_scene_tours_user_created ON public.scene_tours(user_id, created_at DESC);

ALTER TABLE public.scene_tours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Scene tours are viewable by everyone" ON public.scene_tours;
CREATE POLICY "Scene tours are viewable by everyone" ON public.scene_tours FOR SELECT USING (true);
GRANT SELECT ON public.scene_tours TO anon, authenticated;
