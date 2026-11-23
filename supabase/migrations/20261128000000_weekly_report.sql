-- Weekly report numbers for the owner (weekly-report Edge Function). Service role only.
-- All counts are distinct people unless noted; nothing personal is returned.

create or replace function public.report_period(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable security definer set search_path = '' as $$
with e as (
  select * from public.events
  where at >= p_from and at < p_to and session_id not like 'selftest%'
),
firsts as (select user_id, min(at) as first_at from public.events group by user_id),
cards as (
  select props->>'card_id' as card_id, coalesce(props->>'source', 'deck') as source,
         count(*) filter (where name = 'card_shown') as shown,
         count(*) filter (where name = 'card_done') as done,
         count(*) filter (where name = 'card_skip') as skips,
         greatest(count(*) filter (where name = 'card_star' and (props->>'on')::boolean)
                - count(*) filter (where name = 'card_star' and not (props->>'on')::boolean), 0) as stars
  from e where props ? 'card_id' group by 1, 2
),
per_card as (
  select card_id, sum(shown) as shown, sum(done) as done, sum(skips) as skips, sum(stars) as stars
  from cards group by card_id
),
prior as (select coalesce(sum(stars)::numeric / nullif(sum(shown), 0), 0) as p from per_card),
scored as (
  select card_id, shown, done, skips, stars,
         round((stars + p * 20) / (shown + 20), 4) as score,
         round(skips::numeric / nullif(shown, 0), 3) as skip_rate
  from per_card, prior where shown >= 5
),
first_ref as (
  select distinct on (user_id) user_id, props->>'ref' as ref
  from e where name = 'session_start' and props->>'ref' is not null order by user_id, at
),
played as (select user_id from e where name = 'card_shown' group by user_id having count(*) >= 5)
select jsonb_build_object(
  'from', p_from, 'to', p_to,
  'visitors',        (select count(distinct user_id) from e where name = 'session_start'),
  'new_visitors',    (select count(distinct e.user_id) from e join firsts f using (user_id) where f.first_at >= p_from),
  'returning',       (select count(distinct e.user_id) from e join firsts f using (user_id) where f.first_at < p_from),
  'started_a_game',  (select count(distinct user_id) from e where name = 'game_start'),
  'played_5_plus',   (select count(*) from played),
  'cards_shown',     (select count(*) from e where name = 'card_shown'),
  'guest_walls',     (select count(distinct user_id) from e where name = 'guest_wall'),
  'signups',         (select count(distinct user_id) from e where name = 'signup'),
  'signups_google',  (select count(distinct user_id) from e where name = 'signup' and props->>'method' = 'google'),
  'rooms_started',   (select count(*) from e where name = 'room_start'),
  'premium_views',   (select count(distinct user_id) from e where name = 'premium_view'),
  'checkouts',       (select count(distinct user_id) from e where name = 'checkout_start'),
  'premium_started', (select count(distinct user_id) from e where name = 'premium_on'),
  'top_cards',       coalesce((select jsonb_agg(to_jsonb(s)) from (select * from scored order by score desc limit 10) s), '[]'),
  'most_skipped',    coalesce((select jsonb_agg(to_jsonb(s)) from (select * from scored order by skip_rate desc nulls last limit 10) s), '[]'),
  'by_source',       coalesce((select jsonb_agg(to_jsonb(s)) from (
                        select source, sum(shown) as shown,
                               round(sum(stars)::numeric / nullif(sum(shown), 0), 3) as star_rate,
                               round(sum(done)::numeric / nullif(sum(shown), 0), 3) as done_rate,
                               round(sum(skips)::numeric / nullif(sum(shown), 0), 3) as skip_rate
                        from cards group by source order by source) s), '[]'),
  'by_ref',          coalesce((select jsonb_agg(to_jsonb(s)) from (
                        select r.ref, count(distinct r.user_id) as visitors,
                               count(distinct e.user_id) filter (where e.name = 'signup') as signups
                        from first_ref r join e using (user_id) group by r.ref order by visitors desc limit 15) s), '[]')
);
$$;
revoke all on function public.report_period(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.report_period(timestamptz, timestamptz) to service_role;

-- Every Monday 06:00 Nairobi (03:00 UTC): ask the weekly-report function to email the report.
-- Needs two Vault secrets (Supabase → SQL editor, once):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<same value as the REPORT_KEY function secret>', 'report_key');
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('weekly-report', '0 3 * * 1', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/weekly-report',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'report_key')),
    body := '{"send": true}'::jsonb
  );
$job$);

-- 1st of each month: delete events older than ~13 months (data minimisation)
select cron.schedule('prune-events', '0 4 1 * *', $job$ select public.prune_events(); $job$);
