-- Animation: a story as a film in chapters. The director's plan, and in it each chapter's cover and code as they are made.
ALTER TABLE public.animations ADD COLUMN IF NOT EXISTS plan JSONB;
