-- DELETE ... WHERE code = ... also needs SELECT. Hosts may read only their own rooms;
-- everyone else still checks a link with room_open(), which reveals nothing but true/false.
grant select on public.rooms to authenticated;
create policy "host reads own rooms" on public.rooms for select to authenticated using (host_id = (select auth.uid()));
