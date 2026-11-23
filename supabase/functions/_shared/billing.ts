// Shared Stripe setup for the billing and stripe-webhook functions.
import Stripe from "npm:stripe@23.0.1";
import { createClient } from "npm:@supabase/supabase-js@2";

// Created on first use: the library throws if it's constructed without a key
let client: Stripe | undefined;
export function stripe(): Stripe {
  client ??= new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    httpClient: Stripe.createFetchHttpClient(), // Deno: use fetch instead of Node's http
  });
  return client;
}

export const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

export type Product = "monthly" | "yearly" | "pass";

/** Prices in US cents. Prices are created inline at checkout, so nothing has to be set up in Stripe first. */
export const PRODUCTS: Record<Product, { name: string; cents: number; interval?: "month" | "year"; days?: number }> = {
  monthly: { name: "Midnight Vibes Premium (monthly)", cents: 499, interval: "month" },
  yearly: { name: "Midnight Vibes Premium (yearly)", cents: 2999, interval: "year" },
  pass: { name: "Midnight Vibes Party Pass (7 days)", cents: 299, days: 7 },
};

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });

/** Where Stripe sends people back to: the site they came from if it's ours, otherwise the live site. */
export function returnBase(origin: unknown): string {
  const o = String(origin ?? "");
  if (/^https:\/\/(www\.)?midnightvibes\.online$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)) return o;
  return "https://midnightvibes.online";
}
