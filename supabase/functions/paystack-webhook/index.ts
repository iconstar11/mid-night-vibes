// Supabase Edge Function "paystack-webhook": Paystack tells us about payments and subscriptions here.
// Deployed without JWT verification (Paystack can't send one); every request's signature is checked instead
// (see verifyWebhook in _shared/billing.ts). Payments are re-checked with Paystack before any Premium is given.
// Set this URL in Paystack → Settings → API Keys & Webhooks: https://<ref>.supabase.co/functions/v1/paystack-webhook
import { admin, fulfil, paystack, verifyWebhook } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  const raw = await req.text();
  if (!(await verifyWebhook(req.headers, raw))) return new Response("Bad signature", { status: 401 });

  // deno-lint-ignore no-explicit-any
  let event: { event?: string; data?: any };
  try { event = JSON.parse(raw); } catch { return new Response("Bad body", { status: 400 }); }
  const d = event.data ?? {};
  const customer: string | undefined = d.customer?.customer_code;

  try {
    switch (event.event) {
      case "charge.success": {
        // Don't trust the body for money: ask Paystack again
        const tx = await paystack("GET", `/transaction/verify/${encodeURIComponent(String(d.reference))}`);
        const r = await fulfil(tx);
        if (r === "ignored") console.error("charge.success not matched to a payment:", d.reference);
        break;
      }
      case "subscription.create":
      case "subscription.enable":
        if (customer) {
          await admin.from("entitlements").update({
            paystack_subscription_code: d.subscription_code, paystack_email_token: d.email_token, renews: true, updated_at: new Date().toISOString(),
          }).eq("paystack_customer_code", customer);
        }
        break;
      case "subscription.not_renew":
      case "subscription.disable":
      case "invoice.payment_failed":
        // Keeps Premium until the paid period ends; it just won't renew (Paystack doesn't retry failed charges)
        if (customer) await admin.from("entitlements").update({ renews: false, updated_at: new Date().toISOString() }).eq("paystack_customer_code", customer);
        break;
    }
  } catch (err) {
    console.error("paystack-webhook:", event.event, (err as Error).message);
    return new Response("Handler error", { status: 500 }); // Paystack retries
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
});
