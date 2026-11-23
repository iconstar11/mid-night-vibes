-- Anonymous, privacy-safe game stats (see docs/analytics.md).
-- Never stored: names, emails, gender/orientation, typed mood text, AI card text, IP addresses.
-- The app can only add its own rows; nobody can read them through the app. Analysis uses the service role.

create table public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id text not null check (char_length(session_id) between 8 and 40),
  name text not null check (name in (
    'session_start', 'game_start', 'card_shown', 'card_skip', 'card_done', 'card_star',
    'mood_set', 'guest_wall', 'signup', 'signin', 'room_start', 'room_join',
    'premium_view', 'checkout_start', 'premium_on'
  )),
  props jsonb not null default '{}' check (jsonb_typeof(props) = 'object' and pg_column_size(props) < 1500)
);
create index events_at on public.events (at desc);
create index events_user_at on public.events (user_id, at);
create index events_name_at on public.events (name, at);

alter table public.events enable row level security;
create policy "add own events" on public.events for insert to authenticated with check (user_id = (select auth.uid()));
grant insert on public.events to authenticated;
grant select, insert, delete on public.events to service_role;

-- Keep a year of history
create or replace function public.prune_events() returns void
language sql security definer set search_path = '' as $$
  delete from public.events where at < now() - interval '400 days';
$$;
revoke all on function public.prune_events() from public, anon, authenticated;
grant execute on function public.prune_events() to service_role;
