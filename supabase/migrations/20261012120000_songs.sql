-- Curios Songs: original songs made in the song studio ("create your own song inspired by X"),
-- listed in Creative next to the games. Music by ElevenLabs; the canvas animations are code
-- run in a sandboxed iframe like the arcade games. Idempotent (see migration drift notes).
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  inspired_by text,
  inspired_artist text,
  style text not null default 'original',
  language text,
  voice boolean not null default true,
  length text not null default 'short',
  idea text,
  -- { parts: [{ id, type, lines }], order: [part ids as sung] }
  lyrics jsonb,
  -- [{ text, start_ms, end_ms, words: [{ w, s, e }] }] from the music model's word timestamps
  captions jsonb,
  audio_url text not null,
  -- The accompaniment alone (voice off), separated the first time someone asks for it.
  instrumental_url text,
  duration_ms integer,
  palette text[] not null default '{}',
  -- { abstract, drawn, particles }: animation code, one per style
  animations jsonb,
  genres text[] not null default '{}',
  votes_up integer not null default 0,
  votes_down integer not null default 0,
  plays integer not null default 0,
  creator_id uuid references auth.users(id) on delete set null,
  creator_name text,
  created_at timestamptz not null default now()
);

create index if not exists songs_new_idx on public.songs (created_at desc);
create index if not exists songs_creator_idx on public.songs (creator_id);

alter table public.songs enable row level security;

-- Anyone with the link can listen; rows are written only by the song-generate edge function (service role).
drop policy if exists "Songs are public" on public.songs;
create policy "Songs are public" on public.songs for select using (true);

-- Same counters as the arcade: vote/prev ∈ -1, 0, 1 (one vote per device is kept client-side).
create or replace function public.song_vote(song uuid, vote smallint, prev smallint default 0)
returns table (votes_up integer, votes_down integer)
language sql
security definer
set search_path = public
as $$
  update public.songs s set
    votes_up = greatest(0, s.votes_up + (case when vote = 1 then 1 else 0 end) - (case when prev = 1 then 1 else 0 end)),
    votes_down = greatest(0, s.votes_down + (case when vote = -1 then 1 else 0 end) - (case when prev = -1 then 1 else 0 end))
  where s.id = song
  returning s.votes_up, s.votes_down;
$$;

create or replace function public.song_play(song uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.songs set plays = plays + 1 where id = song;
$$;

grant execute on function public.song_vote(uuid, smallint, smallint) to anon, authenticated;
grant execute on function public.song_play(uuid) to anon, authenticated;
