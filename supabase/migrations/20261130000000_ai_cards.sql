-- AI-written cards, saved once each so they can be analysed (and the best added to the built-in deck).
-- Saved by the ideas function (service role) exactly as the app receives them: {target} placeholders,
-- never player names; the typed mood is NOT stored. Nobody can read this table from the app.
create table public.ai_cards (
  id text primary key,                  -- same id the app uses: "ai-" + FNV-1a hash of the text (cards.ts)
  game text not null check (game in ('tod', 'wheel')),
  type text not null check (type in ('truth', 'dare', 'wedge')),
  label text,                           -- wheel wedge label
  text text not null check (char_length(text) <= 400),
  heat int not null check (heat between 1 and 3),
  audience text not null,               -- couple-mf / couple-any / friends / girls / boys ...
  provider text,                        -- which AI wrote it
  tailored boolean not null default false,
  created_at timestamptz not null default now()
);
create index ai_cards_created on public.ai_cards (created_at desc);
alter table public.ai_cards enable row level security;
grant select, insert, update, delete on public.ai_cards to service_role;
