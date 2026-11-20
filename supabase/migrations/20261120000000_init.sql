-- Midnight Vibes: initial schema.
-- Everyone has a user id: players without an account use Supabase anonymous sign-in.
-- Row Level Security is on for every table. Anything not granted by a policy is denied.

-- ---------- Profiles and plans ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Written only by the service role (RevenueCat / Stripe webhooks). Users can read their own.
create table public.entitlements (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  source text check (source in ('revenuecat', 'stripe', 'manual')),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
create policy "read own entitlement" on public.entitlements for select to authenticated using (user_id = (select auth.uid()));

-- New user (anonymous or not): profile + free plan
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.entitlements (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- AI usage and cache (Edge Function only, via the service role) ----------
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security; -- no policies: clients can't touch it

-- Atomically count one AI call; returns the new count for today
create function public.bump_ai_usage(uid uuid) returns int
language sql security definer set search_path = '' as $$
  insert into public.ai_usage (user_id, day, count) values (uid, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count;
$$;
revoke all on function public.bump_ai_usage(uuid) from public, anon, authenticated;

-- Up to a few variants per (game, mood, heat, audience), so popular moods are fast and cheap but not repetitive
create table public.ai_cache (
  key text not null,
  variant int not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  hits int not null default 0,
  primary key (key, variant)
);
alter table public.ai_cache enable row level security; -- no policies

-- ---------- Reports (Google Play AI-generated content policy: in-app flagging) ----------
create table public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  game text not null check (game in ('tod', 'wheel')),
  card_text text not null check (char_length(card_text) <= 400),
  ai boolean not null default false,
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "file a report" on public.reports for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------- Live party rooms ----------
-- Only the code, host and expiry are stored. Game moves travel over Realtime broadcast and are never saved.
create table public.rooms (
  code text primary key check (code ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'),
  host_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);
alter table public.rooms enable row level security;
create index rooms_host_idx on public.rooms (host_id);
create policy "host can end own room" on public.rooms for delete to authenticated using (host_id = (select auth.uid()));
-- No select or insert policies: rooms are created by create_room() and checked by room_open()

-- Create a room for the signed-in host. Random 8-character code without look-alike letters (no 0/O, 1/I/L).
create function public.create_room() returns text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  c text;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sign in first'; end if;
  if (select count(*) from public.rooms where host_id = uid and expires_at > now()) >= 3 then
    raise exception 'too many open rooms';
  end if;
  loop
    select string_agg(substr(alphabet, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % length(alphabet)), 1), '')
      into c from generate_series(1, 8);
    begin
      insert into public.rooms (code, host_id) values (c, uid);
      return c;
    exception when unique_violation then -- try another code
    end;
  end loop;
end $$;
revoke all on function public.create_room() from public, anon;
grant execute on function public.create_room() to authenticated;

-- Viewers check a link before joining: true/false only, nothing else about the room leaks
create function public.room_open(room_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rooms where code = upper(room_code) and expires_at > now());
$$;
grant execute on function public.room_open(text) to anon, authenticated;

-- Helpers for the Realtime policies below (security definer so they can read rooms)
create function public.room_topic_open(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rooms where 'room:' || code = topic and expires_at > now());
$$;
create function public.room_topic_host(topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.rooms where 'room:' || code = topic and host_id = auth.uid() and expires_at > now());
$$;
grant execute on function public.room_topic_open(text), public.room_topic_host(text) to authenticated;

-- Realtime Authorization for private channels "room:CODE":
-- everyone signed in can listen and show presence in an open room; only the host can broadcast game events.
create policy "listen to open rooms" on realtime.messages for select to authenticated
  using (realtime.messages.extension in ('broadcast', 'presence') and public.room_topic_open((select realtime.topic())));
create policy "presence in open rooms" on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'presence' and public.room_topic_open((select realtime.topic())));
create policy "host broadcasts" on realtime.messages for insert to authenticated
  with check (realtime.messages.extension = 'broadcast' and public.room_topic_host((select realtime.topic())));

-- ---------- Explicit API access ----------
-- The project does not grant new tables to the Data API automatically, so grant only what the app needs.
-- RLS policies above still decide which rows each user can touch.
grant select, update on public.profiles to authenticated;
grant select on public.entitlements to authenticated;
grant insert on public.reports to authenticated;
-- The Edge Function and webhooks use the service role
grant select, insert, update, delete on public.profiles, public.entitlements, public.ai_usage, public.ai_cache, public.rooms, public.reports to service_role;
grant execute on function public.bump_ai_usage(uuid) to service_role;

-- Hourly cleanup of expired rooms and old cache entries
create extension if not exists pg_cron;
select cron.schedule('mv-cleanup', '17 * * * *', $$
  delete from public.rooms where expires_at < now();
  delete from public.ai_cache where created_at < now() - interval '30 days';
  delete from public.ai_usage where day < current_date - 7;
$$);
