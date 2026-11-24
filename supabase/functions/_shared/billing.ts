// Shared Paystack setup for the billing and paystack-webhook functions.
// Cards pay in USD (monthly/yearly as auto-renewing Paystack plans); M-Pesa pays in KES (each payment buys days).
import { createClient } from "npm:@supabase/supabase-js@2";

export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

export type Product = "monthly" | "yearly" | "pass";

/** Prices in subunits (cents). KES is for M-Pesa, which only takes KES. `days` is what one payment buys. */
export const PRODUCTS: Record<Product, { name: string; usd: number; kes: number; days: number; interval?: "monthly" | "annually" }> = {
  monthly: { name: "Midnight Vibes Premium (monthly)", usd: 499, kes: 65000, days: 30, interval: "monthly" },
  yearly: { name: "Midnight Vibes Premium (yearly)", usd: 2999, kes: 390000, days: 365, interval: "annually" },
  pass: { name: "Midnight Vibes Party Pass (7 days)", usd: 299, kes: 39000, days: 7 },
};
/** Card (and Apple Pay) currency. USD needs Paystack to enable it on the account; until then cards charge KES.
 *  Switch with: supabase secrets set CARD_CURRENCY=USD (no code change). M-Pesa is always KES. */
export const cardCurrency = (): "USD" | "KES" => (Deno.env.get("CARD_CURRENCY")?.toUpperCase() === "USD" ? "USD" : "KES");
export const priceIn = (product: Product, currency: string) => (currency === "USD" ? PRODUCTS[product].usd : PRODUCTS[product].kes);

/** A renewing card plan gets a little slack past the period, so a renewal a few hours late doesn't drop Premium. */
export const RENEWAL_GRACE_DAYS = 2;

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

/** Where Paystack sends people back to: the site they came from if it's ours, otherwise the live site. */
export function returnBase(origin: unknown): string {
  const o = String(origin ?? "");
  if (/^https:\/\/(www\.)?midnightvibes\.online$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)) return o;
  return "https://midnightvibes.online";
}

// ---------- Paystack API ----------

export class PaystackError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// deno-lint-ignore no-explicit-any
export async function paystack<T = any>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!key) throw new PaystackError("Payments aren't set up yet.", 503);
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j?.status === false) throw new PaystackError(String(j?.message ?? `Paystack ${r.status}`).slice(0, 200), r.status);
  return j.data as T;
}

/** The plan code for a renewing product in a currency, created on Paystack the first time it's needed. */
const planCache: Record<string, string> = {};
export async function planCode(product: Product, currency: string): Promise<string> {
  const p = PRODUCTS[product];
  if (!p.interval) throw new Error("Not a renewing product");
  const key = `${product}:${currency}`;
  if (planCache[key]) return planCache[key];
  const amount = priceIn(product, currency);
  const plans = await paystack<{ name: string; plan_code: string; currency: string; amount: number; interval: string }[]>("GET", "/plan?perPage=100");
  let found = plans.find((x) => x.name === p.name && x.currency === currency && x.amount === amount && x.interval === p.interval);
  if (!found) found = await paystack("POST", "/plan", { name: p.name, interval: p.interval, amount, currency });
  return (planCache[key] = found!.plan_code);
}

/** Kenyan phone numbers to +2547XXXXXXXX / +2541XXXXXXXX (Paystack rejects them without the +), or null. */
export function kenyanPhone(input: unknown): string | null {
  const d = String(input ?? "").replace(/[\s()-]/g, "").replace(/^\+/, "");
  const m = d.match(/^(?:254|0)?([17]\d{8})$/);
  return m ? `+254${m[1]}` : null;
}

// ---------- Webhook signatures ----------

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmac512(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * Checks a webhook really came from Paystack.
 * New format: Paystack-Signature: t=<unix>,v1=<whk_id>:<hex>  = HMAC-SHA512(PAYSTACK_WEBHOOK_SECRET, "<t>.<raw body>"),
 *             rejected if t is more than 5 minutes off.
 * Legacy:     x-paystack-signature = HMAC-SHA512(PAYSTACK_SECRET_KEY, raw body), used only while no signing secret is set.
 */
export async function verifyWebhook(headers: Headers, raw: string): Promise<boolean> {
  const signingSecret = Deno.env.get("PAYSTACK_WEBHOOK_SECRET");
  const header = headers.get("paystack-signature");
  if (signingSecret && header) {
    const parts = header.split(",").map((s) => s.trim());
    const t = parts.find((p) => p.startsWith("t="))?.slice(2) ?? "";
    if (!/^\d+$/.test(t) || Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;
    const expected = await hmac512(signingSecret, `${t}.${raw}`);
    return parts.filter((p) => p.startsWith("v1=")).some((p) => sameHex(p.slice(3).split(":").pop() ?? "", expected));
  }
  if (signingSecret) return false; // a signing secret is set but the new header is missing: don't fall back
  const legacy = headers.get("x-paystack-signature");
  const key = Deno.env.get("PAYSTACK_SECRET_KEY");
  return !!(legacy && key && sameHex(legacy, await hmac512(key, raw)));
}

// ---------- Fulfilment (shared by the app's verify call and the webhook) ----------

// deno-lint-ignore no-explicit-any
type Tx = Record<string, any>;

const productForPlan = (tx: Tx): Product | null => {
  const interval = tx.plan_object?.interval ?? tx.plan?.interval;
  return interval === "monthly" ? "monthly" : interval === "annually" ? "yearly" : null;
};

/**
 * Turn one verified Paystack transaction into Premium days, exactly once. Always call with data from
 * GET /transaction/verify (never a webhook body as-is). Returns "granted", "already", "pending" or "ignored".
 */
export async function fulfil(tx: Tx): Promise<"granted" | "already" | "pending" | "ignored"> {
  const reference = String(tx.reference ?? "");
  if (!reference) return "ignored";
  if (tx.status !== "success") return "pending";
  const customerCode: string | undefined = tx.customer?.customer_code;

  let { data: pay } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (!pay) {
    // A renewal: Paystack charged the saved card and made its own reference. Find the user by their customer code.
    const product = productForPlan(tx);
    if (!product || !customerCode) return "ignored";
    const { data: ent } = await admin.from("entitlements").select("user_id").eq("paystack_customer_code", customerCode).maybeSingle();
    if (!ent) { console.error("renewal for unknown customer", customerCode); return "ignored"; }
    const row = { reference, user_id: ent.user_id, product, channel: "card", currency: String(tx.currency), amount: Number(tx.amount) };
    const { data } = await admin.from("payments").upsert(row, { onConflict: "reference", ignoreDuplicates: true }).select("*").maybeSingle();
    pay = data ?? (await admin.from("payments").select("*").eq("reference", reference).maybeSingle()).data;
    if (!pay) return "ignored";
  }

  // The amount and currency must match the price we set (protects against altered or test payments)
  const p = PRODUCTS[pay.product as Product];
  const expected = { currency: String(pay.currency), amount: priceIn(pay.product as Product, String(pay.currency)) };
  if (String(tx.currency) !== expected.currency || Number(tx.amount) < expected.amount) {
    console.error("payment amount mismatch", reference, tx.currency, tx.amount);
    await admin.from("payments").update({ status: "failed" }).eq("reference", reference);
    return "ignored";
  }

  const renewing = pay.channel === "card" && !!p.interval;
  const { data: granted, error } = await admin.rpc("grant_paid_premium", { p_reference: reference, p_days: p.days + (renewing ? RENEWAL_GRACE_DAYS : 0), p_stack: !renewing });
  if (error) throw new Error(error.message);
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (customerCode) patch.paystack_customer_code = customerCode;
  if (renewing) {
    patch.renews = true;
    // The subscription.create webhook can arrive before this payment is recorded: look the subscription up here too
    if (tx.customer?.id) {
      const subs = await paystack<{ subscription_code: string; email_token: string; status: string }[]>("GET", `/subscription?customer=${tx.customer.id}&perPage=20`).catch(() => []);
      const active = subs.find((x) => x.status === "active" || x.status === "non-renewing");
      if (active) { patch.paystack_subscription_code = active.subscription_code; patch.paystack_email_token = active.email_token; }
    }
  }
  await admin.from("entitlements").update(patch).eq("user_id", pay.user_id);
  return granted ? "granted" : "already";
}
