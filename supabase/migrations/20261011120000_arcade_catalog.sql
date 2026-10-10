-- Curios Arcade "Made with AI" catalog: play counter and the inspiration's genres (for the
-- gameplay filters that come next). Idempotent (see migration drift notes).
alter table public.arcade_games add column if not exists plays integer not null default 0;
alter table public.arcade_games add column if not exists genres text[] not null default '{}';

create index if not exists arcade_games_top_idx on public.arcade_games (votes_up desc, plays desc);
create index if not exists arcade_games_new_idx on public.arcade_games (created_at desc);

-- One more play (counted once per page view when the run starts). Only touches the counter.
create or replace function public.arcade_play(game uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.arcade_games set plays = plays + 1 where id = game;
$$;

grant execute on function public.arcade_play(uuid) to anon, authenticated;
