-- Guests can create 360 Tours too (1 Pro Credit). To keep Viggle spend bounded without an
-- account, a guest's tours are counted by a hash of their IP (never the IP itself).
ALTER TABLE public.scene_tours ADD COLUMN IF NOT EXISTS creator_ip_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_scene_tours_ip_created ON public.scene_tours(creator_ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scene_tours_created ON public.scene_tours(created_at DESC);
