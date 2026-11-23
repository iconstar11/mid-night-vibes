# Midnight Vibes – transactional email (Resend)

Sends from `noreply@send.midnightvibes.online`, replies go to `hello@midnightvibes.online`.
Emails only ever go to the **signed-in user's own email** (anonymous players are skipped).

## Files
- `supabase/functions/_shared/email.ts`: `sendEmail(to, subject, html, text)` helper (server only)
- `supabase/functions/_shared/email-templates.ts`: `welcome`, `premium_confirmed`
- `supabase/functions/send-email/index.ts`: the endpoint the app calls
- `supabase/migrations/20261123000000_email_log.sql`: rate-limit table + `claim_email_slot()`

Limits: 5/hour and 20/day per user, 90/day overall (Resend free plan is 100/day). Change the defaults in the SQL function.

## Deploy
1. Resend → API keys → Create (permission: **Sending access**, domain: send.midnightvibes.online).
2. `supabase secrets set RESEND_API_KEY=re_xxx`   (never in `.env` committed to git, never `EXPO_PUBLIC_*`)
3. `supabase db push`
4. `supabase functions deploy send-email`

## Call it from the app
```ts
const { error } = await supabase.functions.invoke('send-email', {
  body: { template: 'welcome', data: { name: 'Titan' } },
});
```
For `premium_confirmed`, the better place is your Stripe webhook function: import `sendEmail` and
`templates` from `_shared/` and send after payment is confirmed, instead of trusting the client.

## Test
1. Wait until Resend → Domains shows **Verified** for send.midnightvibes.online.
2. Sign in with a Gmail account, trigger `welcome`; repeat with an Outlook/Hotmail account.
3. **Gmail:** open the email → ⋮ → **Show original**. Look for `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.
4. **Outlook.com:** open the email → ⋯ → **View** → **View message source**. Search for
   `Authentication-Results`: you want `spf=pass`, `dkim=pass`, `dmarc=pass`.
5. **mail-tester.com:** copy the one-time address it shows, send the email there (temporarily sign in
   with a user whose email is that address, or call `sendEmail` from a one-off script), then click
   "Then check your score". Aim for 9/10+. Common fixes: missing plain text (already handled),
   no unsubscribe header (only matters for marketing mail), DMARC not yet published.

## Later (don't do yet)
**Tighten DMARC** after 2–4 weeks of passing mail:
- Read the reports sent to hello@ (or use a free viewer like dmarcian/Postmark DMARC). Confirm every
  legit sender (Resend, Cloudflare Email Routing) passes.
- Edit `_dmarc` TXT to `v=DMARC1; p=quarantine; pct=25; rua=mailto:hello@midnightvibes.online`,
  then raise `pct` to 100 over a few weeks, and later consider `p=reject`.

**Newsletters** (if ever): add `news.midnightvibes.online` as a **separate** domain in Resend,
add its own DNS records the same way (DNS only), and send broadcasts from it with an unsubscribe link.
A spam complaint on newsletters then won't hurt `send.` (logins/receipts) or the root domain.
