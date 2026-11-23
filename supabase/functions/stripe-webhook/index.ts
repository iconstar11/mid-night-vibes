// Supabase Edge Function "stripe-webhook": Stripe tells us about payments here, and we switch Premium on or off.
// Deployed without JWT verification (Stripe can't send one); every request is verified with the
// Stripe signature instead, using STRIPE_WEBHOOK_SECRET.
import Stripe from "npm:stripe@23.0.1";

import { PRODUCTS, admin, stripe, type Product } from "../_shared/billing.ts";

const crypto = Stripe.createSubtleCryptoProvider();
// Checking a signature needs only the webhook secret, not the API key
const verifier = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "sk_test_signature_check_only", { httpClient: Stripe.createFetchHttpClient() });

/** End of the paid period. In current Stripe API versions it lives on the subscription items. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const ends = sub.items.data.map((i) => (i as unknown as { current_period_end?: number }).current_period_end).filter((n): n is number => typeof n === "number");
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  const t = ends.length ? Math.max(...ends) : legacy;
  return t ? new Date(t * 1000).toISOString() : null;
}

async function applySubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) return console.error("subscription without user_id:", sub.id);
  const active = ["active", "trialing", "past_due"].includes(sub.status); // past_due: Stripe is still retrying the card
  const product = (sub.metadata?.product as Product) ?? "monthly";
  await admin.from("entitlements").upsert({
    user_id: userId,
    plan: active ? "premium" : "free",
    source: "stripe",
    product: active ? product : null,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: active ? sub.id : null,
    expires_at: active ? periodEnd(sub) : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const signature = req.headers.get("Stripe-Signature");
  if (!secret || !signature) return new Response("Not configured", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await verifier.webhooks.constructEventAsync(await req.text(), signature, secret, undefined, crypto);
  } catch (err) {
    console.error("webhook signature:", (err as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id ?? s.metadata?.user_id;
        const product = s.metadata?.product as Product | undefined;
        if (!userId || !product) break;
        if (s.mode === "payment" && s.payment_status === "paid") {
          // Party pass: Premium for 7 more days
          await admin.rpc("grant_premium_days", { uid: userId, days: PRODUCTS.pass.days ?? 7, src: "stripe" });
        } else if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          await applySubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object as Stripe.Subscription);
        break;
    }
  } catch (err) {
    console.error("webhook handling:", event.type, (err as Error).message);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
