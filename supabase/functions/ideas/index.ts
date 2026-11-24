// Supabase Edge Function "ideas": writes mood-based truths, dares and wheel wedges with an AI model.
// Port of POST /api/ideas in legacy/server.js. API keys live in Supabase secrets and never reach the app.
//
// Providers, tried in this order (a provider is skipped if its key isn't set; on a rate limit or outage
// the next one is tried):
//   1. Anthropic Claude      ANTHROPIC_API_KEY
//   2. Venice (Claude Haiku) VENICE_API_KEY   (VENICE_MODEL to override)
//   3. Mistral               MISTRAL_API_KEY  (MISTRAL_MODEL to override)
// All get the same system prompt, JSON schema and consent filter.
import Anthropic from "npm:@anthropic-ai/sdk@1.11.0";
import { createClient } from "npm:@supabase/supabase-js@2";

import { aiCardId } from "../_shared/cardId.ts";
import { GROUPS, HEAT, PAIRS, SYSTEM, TASKS, type TaskName } from "../_shared/prompt.ts";

// AI limits per plan live in the plan_limits table (guest / free / premium): ai_moods_per_day moods per window_days
const CALLS_PER_MOOD = 5; // hidden cost guard: a mood makes ~2-4 calls (cards, wheel, misfortune, top-ups)
const LIMIT_MESSAGE: Record<string, string> = {
  guest: "Sign in to customize with AI.",
  free: "You've used your free AI mood. It's back in 2 days, or go Premium for 100 a day.",
  premium: "That's today's AI moods. They're back tomorrow.",
};
const CACHE_VARIANTS = 3; // after this many results for the same mood, serve from cache

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-AI-Provider, X-AI-Skipped",
};
const send = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

/** A provider failure: `retry` means the next provider may succeed (rate limit, outage, bad output). */
class ProviderError extends Error {
  constructor(public status: number, public userMessage: string, public retry: boolean, public detail?: string) {
    super(userMessage);
  }
}

type Job = { task: TaskName; userText: string };
type Provider = { name: string; enabled: () => boolean; run: (job: Job) => Promise<unknown> };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return send(405, { error: "Use POST." });

  // Who is asking? Anonymous sign-ins count as users too.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const uid = auth?.user?.id;
  if (!uid) return send(401, { error: "Sign in to use AI ideas." });

  // Same validation as legacy/server.js
  let task: TaskName = "tod", vibe = "", heat = 1, pair = "any", who = PAIRS.any, audience = "any", newMood = false;
  let likes: string[] = []; // Premium "Picked for you": built-in cards they starred
  try {
    const raw = await req.text();
    if (raw.length > 2000) throw new Error("too large");
    const body = JSON.parse(raw);
    task = body.game === "wheel" ? "wheel" : body.game === "misfortune" ? "misfortune" : "tod";
    newMood = body.newMood === true; // the app sets this on the first call for a mood
    if (Array.isArray(body.likes)) {
      likes = body.likes.filter((x: unknown): x is string => typeof x === "string").slice(0, 5).map((x: string) => x.trim().slice(0, 200)).filter(Boolean);
    }
    vibe = String(body.vibe ?? "").trim().slice(0, 200);
    heat = [1, 2, 3].includes(body.heat) ? body.heat : 1;
    pair = Object.hasOwn(PAIRS, body.pair) ? body.pair : "any";
    const n = Math.min(Math.max(parseInt(body.players, 10) || 3, 2), 12);
    const group = Object.hasOwn(GROUPS, body.group) ? body.group : null;
    who = group ? GROUPS[group](n) : PAIRS[pair];
    audience = group ?? "couple-" + pair;
  } catch {
    return send(400, { error: "The request wasn't readable." });
  }

  // Limit for this user's plan: `limit` AI moods per `window` days (guests get none: they sign in first)
  const { data: plan } = await admin.rpc("current_plan", { uid });
  const tier = typeof plan === "string" ? plan : "guest";
  const { data: lim } = await admin.from("plan_limits").select("ai_moods_per_day,window_days").eq("plan", tier).maybeSingle();
  const limit = lim?.ai_moods_per_day ?? 0;
  const window = lim?.window_days ?? 1;
  if (likes.length && tier !== "premium") return send(403, { error: "Picked-for-you cards are a Premium feature." });
  if (limit <= 0) return send(429, { error: LIMIT_MESSAGE[tier] ?? LIMIT_MESSAGE.guest, limit: true, plan: tier, signin: tier === "guest" });

  // Count it (moods over the window; raw calls per day are capped too), cached or not
  const { data: usage, error: usageErr } = await admin.rpc("bump_ai_usage", { uid, new_mood: newMood });
  if (usageErr) console.error("usage:", usageErr.message);
  const row = Array.isArray(usage) ? usage[0] : usage;
  const { data: inWindow } = await admin.rpc("ai_moods_in_window", { uid, days: window });
  const moods = typeof inWindow === "number" ? inWindow : row?.moods ?? 0;
  if (moods > limit || (row && row.calls > limit * CALLS_PER_MOOD)) {
    return send(429, { error: LIMIT_MESSAGE[tier] ?? LIMIT_MESSAGE.guest, limit: true, plan: tier });
  }

  // Popular moods: reuse one of a few saved results (never for personal "Picked for you" cards)
  const key = [task, vibe.toLowerCase().replace(/\s+/g, " "), heat, audience].join("|");
  const { data: cached } = likes.length ? { data: null } : await admin.from("ai_cache").select("variant,payload").eq("key", key);
  if (cached && cached.length >= CACHE_VARIANTS) {
    const pick = cached[Math.floor(Math.random() * cached.length)];
    return send(200, pick.payload);
  }

  const t = TASKS[task];
  const isGroup = !audience.startsWith("couple");
  // Groups: ask for a few spares, because the consent filter below may drop some
  const spare = isGroup ? (task === "tod" ? "\nWrite 8 truths and 10 dares instead." : "\nWrite 12 wedges instead of 8.") : "";
  // Premium: cards in the spirit of ones they starred (built-in card text only, never anything they typed)
  const liked = likes.length
    ? `\n\nThese players loved these cards. Write new ones in the same spirit and style (don't repeat them), with the same heat and rules:\n${likes.map((l) => `- ${l}`).join("\n")}`
    : "";
  const job: Job = { task, userText: `Players: ${who}\nHeat level: ${HEAT[heat]}\nMood: ${vibe || "no particular mood, surprise us"}\n\n${t.ask}${spare}${liked}` };

  const active = PROVIDERS.filter((p) => p.enabled());
  if (!active.length) return send(503, { error: "AI ideas aren't set up: add an AI provider key as a Supabase secret." });

  let last = new ProviderError(502, "The AI service didn't answer.", true);
  const skipped: string[] = []; // e.g. "venice:400", reported in a header for debugging (no secrets)
  for (const p of active) {
    try {
      const result = t.clean(consentGuard(await p.run(job), isGroup));
      if (!result) throw new ProviderError(502, "No ideas came back.", true);
      if (!likes.length) await admin.from("ai_cache").upsert({ key, variant: cached?.length ?? 0, payload: result }).then(({ error }) => {
        if (error) console.error("cache:", error.message);
      });
      saveAiCards(result, { task, heat, audience, provider: p.name, tailored: likes.length > 0 });
      const res = send(200, result);
      res.headers.set("X-AI-Provider", p.name);
      if (skipped.length) res.headers.set("X-AI-Skipped", skipped.join(","));
      return res;
    } catch (err) {
      last = err instanceof ProviderError ? err : new ProviderError(502, "The AI service didn't answer.", true);
      console.error(`${p.name}:`, (err as Error)?.message ?? err);
      skipped.push(`${p.name}:${last.detail ?? last.status}`);
      if (!last.retry) break;
    }
  }
  if (newMood) await admin.rpc("refund_ai_mood", { uid }).then(({ error }) => { if (error) console.error("refund:", error.message); });
  return send(last.status, { error: last.userMessage });
});

// ---------- Saving AI cards for analysis ----------
// Each new card once, exactly as the app receives it ({target} placeholders, no player names, no typed mood).
// Fire-and-forget: never slows down or breaks the answer.
// deno-lint-ignore no-explicit-any
function saveAiCards(result: any, o: { task: TaskName; heat: number; audience: string; provider: string; tailored: boolean }) {
  const rows: Record<string, unknown>[] = [];
  const add = (type: string, text: unknown, label?: string) => {
    const t = String(text ?? "").trim();
    if (t) rows.push({ id: aiCardId(t), game: o.task, type, label: label ?? null, text: t.slice(0, 400), heat: o.heat, audience: o.audience, provider: o.provider, tailored: o.tailored });
  };
  if (o.task === "tod") {
    for (const x of result?.truths ?? []) add("truth", x);
    for (const x of result?.dares ?? []) add("dare", x);
  } else for (const w of result?.wedges ?? []) add("wedge", w?.text, w?.label);
  if (!rows.length) return;
  admin.from("ai_cards").upsert(rows, { onConflict: "id", ignoreDuplicates: true }).then(({ error }) => {
    if (error) console.error("ai_cards:", error.message);
  });
}

// ---------- Providers ----------

let anthropic: Anthropic | undefined;

const PROVIDERS: Provider[] = [
  {
    name: "anthropic",
    enabled: () => !!Deno.env.get("ANTHROPIC_API_KEY"),
    async run({ task, userText }) {
      anthropic ??= new Anthropic();
      try {
        const msg = await anthropic.beta.messages.create({
          model: "claude-opus-5-5",
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low", format: { type: "json_schema", schema: TASKS[task].schema } },
          system: SYSTEM,
          messages: [{ role: "user", content: userText }],
        } as Parameters<typeof anthropic.beta.messages.create>[0]);
        if (msg.stop_reason === "refusal") throw new ProviderError(422, "Couldn't write ideas for that mood. Try different words.", false);
        return JSON.parse(msg.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join(""));
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        if (err instanceof Anthropic.AuthenticationError) throw new ProviderError(503, "AI ideas aren't set up: check the ANTHROPIC_API_KEY secret.", true);
        if (err instanceof Anthropic.RateLimitError) throw new ProviderError(429, "Too many requests. Try again in a minute.", true);
        throw new ProviderError(502, "The AI service didn't answer.", true);
      }
    },
  },
  {
    // Venice: OpenAI-compatible API. Default model is Claude Haiku, which follows the safety rules well and is cheap.
    // venice_parameters.include_venice_system_prompt=false so only our rules apply.
    name: "venice",
    enabled: () => !!Deno.env.get("VENICE_API_KEY"),
    run: (job) =>
      chatCompletions(job, {
        url: "https://api.venice.ai/api/v1/chat/completions",
        keyName: "VENICE_API_KEY",
        model: Deno.env.get("VENICE_MODEL") ?? "claude-haiku-5-5",
        extra: { venice_parameters: { include_venice_system_prompt: false } },
      }),
  },
  {
    // ministral-8b has free-plan quota; mistral-small did not (rate_limited, code 1300) when tested 2026-11-20
    name: "mistral",
    enabled: () => !!Deno.env.get("MISTRAL_API_KEY"),
    run: (job) =>
      chatCompletions(job, {
        url: "https://api.mistral.ai/v1/chat/completions",
        keyName: "MISTRAL_API_KEY",
        model: Deno.env.get("MISTRAL_MODEL") ?? "ministral-8b-latest",
      }),
  },
];

/** OpenAI-style chat completions with JSON-schema output (Venice, Mistral). */
async function chatCompletions(
  { task, userText }: Job,
  o: { url: string; keyName: string; model: string; extra?: Record<string, unknown> },
): Promise<unknown> {
  const r = await fetch(o.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get(o.keyName)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: o.model,
      max_tokens: 2000,
      temperature: 0.9,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userText },
      ],
      response_format: { type: "json_schema", json_schema: { name: task === "tod" ? "deck" : "wheel", schema: TASKS[task].schema, strict: true } },
      ...o.extra,
    }),
  });
  if (r.status === 401 || r.status === 403) throw new ProviderError(503, `AI ideas aren't set up: check the ${o.keyName} secret.`, true, String(r.status));
  if (r.status === 429) throw new ProviderError(429, "Too many requests. Try again in a minute.", true, "429");
  if (!r.ok) {
    const body = (await r.text()).slice(0, 300);
    console.error(o.keyName, r.status, body);
    // Short, secret-free reason for the X-AI-Skipped header
    const reason = (() => { try { const e = JSON.parse(body); return String(e?.error?.message ?? e?.message ?? e?.error ?? "").slice(0, 80); } catch { return ""; } })();
    throw new ProviderError(502, "The AI service didn't answer.", true, `${r.status} ${reason}`.trim().replace(/[^ -~]/g, ""));
  }
  const j = await r.json();
  const content = j?.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c: { text?: string }) => c.text ?? "").join("") : "";
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError(502, "No ideas came back.", true);
  }
}

// ---------- Consent filter ----------
// Safety net for group games, whatever the model: physical contact must go to a willing, matched player.
// "{target}" is filled by the app with someone both sides are into; anything else touching a fixed or random
// person (e.g. "kiss the player on your left") is dropped. "your partner" makes no sense in a group.
const CONTACT = /\b(kiss|kisses|kissing|lips|touch|caress|stroke|massage|lap|neck|collarbone|cuddle|embrace|hug|grind|straddle|undress|spank|spanks|spanking)\b/i;
const CONSENTED = /\{target\}|willing|up for it|if they agree|with their consent/i;
const CRUDE = /\b(lick|licks|licking|spit|tongue)\b/i;

// deno-lint-ignore no-explicit-any
export function consentGuard(out: any, isGroup: boolean): any {
  if (!isGroup || !out || typeof out !== "object") return out;
  const fix = (s: unknown) =>
    String(s ?? "").replace(/\byour partner(['’]s)?\b/gi, (_m: string, poss?: string) => (poss ? "{target}'s" : "{target}"));
  // Contact with the matched player still gets an explicit opt-out
  const soften = (s: string) =>
    CONTACT.test(s) && s.includes("{target}") && !/up for it|willing|if they agree/i.test(s) ? s.replace(/[.!]*\s*$/, ", if they're up for it.") : s;
  const ok = (s: string) => !CRUDE.test(s) && (!CONTACT.test(s) || CONSENTED.test(s));
  const copy = { ...out };
  if (Array.isArray(out.truths)) copy.truths = out.truths.map(fix).filter((s: string) => !CRUDE.test(s));
  if (Array.isArray(out.dares)) copy.dares = out.dares.map((d: unknown) => soften(fix(d))).filter(ok);
  // deno-lint-ignore no-explicit-any
  if (Array.isArray(out.wedges)) copy.wedges = out.wedges.map((w: any) => ({ ...w, text: soften(fix(w?.text)) })).filter((w: { text: string }) => ok(w.text));
  return copy;
}
