-- Curios Arcade: screen size per game. New games are 240×240; the first ones were written
-- for 160×160 and keep it. Idempotent (see migration drift notes).
alter table public.arcade_games add column if not exists res integer not null default 160;
