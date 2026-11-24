// Supabase Edge Function "billing": Premium payments with Paystack.
//   { action: "config" }                   → { cardCurrency, paymentsOpen }: KES until USD is enabled; whether buying is on
// Buying is closed until the PAYMENTS_OPEN secret is "true" (Paystack approval): card and mpesa are refused,
// and the app shows "Premium is coming soon". Open with: npx supabase secrets set PAYMENTS_OPEN=true
//   { action: "card", product, origin }    → Paystack's card / Apple Pay page. Monthly/yearly renew automatically.
//   { action: "mpesa", product, phone }    → M-Pesa STK push (KES): the phone shows a PIN prompt. Buys days.
//   { action: "verify", reference }        → checks a payment with Paystack and turns Premium on (once)
//   { action: "manage", origin }           → Paystack's page to update the card or cancel renewal
// Requires a signed-up (not guest) account so Premium belongs to someone who can sign in again.
import { PRODUCTS, PaystackError, admin, cardCurrency, cors, fulfil, json, kenyanPhone, paystack, planCode, priceIn, returnBase, type Product } from "../_shared/billing.ts";

const newReference = () => "mv_" + crypto.randomUUID().replace(/-/g, "");
const paymentsOpen = () => Deno.env.get("PAYMENTS_OPEN") === "true";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  if (!Deno.env.get("PAYSTACK_SECRET_KEY")) return json(503, { error: "Payments aren't set up yet." });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json(401, { error: "Sign in first." });
  if (user.is_anonymous || !user.email) return json(403, { error: "Create a free account first, so Premium stays with you." });

  let body: { action?: string; product?: string; origin?: string; phone?: string; reference?: string };
  try { body = await req.json(); } catch { return json(400, { error: "The request wasn't readable." }); }

  try {
    if (body.action === "config") return json(200, { cardCurrency: cardCurrency(), paymentsOpen: paymentsOpen() });

    // ----- Check a payment (after returning from the card page, or while waiting for M-Pesa) -----
    if (body.action === "verify") {
      const reference = String(body.reference ?? "");
      const { data: pay } = await admin.from("payments").select("user_id,status,granted_at").eq("reference", reference).maybeSingle();
      if (!pay || pay.user_id !== user.id) return json(404, { error: "Payment not found." });
      if (pay.granted_at) return json(200, { status: "success" });
      const tx = await paystack("GET", `/transaction/verify/${encodeURIComponent(reference)}`).catch((e) => {
        if (e instanceof PaystackError && e.status === 400) return { status: "pending", reference }; // not paid yet
        throw e;
      });
      const result = await fulfil(tx);
      if (tx.status === "failed" || tx.status === "abandoned") {
        await admin.from("payments").update({ status: "failed" }).eq("reference", reference).is("granted_at", null);
        return json(200, { status: "failed", message: tx.gateway_response ?? "The payment didn't go through." });
      }
      return json(200, { status: result === "granted" || result === "already" ? "success" : "pending" });
    }

    // ----- Manage a card subscription -----
    if (body.action === "manage") {
      const { data: ent } = await admin.from("entitlements").select("paystack_subscription_code").eq("user_id", user.id).maybeSingle();
      if (!ent?.paystack_subscription_code) return json(404, { error: "There's no card subscription to manage." });
      const link = await paystack<{ link: string }>("GET", `/subscription/${ent.paystack_subscription_code}/manage/link`);
      return json(200, { url: link.link });
    }

    // ----- Buying: closed until Paystack approves the account -----
    if (!paymentsOpen()) return json(403, { error: "Premium is coming soon. Payments aren't open yet." });
    const product = body.product as Product;
    const p = PRODUCTS[product];
    if (!p) return json(400, { error: "Unknown product." });
    const reference = newReference();
    const metadata = JSON.stringify({ user_id: user.id, product, reference });

    // ----- Card or Apple Pay (USD once enabled, KES until then) -----
    if (body.action === "card") {
      const currency = cardCurrency();
      const amount = priceIn(product, currency);
      await admin.from("payments").insert({ reference, user_id: user.id, product, channel: "card", currency, amount });
      const tx = await paystack<{ authorization_url: string }>("POST", "/transaction/initialize", {
        email: user.email,
        amount: String(amount),
        currency,
        channels: ["card", "apple_pay"], // Apple Pay shows only on Apple devices in Safari
        reference,
        callback_url: `${returnBase(body.origin)}/account?paid=1&ref=${reference}`,
        metadata,
        ...(p.interval ? { plan: await planCode(product, currency) } : {}),
      });
      return json(200, { url: tx.authorization_url, reference });
    }

    // ----- M-Pesa (KES), STK push -----
    if (body.action === "mpesa") {
      const phone = kenyanPhone(body.phone);
      if (!phone) return json(400, { error: "Enter your M-Pesa number, like 0712 345 678." });
      await admin.from("payments").insert({ reference, user_id: user.id, product, channel: "mpesa", currency: "KES", amount: p.kes });
      const charge = await paystack<{ status: string; display_text?: string }>("POST", "/charge", {
        email: user.email,
        amount: String(p.kes),
        currency: "KES",
        reference,
        metadata,
        mobile_money: { phone, provider: "mpesa" },
      });
      return json(200, { reference, status: charge.status, message: charge.display_text ?? "Check your phone and enter your M-Pesa PIN." });
    }

    return json(400, { error: "Unknown action." });
  } catch (err) {
    console.error("billing:", (err as Error)?.message ?? err);
    const msg = err instanceof PaystackError && err.status < 500 ? err.message : "The payment couldn't start. Try again in a moment.";
    return json(502, { error: msg });
  }
});
