// Supabase Edge Function "weekly-report": the owner's report on the last 7 days vs the 7 before.
//   POST {"send": true}  (Bearer REPORT_KEY)      → emails the report to REPORT_TO (pg_cron, Mondays)
//   GET/POST             (Bearer <owner's JWT>)   → the report as JSON, for the app's /report screen
// Only signed-in owners (owners table) can view it; the key can only send the email. Nothing personal is in it.
// Deployed without gateway JWT verification because pg_cron sends the key, not a JWT; this function checks both.
import { createClient } from "npm:@supabase/supabase-js@2";

import cards from "../_shared/cards.json" with { type: "json" };
import { sendEmail } from "../_shared/email.ts";

type Card = { text: string; game: string; group: string; type: string; heat: number };
const CARDS = cards as Record<string, Card>;
const SITE = "https://midnightvibes.online";

const ALLOWED_ORIGINS = new Set([SITE, "https://www.midnightvibes.online", "http://localhost:8081"]);
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : SITE,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  Vary: "Origin",
});

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/** Constant-time comparison, so the key can't be guessed from response timing. */
function sameKey(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// deno-lint-ignore no-explicit-any
type Period = Record<string, any>;

async function period(from: Date, to: Date): Promise<Period> {
  const { data, error } = await admin.rpc("report_period", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw new Error(error.message);
  return data as Period;
}

/** Card text for the report: built-in from cards.json, AI cards from the ai_cards table. */
async function withText(rows: { card_id: string }[]) {
  const ai = rows.map((r) => r.card_id).filter((id) => id.startsWith("ai-"));
  const { data } = ai.length ? await admin.from("ai_cards").select("id,text").in("id", ai) : { data: [] };
  const aiText = new Map((data ?? []).map((x: { id: string; text: string }) => [x.id, x.text]));
  return rows.map((r) => ({ ...r, ...(CARDS[r.card_id] ?? { text: aiText.has(r.card_id) ? `✦ AI: ${aiText.get(r.card_id)}` : r.card_id }) }));
}

async function build() {
  const now = new Date();
  const day = 24 * 3600 * 1000;
  const [cur, prev] = await Promise.all([
    period(new Date(now.getTime() - 7 * day), now),
    period(new Date(now.getTime() - 14 * day), new Date(now.getTime() - 7 * day)),
  ]);
  cur.top_cards = await withText(cur.top_cards);
  cur.most_skipped = await withText(cur.most_skipped);
  return { generated: now.toISOString(), current: cur, previous: prev };
}

// ---------- Email ----------
const METRICS: [string, string][] = [
  ["visitors", "Visitors"], ["new_visitors", "New visitors"], ["returning", "Returning"],
  ["started_a_game", "Started a game"], ["played_5_plus", "Played 5+ cards (north star)"], ["cards_shown", "Cards shown"],
  ["guest_walls", "Hit the guest wall"], ["signups", "Sign-ups"], ["rooms_started", "Live rooms"],
  ["premium_views", "Saw Premium"], ["checkouts", "Started checkout"], ["premium_started", "New Premium"],
];
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const delta = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : a ? "new" : "–");

function emailBody(r: Awaited<ReturnType<typeof build>>, link: string) {
  const c = r.current, p = r.previous;
  const rows = METRICS.map(([k, label]) =>
    `<tr><td style="padding:6px 10px">${label}</td><td style="padding:6px 10px;text-align:right"><b>${c[k] ?? 0}</b></td><td style="padding:6px 10px;text-align:right;color:#8A5A66">${delta(c[k] ?? 0, p[k] ?? 0)}</td></tr>`).join("");
  const list = (items: { text: string; shown: number; stars: number; skip_rate: number }[]) =>
    items.length ? `<ol style="padding-left:18px">${items.slice(0, 5).map((x) => `<li>${esc(x.text)} <span style="color:#8A5A66">(${x.shown} shown, ${x.stars}★, ${Math.round((x.skip_rate ?? 0) * 100)}% skipped)</span></li>`).join("")}</ol>` : "<p style=\"color:#8A5A66\">Not enough plays yet.</p>";
  const html = `<div style="font-family:Arial,sans-serif;color:#3B0D1C;max-width:560px">
<h2 style="margin:0 0 4px">Midnight Vibes: your week</h2><p style="margin:0 0 16px;color:#8A5A66">Last 7 days vs the 7 before</p>
<table style="border-collapse:collapse;width:100%;background:#FFF5F3;border-radius:8px">${rows}</table>
<h3>Best cards</h3>${list(c.top_cards)}<h3>Most skipped</h3>${list(c.most_skipped)}
<p><a href="${link}" style="color:#7A1F3D;font-weight:bold">Open the full report</a></p></div>`;
  const text = `Midnight Vibes: your week (last 7 days vs the 7 before)\n\n${METRICS.map(([k, l]) => `${l}: ${c[k] ?? 0} (${delta(c[k] ?? 0, p[k] ?? 0)})`).join("\n")}\n\nFull report: ${link}`;
  return { html, text };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  const key = Deno.env.get("REPORT_KEY") ?? "";
  const given = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json", "Cache-Control": "no-store" } });
  try {
    // 1. The Monday job (pg_cron) with REPORT_KEY: email the report. The key can only trigger this email to the owner.
    if (key && sameKey(given, key)) {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
      if (!body?.send) return json(400, { error: "The report key only sends the email. Open the report in the app." });
      const to = Deno.env.get("REPORT_TO");
      if (!to) return json(500, { error: "Set the REPORT_TO secret to your email address." });
      const { html, text } = emailBody(await build(), `${SITE}/report`);
      const sent = await sendEmail(to, "Midnight Vibes: your week", html, text);
      return json(sent.ok ? 200 : 502, { sent: sent.ok });
    }

    // 2. Viewing the report: only a signed-in owner (owners table), checked here on the server
    const { data: auth } = await admin.auth.getUser(given);
    const uid = auth?.user?.id;
    if (!uid || auth.user.is_anonymous) return json(401, { error: "Sign in with the owner account to see the report." });
    const { data: owner } = await admin.from("owners").select("user_id").eq("user_id", uid).maybeSingle();
    if (!owner) return json(403, { error: "This account can't see the report." });
    return json(200, await build());
  } catch (e) {
    console.error("weekly-report:", (e as Error).message);
    return json(500, { error: "Couldn't build the report." });
  }
});
