# Midnight Vibes: analytics playbook

How we measure what's working, at today's small scale. Labels: **[standard]** is common product-analytics practice; **[our call]** is a judgement for this app that the data may prove wrong.

Data comes from the `events` table (see `supabase/migrations/20261127000000_events.sql` and `mobile/src/lib/track.ts`). Pull it into Excel with:

```
.venv/Scripts/python scripts/export_analytics.py          # real data (needs .env with the service-role key)
.venv/Scripts/python scripts/export_analytics.py --demo   # practice data
```

## 1. Metrics

**North star: weekly active groups who play 5+ turns** (distinct users with ≥ 5 `card_shown` in a week). [our call] It means people actually played, not just visited, and it grows with both new users and returning ones.

Supporting metrics:

| Metric | Definition | Why |
|---|---|---|
| Activation | share of new visitors who start a game and see ≥ 3 cards in their first session | did the first minute work? [standard] |
| Guest → sign-up | sign-ups ÷ visitors who hit the guest wall | is the wall persuasive, not annoying? |
| D1 / D7 retention | share of a day's new users active 1 / 7 days later | party games are occasional, so expect low D1; watch D7 and week-1 retention [standard] |
| Free → Premium | `premium_on` ÷ signed-up users, per 30 days | revenue [standard] |
| Card quality | per card: star rate, done rate, skip rate (smoothed score in the Cards sheet) | which cards to show first |

## 2. Events we log

| event | trigger | properties |
|---|---|---|
| `session_start` | app opened | `ref` (from `?ref=`), `platform`, `installed` |
| `game_start` | Truth or Dare / wheel screen opened | `game`, `group`, `heat`, `players_n`, `has_mood` |
| `card_shown` | card or wedge appears | `card_id`, `game`, `type`, `heat`, `source` (top/deck/ai/tailored), `turn_n` |
| `card_done` / `card_skip` | Done / Skip | `card_id`, `source`, `ms_on_card` |
| `card_star` | star toggled | `card_id`, `on`, `source` |
| `mood_set` | mood applied | `preset` (chip name) or `custom: true`, `group` |
| `guest_wall` | guest sent to sign in | `reason` (turns/room/host), `game` |
| `signup` / `signin` | account created / signed in | `method` (email/google), `from` (why they signed in) |
| `room_start` / `room_join` | live room | none |
| `premium_view` / `checkout_start` / `premium_on` | paywall steps | `plan` / `product` |

Card events also carry `group` and `guest` (true/false), for the per-group and guests-vs-signed-in breakdowns.

AI-written cards are saved once each by the server in `ai_cards` (text as the AI wrote it, with `{target}` placeholders; never the typed mood or player names), so AI cards can be analysed and the best added to the deck.

**Never logged:** names, emails, gender or orientation, typed mood text, IP addresses. An allow-list in `mobile/src/game/privacy.ts` enforces it (unit-tested). The export replaces user ids with salted hashes.

## 3. Funnel and where people drop

`visitor → started a game → 3 cards → guest wall → signed up → came back → Premium`

Expected drop-offs [our call]:
1. **Visitor → game.** The 18+ gate and group/player setup are the friction. Measure: `game_start` users ÷ `session_start` users per day (Funnel by day sheet).
2. **Guest wall → sign-up.** The biggest single drop by design. Measure: `signup` with `from = turns` ÷ `guest_wall` users.
3. **Sign-up → return.** Party games are used on occasions, not daily. Measure: week-1 retention (Retention sheet).
4. **Free → Premium.** Measure: `premium_view` → `checkout_start` → `premium_on`.

## 4. Levers we can tune

| Lever | Where | Data it needs |
|---|---|---|
| Top picks (first cards) | `data/card-review.xlsx` → `topPicks.ts` | Cards sheet: score, skip rate |
| Free guest turns (now 3/day) | `mobile/src/game/turns.ts` | guest_wall → signup rate |
| Default heat | setup screens | `game_start.heat`, skip rate by heat |
| AI limits (free 1 per 2 days) | `plan_limits` table | `mood_set` counts, Premium conversion |
| Paywall timing / wording | Account, mood sheet | premium_view → checkout_start |
| Instagram angles | Instagram posts sheet | By ref: visitors, sign-ups per post |

## 5. Experiments for small traffic

With few users, classic A/B tests take a long time. Run one at a time, decide in advance what you measure, and prefer big changes over small tweaks. [standard]

**Sample size rule of thumb** (two-proportion z-test, 5% significance, 80% power): to detect a rise from 10% to 15% you need about **690 people per group**; from 10% to 20%, about **200 per group**. If you can't reach that, use the Bayesian approach below.

**A. Top picks vs random first cards.**
- *Hypothesis:* guests whose first 3 cards are top picks sign up more often.
- *Metric:* guest_wall → signup rate.
- *Split:* by a hash of the user id (50/50).
- *Test:* two-proportion z-test, or a Bayesian beta-binomial (Beta(1,1) prior, report P(top > random)); stop when P > 0.95 or < 0.05, or after 6 weeks.
- *Disproved if* the rates are equal or random wins.

**B. 3 vs 5 free turns.**
- *Hypothesis:* 5 free turns lead to more sign-ups, because people enjoy it first, even though fewer hit the wall.
- *Metric:* sign-ups ÷ visitors (not ÷ wall hits, which would favour 3).
- *Test:* the same as A.
- *Caution:* also check D7 retention.

**C. Instagram angle.**
- *Hypothesis:* posts showing a real dare get more link taps per 1,000 reach than "app feature" posts.
- *Data:* the Instagram posts sheet (angle, reach, link taps) joined to By ref.
- *Test:* compare the link-tap rates per post group with a Mann-Whitney U test (few posts, skewed numbers).
- *Disproved if* the medians don't differ.

For the cards themselves, the **combined score** values each play at 3 for a star, 1 for Done and −1 for a Skip, averages that per play, and pulls it towards the overall average until the card has 20 plays (a Bayesian average). Cards with 2 lucky plays can't top the list. The Excel export ranks every card by it on the **Truths**, **Dares** and **Spin the Wheel** sheets (built-in and AI cards, played or not), lists the top 5 per type × group × heat on **Top cards**, and splits each card **by group**, **by heat**, **guests vs signed-in** and **by week**. `cards_to_excel.py` then marks **suggested** top picks (top 3 per game/deck/heat with 30+ plays) and lists AI cards you can add to the deck. Later, a Thompson-sampling bandit can choose which cards to show first, automatically balancing trying new cards against showing proven ones. [standard]

## 6. SQL (Supabase → SQL editor)

Weekly retention cohorts:

```sql
with firsts as (
  select user_id, date_trunc('week', min(at)) as cohort from public.events group by user_id
), activity as (
  select distinct e.user_id, f.cohort, (date_trunc('week', e.at) - f.cohort) / 7 as weeks_later
  from public.events e join firsts f using (user_id)
)
select cohort::date, extract(day from weeks_later)::int as week,
       count(*) as users,
       round(count(*)::numeric / max(count(*)) over (partition by cohort), 3) as share
from activity group by cohort, weeks_later order by cohort, week;
```

Guest wall → sign-up, by week:

```sql
select date_trunc('week', at)::date as week,
       count(distinct user_id) filter (where name = 'guest_wall') as hit_wall,
       count(distinct user_id) filter (where name = 'signup')     as signed_up
from public.events group by 1 order by 1;
```

Card leaderboard (smoothed star score):

```sql
with c as (
  select props->>'card_id' as card_id,
         count(*) filter (where name = 'card_shown') as shown,
         count(*) filter (where name = 'card_star' and (props->>'on')::boolean) as stars,
         count(*) filter (where name = 'card_skip') as skips
  from public.events where props ? 'card_id' group by 1
), prior as (select sum(stars)::numeric / nullif(sum(shown), 0) as p from c)
select card_id, shown, stars, skips,
       round((stars + p * 20) / (shown + 20), 4) as score
from c, prior order by score desc limit 30;
```

Visitors and sign-ups per Instagram post:

```sql
with first_ref as (
  select distinct on (user_id) user_id, props->>'ref' as ref
  from public.events where name = 'session_start' and props->>'ref' is not null order by user_id, at
)
select ref, count(distinct f.user_id) as visitors,
       count(distinct e.user_id) filter (where e.name = 'signup') as signed_up
from first_ref f join public.events e using (user_id)
group by ref order by visitors desc;
```

## 7. Ethics and the law

- **Kenya Data Protection Act 2019** treats data about a person's **sex life and sexual orientation as sensitive personal data**, which needs stronger grounds and care. That's why gender and "into" stay on the user's own profile and are **never** in analytics. GDPR's rules on special categories are similar, if EU users come. [standard]
- **Data minimisation:** collect only what a decision needs. Every event above maps to a metric or lever in sections 1 and 4. Drop anything that stops being used. Events are deleted after about 13 months (`prune_events()`).
- **Transparency and choice:** a first-open notice explains the stats, and there's a working off switch in Profile & settings. A privacy policy page saying the same is still needed. [our call]
- **Registration:** Kenya's ODPC requires some data controllers to register. Check whether Midnight Vibes meets the thresholds before scaling. (This is not legal advice.)
- **Avoid dark patterns:**
  - The guest wall says plainly that sign-in is needed. It never fakes scarcity or hides the free cards behind tricks.
  - Never manipulate heat to push Premium.
  - Experiments must not show anyone content above the heat level they chose.
- **Adult content:** keep the 18+ gate, and never put card text, moods or names into analytics. An export file should never identify a person.
