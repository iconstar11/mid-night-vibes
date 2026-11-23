-- Stripe (web payments). The webhook (service role) writes these; users can read their own row.
alter table public.entitlements
  add column stripe_customer_id text unique,
  add column stripe_subscription_id text,
  add column product text check (product in ('monthly', 'yearly', 'pass'));

-- Extend Premium from whichever is later: now, or the end of what they already have (party passes stack)
create function public.grant_premium_days(uid uuid, days int, src text) returns void
language sql security definer set search_path = '' as $$
  insert into public.entitlements (user_id, plan, source, product, expires_at, updated_at)
  values (uid, 'premium', src, 'pass', now() + make_interval(days => days), now())
  on conflict (user_id) do update set
    plan = 'premium',
    source = src,
    product = case when public.entitlements.stripe_subscription_id is not null and public.entitlements.expires_at > now()
                   then public.entitlements.product else 'pass' end,
    expires_at = greatest(coalesce(public.entitlements.expires_at, now()), now()) + make_interval(days => days),
    updated_at = now();
$$;
revoke all on function public.grant_premium_days(uuid, int, text) from public, anon, authenticated;
grant execute on function public.grant_premium_days(uuid, int, text) to service_role;

-- my_usage() also returns when Premium ends and what was bought, for the Account screen
drop function public.my_usage();
create function public.my_usage() returns table (plan text, used int, day_limit int, premium_until timestamptz, product text, can_manage boolean)
language sql stable security definer set search_path = '' as $$
  with p as (select public.current_plan(auth.uid()) as plan)
  select p.plan,
         coalesce((select u.moods from public.ai_usage u where u.user_id = auth.uid() and u.day = current_date), 0),
         coalesce((select l.ai_moods_per_day from public.plan_limits l where l.plan = p.plan), 0),
         (select e.expires_at from public.entitlements e where e.user_id = auth.uid() and e.plan = 'premium'),
         (select e.product from public.entitlements e where e.user_id = auth.uid()),
         coalesce((select e.stripe_customer_id is not null from public.entitlements e where e.user_id = auth.uid()), false)
  from p;
$$;
revoke all on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;
