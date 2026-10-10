-- Curios Arcade: who made each game (shown on the "Made with AI" cards, and to filter by
-- author). Signed-in creators get their id + display name; guests stay anonymous.
alter table public.arcade_games add column if not exists creator_id uuid references auth.users(id) on delete set null;
alter table public.arcade_games add column if not exists creator_name text;
create index if not exists arcade_games_creator_idx on public.arcade_games (creator_id);
