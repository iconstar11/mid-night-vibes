-- "Heat rises over time": heat_up (props: from, to, turn_n = turns at the level, minutes, comfort, players_n) and heat_undo (from, to)
alter table public.events drop constraint events_name_check;
alter table public.events add constraint events_name_check check (name in (
  'session_start', 'game_start', 'card_shown', 'card_skip', 'card_done', 'card_star',
  'mood_set', 'guest_wall', 'signup', 'signin', 'room_start', 'room_join',
  'premium_view', 'checkout_start', 'premium_on', 'found_via', 'heat_up', 'heat_undo'
));
