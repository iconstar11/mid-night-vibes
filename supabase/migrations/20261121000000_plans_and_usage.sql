-- Plans and AI limits.
-- Tiers: 'guest' (anonymous sign-in), 'free' (signed-up account), 'premium' (paid, from entitlements).
-- Change the numbers here (or in the dashboard's table editor) without redeploying anything.
create table public.plan_limits (
  plan text primary key check (plan in ('guest', 'free', 'premium')),
  ai_moods_per_day int not null check (ai_moods_per_day >= 0),
  note text
);
alter table public.plan_limits enable row level security;
create policy "anyone can read limits" on public.plan_limits for select to anon, authenticated using (true);
grant select on public.plan_limits to anon, authenticated;
grant select, insert, update, delete on public.plan_limits to service_role;

insert into public.plan_limits (plan, ai_moods_per_day, note) values
  ('guest', 3, 'Playing without an account'),
  ('free', 10, 'Free account'),
  ('premium', 100, 'Paid plan (fair-use cap)');

-- Which tier is this user on right now?
create function public.current_plan(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when exists (
      select 1 from public.entitlements e
      where e.user_id = uid and e.plan = 'premium' and (e.expires_at is null or e.expires_at > now())
    ) then 'premium'
    when coalesce((select u.is_anonymous from auth.users u where u.id = uid), true) then 'guest'
    else 'free'
  end;
$$;
revoke all on function public.current_plan(uuid) from public, anon, authenticated;
grant execute on function public.current_plan(uuid) to service_role;

-- For the Account screen: my plan, today's AI moods and my daily limit
create function public.my_usage() returns table (plan text, used int, day_limit int)
language sql stable security definer set search_path = '' as $$
  with p as (select public.current_plan(auth.uid()) as plan)
  select p.plan,
         coalesce((select u.count from public.ai_usage u where u.user_id = auth.uid() and u.day = current_date), 0),
         coalesce((select l.ai_moods_per_day from public.plan_limits l where l.plan = p.plan), 0)
  from p;
$$;
revoke all on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;

-- Count moods (what players see) separately from raw AI calls (cost guard: at most 4 calls per allowed mood)
alter table public.ai_usage add column moods int not null default 0;

drop function public.bump_ai_usage(uuid);
create function public.bump_ai_usage(uid uuid, new_mood boolean) returns table (calls int, moods int)
language sql security definer set search_path = '' as $$
  insert into public.ai_usage as u (user_id, day, count, moods) values (uid, current_date, 1, case when new_mood then 1 else 0 end)
  on conflict (user_id, day) do update
    set count = u.count + 1, moods = u.moods + case when new_mood then 1 else 0 end
  returning u.count, u.moods;
$$;
revoke all on function public.bump_ai_usage(uuid, boolean) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(uuid, boolean) to service_role;

create or replace function public.my_usage() returns table (plan text, used int, day_limit int)
language sql stable security definer set search_path = '' as $$
  with p as (select public.current_plan(auth.uid()) as plan)
  select p.plan,
         coalesce((select u.moods from public.ai_usage u where u.user_id = auth.uid() and u.day = current_date), 0),
         coalesce((select l.ai_moods_per_day from public.plan_limits l where l.plan = p.plan), 0)
  from p;
$$;
