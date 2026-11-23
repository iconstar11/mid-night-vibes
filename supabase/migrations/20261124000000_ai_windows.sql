-- AI limits over a window of days instead of per day.
-- guest: no AI (sign in first) · free: 1 AI mood every 2 days (rolling) · premium: 100 a day.
-- Change the numbers in the plan_limits table editor without redeploying anything.
alter table public.plan_limits add column window_days int not null default 1 check (window_days >= 1);

update public.plan_limits set ai_moods_per_day = 0, window_days = 1, note = 'Playing without an account: no AI, sign in first' where plan = 'guest';
update public.plan_limits set ai_moods_per_day = 1, window_days = 2, note = 'Free account: 1 AI mood every 2 days' where plan = 'free';
update public.plan_limits set ai_moods_per_day = 100, window_days = 1, note = 'Paid plan (fair-use cap)' where plan = 'premium';

-- AI moods a user started within their plan's window (today and the days before it)
create function public.ai_moods_in_window(uid uuid, days int) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(u.moods), 0)::int from public.ai_usage u
  where u.user_id = uid and u.day > current_date - greatest(days, 1);
$$;
revoke all on function public.ai_moods_in_window(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_moods_in_window(uuid, int) to service_role;

-- For the Account screen. `used` and `day_limit` now cover the plan's window; next_at is when the
-- oldest counted mood drops out of the window (null when nothing is counted).
drop function public.my_usage();
create function public.my_usage() returns table (
  plan text, used int, day_limit int, premium_until timestamptz, product text, can_manage boolean, window_days int, next_at date
)
language sql stable security definer set search_path = '' as $$
  with p as (select public.current_plan(auth.uid()) as plan),
       l as (select coalesce(pl.ai_moods_per_day, 0) as lim, coalesce(pl.window_days, 1) as win
             from p left join public.plan_limits pl on pl.plan = p.plan)
  select p.plan,
         coalesce((select sum(u.moods) from public.ai_usage u where u.user_id = auth.uid() and u.day > current_date - l.win), 0)::int,
         l.lim,
         (select e.expires_at from public.entitlements e where e.user_id = auth.uid() and e.plan = 'premium'),
         (select e.product from public.entitlements e where e.user_id = auth.uid()),
         coalesce((select e.stripe_customer_id is not null from public.entitlements e where e.user_id = auth.uid()), false),
         l.win,
         (select min(u.day) + l.win from public.ai_usage u where u.user_id = auth.uid() and u.moods > 0 and u.day > current_date - l.win)
  from p, l;
$$;
revoke all on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;
