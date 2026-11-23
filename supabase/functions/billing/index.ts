// Supabase Edge Function "billing": starts Stripe Checkout, or opens the Stripe customer portal.
// POST { action: "checkout", product: "monthly" | "yearly" | "pass", origin } or { action: "portal", origin }
// Requires a signed-up (not guest) account so Premium belongs to someone who can sign in again.
import { PRODUCTS, admin, cors, json, returnBase, stripe, type Product } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  if (!Deno.env.get("STRIPE_SECRET_KEY")) return json(503, { error: "Payments aren't set up yet." });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json(401, { error: "Sign in first." });
  if (user.is_anonymous || !user.email) return json(403, { error: "Create a free account first, so Premium stays with you." });

  let body: { action?: string; product?: string; origin?: string };
  try { body = await req.json(); } catch { return json(400, { error: "The request wasn't readable." }); }
  const base = returnBase(body.origin);

  // One Stripe customer per user, remembered on their entitlements row
  const { data: ent } = await admin.from("entitlements").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  let customer = ent?.stripe_customer_id as string | null | undefined;

  try {
    if (body.action === "portal") {
      if (!customer) return json(404, { error: "There's no purchase to manage yet." });
      const portal = await stripe().billingPortal.sessions.create({ customer, return_url: `${base}/account` });
      return json(200, { url: portal.url });
    }

    const product = body.product as Product;
    const p = PRODUCTS[product];
    if (!p) return json(400, { error: "Unknown product." });

    if (!customer) {
      const c = await stripe().customers.create({ email: user.email, metadata: { user_id: user.id } });
      customer = c.id;
      await admin.from("entitlements").upsert({ user_id: user.id, stripe_customer_id: customer, updated_at: new Date().toISOString() });
    }

    const price_data = {
      currency: "usd",
      unit_amount: p.cents,
      product_data: { name: p.name },
      ...(p.interval ? { recurring: { interval: p.interval } } : {}),
    };
    const session = await stripe().checkout.sessions.create({
      mode: p.interval ? "subscription" : "payment",
      customer,
      client_reference_id: user.id,
      line_items: [{ price_data, quantity: 1 }],
      metadata: { user_id: user.id, product },
      ...(p.interval ? { subscription_data: { metadata: { user_id: user.id, product } } } : {}),
      allow_promotion_codes: true,
      success_url: `${base}/account?paid=1`,
      cancel_url: `${base}/account`,
    });
    return json(200, { url: session.url });
  } catch (err) {
    console.error("billing:", (err as Error)?.message ?? err);
    return json(502, { error: "The payment page couldn't open. Try again in a moment." });
  }
});
