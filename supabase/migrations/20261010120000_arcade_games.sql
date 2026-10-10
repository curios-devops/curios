-- Games 🎮 → Curios Arcade: AI-made mini arcade games ("create your own game inspired by X").
-- arcade_games: the generated game (code only — the game itself never saves state); shared by link /arcade/:id.
-- arcade_scores: one row per finished run the player chose to save (name + score) → today's
-- podium (gold / silver / bronze) and the all-time Hall of Fame. Idempotent (see migration drift notes).

create table if not exists public.arcade_games (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  inspired_by text,
  how_to text,
  palette text[] not null default '{}',
  code text not null,
  model text,
  created_at timestamptz not null default now()
);

alter table public.arcade_games enable row level security;

-- Anyone with the link can play; rows are written only by the arcade-generate edge function (service role).
drop policy if exists "Arcade games are playable by anyone" on public.arcade_games;
create policy "Arcade games are playable by anyone" on public.arcade_games
  for select using (true);

create table if not exists public.arcade_scores (
  id bigint generated always as identity primary key,
  game_id uuid not null references public.arcade_games(id) on delete cascade,
  player text not null check (char_length(btrim(player)) between 1 and 16),
  score integer not null check (score >= 0 and score < 100000000),
  created_at timestamptz not null default now()
);

create index if not exists arcade_scores_game_score_idx on public.arcade_scores (game_id, score desc);
create index if not exists arcade_scores_game_created_idx on public.arcade_scores (game_id, created_at desc);

alter table public.arcade_scores enable row level security;

drop policy if exists "Arcade scores are public" on public.arcade_scores;
create policy "Arcade scores are public" on public.arcade_scores
  for select using (true);

-- Casual leaderboard: any player (guest or signed in) can post a score; no updates or deletes.
drop policy if exists "Anyone can post an arcade score" on public.arcade_scores;
create policy "Anyone can post an arcade score" on public.arcade_scores
  for insert to anon, authenticated with check (true);
