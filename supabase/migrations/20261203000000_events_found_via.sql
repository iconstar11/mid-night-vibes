-- "Where did you find us?" answer after sign-up (props.found = tiktok/instagram/facebook/youtube/friend/search/other)
alter table public.events drop constraint events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'session_start', 'game_start', 'card_shown', 'card_skip', 'card_done', 'card_star',
  'mood_set', 'guest_wall', 'signup', 'signin', 'room_start', 'room_join',
  'premium_view', 'checkout_start', 'premium_on', 'found_via'
));
