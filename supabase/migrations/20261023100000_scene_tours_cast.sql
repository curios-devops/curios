-- Immersion (ex 360 Tour): the world's cast — 3 to 6 characters the director writes for it, each
-- with a transparent full-body cutout (placed in the 3D world), first-person hands (when you explore
-- as them), a voice and dialogue lines. Generated once per tour by the viggle-scene edge function.
ALTER TABLE public.scene_tours ADD COLUMN IF NOT EXISTS cast_members JSONB NOT NULL DEFAULT '[]'::jsonb;
