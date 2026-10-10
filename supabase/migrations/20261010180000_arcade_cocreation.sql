-- Curios Arcade co-creation: how the game was made (2D/3D + the player's one-line idea) and
-- 👍/👎 votes. Idempotent (see migration drift notes).

alter table public.arcade_games add column if not exists mode text not null default '2d';
alter table public.arcade_games add column if not exists idea text;
alter table public.arcade_games add column if not exists votes_up integer not null default 0;
alter table public.arcade_games add column if not exists votes_down integer not null default 0;

-- One vote per device is kept client-side; this only moves the counters (vote/prev ∈ -1, 0, 1),
-- so changing 👍 → 👎 is one call. Anyone may vote; nothing else in the row can be changed.
create or replace function public.arcade_vote(game uuid, vote smallint, prev smallint default 0)
returns table (votes_up integer, votes_down integer)
language sql
security definer
set search_path = public
as $$
  update public.arcade_games g set
    votes_up = greatest(0, g.votes_up + (case when vote = 1 then 1 else 0 end) - (case when prev = 1 then 1 else 0 end)),
    votes_down = greatest(0, g.votes_down + (case when vote = -1 then 1 else 0 end) - (case when prev = -1 then 1 else 0 end))
  where g.id = game
  returning g.votes_up, g.votes_down;
$$;

grant execute on function public.arcade_vote(uuid, smallint, smallint) to anon, authenticated;
