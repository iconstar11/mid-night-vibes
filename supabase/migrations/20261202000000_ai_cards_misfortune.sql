-- AI can now write Wheel of Misfortune forfeits too; keep them for analysis like the other AI cards.
alter table public.ai_cards drop constraint if exists ai_cards_game_check;
alter table public.ai_cards add constraint ai_cards_game_check check (game in ('tod', 'wheel', 'misfortune'));
