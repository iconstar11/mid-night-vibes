-- Live rooms need an account, for the host and for people joining.
-- Guests use anonymous sign-ins, which are "authenticated" too, so check is_anonymous explicitly.

create or replace function public.create_room() returns text
language plpgsql security definer set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  c text;
  uid uuid := auth.uid();
begin
  if uid is null or coalesce((select u.is_anonymous from auth.users u where u.id = uid), true) then
    raise exception 'sign in first';
  end if;
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

-- Listening and presence: real accounts only (policies from 20261120000000_init.sql, now with the account check)
drop policy "listen to open rooms" on realtime.messages;
create policy "listen to open rooms" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension in ('broadcast', 'presence')
    and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false
    and public.room_topic_open((select realtime.topic()))
  );

drop policy "presence in open rooms" on realtime.messages;
create policy "presence in open rooms" on realtime.messages for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and coalesce((select (auth.jwt() ->> 'is_anonymous')::boolean), false) = false
    and public.room_topic_open((select realtime.topic()))
  );
