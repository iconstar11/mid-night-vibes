-- Payments with Paystack (Kenya): cards in USD (monthly/yearly renew automatically) and M-Pesa in KES
-- (each payment buys 7, 30 or 365 days). Written only by the billing and paystack-webhook functions.

alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements add constraint entitlements_source_check
  check (source in ('revenuecat', 'stripe', 'paystack', 'manual'));
alter table public.entitlements
  add column paystack_customer_code text,
  add column paystack_subscription_code text,
  add column paystack_email_token text,
  add column renews boolean not null default false;   -- a card subscription that will charge again
create index entitlements_paystack_customer on public.entitlements (paystack_customer_code);

-- Every payment, once. The reference is Paystack's; granting Premium twice for the same payment is impossible.
create table public.payments (
  reference text primary key,
  user_id uuid not null references auth.users on delete cascade,
  product text not null check (product in ('monthly', 'yearly', 'pass')),
  channel text not null check (channel in ('card', 'mpesa')),
  currency text not null,
  amount int not null,                 -- in subunits (cents)
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  granted_at timestamptz,              -- when this payment's Premium days were added
  created_at timestamptz not null default now()
);
create index payments_user on public.payments (user_id, created_at desc);
alter table public.payments enable row level security;
grant select, insert, update on public.payments to service_role;

-- Add days of Premium for one successful payment, exactly once (keyed by the payment reference).
-- p_stack: one-off payments (M-Pesa, party pass) add on top of what they already have.
-- Renewing card plans set "now + days" instead (never shorter than what they have), so the grace days
-- don't pile up month after month.
create function public.grant_paid_premium(p_reference text, p_days int, p_stack boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  pay public.payments;
begin
  update public.payments set status = 'success', granted_at = now()
  where reference = p_reference and granted_at is null
  returning * into pay;
  if not found then return false; end if;  -- unknown, or already granted
  insert into public.entitlements (user_id, plan, source, product, expires_at, updated_at)
  values (pay.user_id, 'premium', 'paystack', pay.product, now() + make_interval(days => p_days), now())
  on conflict (user_id) do update set
    plan = 'premium', source = 'paystack', product = pay.product,
    expires_at = case when p_stack
      then greatest(coalesce(public.entitlements.expires_at, now()), now()) + make_interval(days => p_days)
      else greatest(coalesce(public.entitlements.expires_at, now()), now() + make_interval(days => p_days)) end,
    updated_at = now();
  return true;
end $$;
revoke all on function public.grant_paid_premium(text, int, boolean) from public, anon, authenticated;
grant execute on function public.grant_paid_premium(text, int, boolean) to service_role;

-- Account screen: can_manage now means "has a card subscription to manage (update card / cancel)"
drop function public.my_usage();
create function public.my_usage() returns table (
  plan text, used int, day_limit int, premium_until timestamptz, product text, can_manage boolean, window_days int, next_at date, renews boolean
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
         coalesce((select e.paystack_subscription_code is not null or e.stripe_customer_id is not null from public.entitlements e where e.user_id = auth.uid()), false),
         l.win,
         (select min(u.day) + l.win from public.ai_usage u where u.user_id = auth.uid() and u.moods > 0 and u.day > current_date - l.win),
         coalesce((select e.renews from public.entitlements e where e.user_id = auth.uid()), false)
  from p, l;
$$;
revoke all on function public.my_usage() from public, anon;
grant execute on function public.my_usage() to authenticated;
