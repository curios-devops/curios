-- Curios Arcade: AI-painted art for 16-bit-era-and-newer inspirations — { bg, sheet } image URLs
-- (Nano Banana 2 Lite) plus the plan the model described them with. Null = drawn by code.
-- Idempotent (see migration drift notes).
alter table public.arcade_games add column if not exists art jsonb;
