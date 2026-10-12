-- Telemetry for the hidden /tele dashboard. One row per page view (route or new search):
-- the feature, the app language and the browser time zone (region = its continent). No IP,
-- no email; `visitor` is a random per-browser id for unique counts. Idempotent.
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  feature text not null,
  lang text,
  tz text,
  region text,
  visitor text,
  user_id uuid
);

create index if not exists page_views_created_idx on public.page_views (created_at desc);

-- No policies: rows go in only through track_visit, and are read only by tele_stats (service role).
alter table public.page_views enable row level security;

create or replace function public.track_visit(feature text, lang text, tz text, visitor text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.page_views (feature, lang, tz, region, visitor, user_id)
  values (left(feature, 24), left(lang, 8), left(tz, 48), left(split_part(tz, '/', 1), 16), left(visitor, 40), auth.uid());
$$;

grant execute on function public.track_visit(text, text, text, text) to anon, authenticated;

-- Everything the dashboard shows from our own database, for the [p_from, p_to) range.
create or replace function public.tele_stats(p_from timestamptz, p_to timestamptz)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with v as (select * from public.page_views where created_at >= least(p_from, date_trunc('year', now()), now() - interval '365 days')),
  r as (select * from v where created_at >= p_from and created_at < p_to)
  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'new7', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'new30', (select count(*) from auth.users where created_at > now() - interval '30 days'),
      'active30', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
      'pro', (select count(*) from public.profiles where subscription_status = 'active')
    ),
    'visits', (select jsonb_object_agg(k, jsonb_build_object('views', n, 'visitors', u)) from (
      select '24h' k, count(*) n, count(distinct visitor) u from v where created_at > now() - interval '1 day'
      union all select '7d', count(*), count(distinct visitor) from v where created_at > now() - interval '7 days'
      union all select '30d', count(*), count(distinct visitor) from v where created_at > now() - interval '30 days'
      union all select '90d', count(*), count(distinct visitor) from v where created_at > now() - interval '90 days'
      union all select '365d', count(*), count(distinct visitor) from v where created_at > now() - interval '365 days'
      union all select 'ytd', count(*), count(distinct visitor) from v where created_at >= date_trunc('year', now())
      union all select 'range', count(*), count(distinct visitor) from r
    ) w),
    'tracking_since', (select min(created_at) from public.page_views),
    'by_feature', coalesce((select jsonb_object_agg(feature, n) from (select feature, count(*) n from r group by 1) x), '{}'::jsonb),
    'by_lang', coalesce((select jsonb_object_agg(coalesce(lang, '?'), n) from (select lang, count(*) n from r group by 1) x), '{}'::jsonb),
    'by_region', coalesce((select jsonb_object_agg(coalesce(nullif(region, ''), '?'), n) from (select region, count(*) n from r group by 1) x), '{}'::jsonb),
    'top_zones', coalesce((select jsonb_agg(jsonb_build_object('tz', tz, 'n', n)) from (select tz, count(*) n from r where tz is not null group by 1 order by 2 desc limit 8) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d) from (select date_trunc('day', created_at)::date d, count(*) n from r group by 1) x), '[]'::jsonb),
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects),
    'storage_by_bucket', coalesce((select jsonb_object_agg(bucket_id, b) from (select bucket_id, sum((metadata->>'size')::bigint) b from storage.objects group by 1) x), '{}'::jsonb)
  );
$$;

revoke execute on function public.tele_stats(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.tele_stats(timestamptz, timestamptz) to service_role;
