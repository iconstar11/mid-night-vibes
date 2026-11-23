-- Rate-limit log for the send-email Edge Function.
-- Clients get no access; only the service role (inside the function) uses it.

create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  template    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists email_log_user_time_idx on public.email_log (user_id, created_at desc);
create index if not exists email_log_time_idx on public.email_log (created_at desc);

alter table public.email_log enable row level security;
-- No policies on purpose: anon/authenticated users cannot read or write.

-- Atomically checks limits and records the send. Returns true if allowed.
create or replace function public.claim_email_slot(
  p_user_id  uuid,
  p_template text,
  p_per_hour int default 5,
  p_per_day  int default 20,
  p_global_per_day int default 90  -- stays under Resend's free-plan daily cap
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Serialise concurrent requests from the same user.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  if (select count(*) from email_log
        where user_id = p_user_id and created_at > now() - interval '1 hour') >= p_per_hour
  or (select count(*) from email_log
        where user_id = p_user_id and created_at > now() - interval '1 day') >= p_per_day
  or (select count(*) from email_log
        where created_at > now() - interval '1 day') >= p_global_per_day
  then
    return false;
  end if;

  insert into email_log (user_id, template) values (p_user_id, p_template);
  return true;
end;
$$;

revoke all on function public.claim_email_slot(uuid, text, int, int, int) from public, anon, authenticated;
grant execute on function public.claim_email_slot(uuid, text, int, int, int) to service_role;

-- Optional housekeeping: drop rows older than 30 days (run via pg_cron if enabled).
-- delete from public.email_log where created_at < now() - interval '30 days';
