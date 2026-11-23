-- Profile & settings for signed-in users: their own name, he/she, who they're into, and appearance,
-- plus players they choose to save. Nothing here is saved from games automatically.
-- All private to the owner (RLS); nothing else reads these tables.

-- ---------- The user's own profile ----------
alter table public.profiles
  add column gender text check (gender in ('m', 'f')),                -- null = rather not say
  add column into_pref text not null default 'opp' check (into_pref in ('opp', 'same', 'both')),
  add column theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  add column updated_at timestamptz not null default now();
-- (select and update-own-row policies and grants already exist in 20261120000000_init.sql)

-- First name from Google ("Antony Kinuthia" → "Antony"), used when sign-up didn't give a display_name
create function public.first_name_from_meta(meta jsonb) returns text
language sql immutable set search_path = '' as $$
  select nullif(left(split_part(trim(coalesce(
    nullif(meta ->> 'display_name', ''),
    nullif(meta ->> 'full_name', ''),
    nullif(meta ->> 'name', ''),
    ''
  )), ' ', 1), 40), '')
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, case when nullif(new.raw_user_meta_data ->> 'display_name', '') is not null
                       then left(new.raw_user_meta_data ->> 'display_name', 40)
                       else public.first_name_from_meta(new.raw_user_meta_data) end)
  on conflict do nothing;
  insert into public.entitlements (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

-- Backfill: existing accounts with no name get their Google first name
update public.profiles p
set display_name = public.first_name_from_meta(u.raw_user_meta_data)
from auth.users u
where u.id = p.id and p.display_name is null and not coalesce(u.is_anonymous, false)
  and public.first_name_from_meta(u.raw_user_meta_data) is not null;

-- ---------- Players the user saved on purpose ----------
create table public.saved_players (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 24),
  gender text check (gender in ('m', 'f')),
  into_pref text not null default 'opp' check (into_pref in ('opp', 'same', 'both')),
  created_at timestamptz not null default now()
);
create unique index saved_players_owner_name on public.saved_players (owner, lower(trim(name)));
alter table public.saved_players enable row level security;
-- Guests (anonymous sign-ins) are "authenticated" too, so real accounts only
create policy "own saved players" on public.saved_players for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()) and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false);
grant select, insert, update, delete on public.saved_players to authenticated;
grant select, insert, update, delete on public.saved_players to service_role;

-- At most 30 per account
create function public.saved_players_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.saved_players where owner = new.owner) >= 30 then
    raise exception 'You can save up to 30 players.' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger saved_players_cap before insert on public.saved_players for each row execute function public.saved_players_cap();
