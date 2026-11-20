-- When every AI provider fails, the player shouldn't lose a mood for it (the raw call still counts)
create function public.refund_ai_mood(uid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.ai_usage set moods = greatest(moods - 1, 0) where user_id = uid and day = current_date;
$$;
revoke all on function public.refund_ai_mood(uuid) from public, anon, authenticated;
grant execute on function public.refund_ai_mood(uuid) to service_role;
