-- Curios Arcade: which directions a game uses — 'x' (left/right only, e.g. Space Invaders:
-- the arrow pad shows just ◀ ▶) or 'xy'. Idempotent (see migration drift notes).
alter table public.arcade_games add column if not exists axes text not null default 'xy';
