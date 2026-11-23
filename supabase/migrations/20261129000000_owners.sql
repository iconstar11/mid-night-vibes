-- App owners: who may see the weekly report in the app. No policies: nobody can read or change it from the app.
-- Add someone once, from the SQL editor or CLI (not in a migration, so no email lands in git):
--   insert into public.owners (user_id) select id from auth.users where email = '<owner email>';
create table public.owners (
  user_id uuid primary key references auth.users on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.owners enable row level security;
grant select, insert, delete on public.owners to service_role;

-- Am I an owner? (Shows the report link on the Account page; the report function checks again on the server.)
create function public.is_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.owners where user_id = auth.uid());
$$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated, service_role;
