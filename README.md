# Midnight Vibes

**https://midnightvibes.online**

18+ party game for couples and groups: Truth or Dare and Spin the Wheel at three heat levels, both tailored by AI to the mood you set.

## What's in this repo

| Folder | What it is |
|---|---|
| `mobile/` | The new app: Expo + React Native + TypeScript, one codebase for iOS, Android and web |
| `supabase/` | Backend: Postgres schema with Row Level Security, and the `ideas` Edge Function that calls Claude |
| `legacy/` | The original single-file web version. It keeps working until the new web build replaces it |

## Run the new app

```
cd mobile
npm install
npx expo start          # press w for web, or scan the QR code with a development build
npm test                # game logic tests
npx tsc --noEmit        # typecheck
```

Copy `mobile/.env.example` to `mobile/.env.local` and fill in the Supabase URL and anon key (both are public).
Without them the app still works and uses the built-in cards. For AI during development you can instead
point `EXPO_PUBLIC_AI_URL` at the legacy server (`http://localhost:5500/api/ideas`).

### Web build (installable)

```
cd mobile
npx expo export -p web   # static site in mobile/dist
```

`mobile/netlify.toml` builds and serves it. On Android and desktop Chrome or Edge the **Install** button adds it
like a normal app; on iPhone it shows Safari's Share → Add to Home Screen steps. Installing needs HTTPS (or localhost).
When you release a web change, bump `VERSION` in `mobile/public/sw.js` so installed copies update.

## Backend (Supabase)

1. Create a project at supabase.com (the free tier is fine for development; it pauses after a week idle).
2. Enable **Anonymous sign-ins** under Authentication → Providers.
3. Install the Supabase CLI, then from this folder:
   ```
   supabase link --project-ref <your-ref>
   supabase db push                                  # creates the tables and policies
   supabase secrets set ANTHROPIC_API_KEY=<your key>  # stays on Supabase, never in the app
   supabase functions deploy ideas
   ```
4. Put the project URL and anon key in `mobile/.env.local`.

## Run the legacy version

Double-click `legacy/start.bat`, or `cd legacy && npm install && node server.js`, then open http://localhost:5500.
For AI, put `ANTHROPIC_API_KEY=...` in `legacy/.env`. Without a key the games use built-in cards that match the mood.
