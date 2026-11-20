-- Hosts end their own room from the app ("End the room"). The RLS policy "host can end own room"
-- already limits it to their rooms; the table privilege was missing.
grant delete on public.rooms to authenticated;
