-- Curios Arcade: visual style chosen in the studio (retro / cyberpunk) and the labels of the
-- on-screen buttons ({ "a": "SHOOT", "b": "" }). Idempotent (see migration drift notes).
alter table public.arcade_games add column if not exists style text not null default 'retro';
alter table public.arcade_games add column if not exists buttons jsonb;
-- Remakes: which game this one improves.
alter table public.arcade_games add column if not exists parent_id uuid references public.arcade_games(id) on delete set null;
