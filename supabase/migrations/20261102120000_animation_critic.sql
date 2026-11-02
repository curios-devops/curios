-- Animation: what it stands on (sources), the critic's verdict before publishing (review) and how many
-- times it was made again (regens: each question gets a few, whoever asks).
ALTER TABLE public.animations
  ADD COLUMN IF NOT EXISTS sources JSONB,
  ADD COLUMN IF NOT EXISTS review JSONB,
  ADD COLUMN IF NOT EXISTS regens INTEGER NOT NULL DEFAULT 0;
