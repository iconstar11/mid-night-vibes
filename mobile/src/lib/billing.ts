// Web payments with Stripe Checkout (via the Supabase "billing" function).
// The app never sees card details: Stripe's own page takes the payment, then a webhook turns Premium on.
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { refreshAccount, useAuth } from "./auth";
import { supabase } from "./supabase";
import { track } from "./track";

export type Product = "monthly" | "yearly" | "pass";

export const OFFERS: { id: Product; title: string; price: string; per: string; note: string }[] = [
  { id: "pass", title: "Party pass", price: "$2.99", per: "7 days", note: "One payment, perfect for a night or a weekend" },
  { id: "monthly", title: "Monthly", price: "$4.99", per: "month", note: "Cancel any time" },
  { id: "yearly", title: "Yearly", price: "$29.99", per: "year", note: "Half the monthly price" },
];

const origin = () => (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "https://midnightvibes.online");

async function call(body: Record<string, unknown>): Promise<string> {
  if (!supabase) throw new Error("Payments need the Supabase settings.");
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("billing", { body: { ...body, origin: origin() } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const b = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
    throw new Error(b?.error ?? "The payment page couldn't open.");
  }
  if (!data?.url) throw new Error(data?.error ?? "The payment page couldn't open.");
  return data.url;
}

/** Web: go to Stripe's page (it comes back to /account?paid=1). Apps: open it in an in-app browser. */
async function open(url: string) {
  if (Platform.OS === "web") { window.location.assign(url); return; }
  await WebBrowser.openBrowserAsync(url);
  await refreshAccount(); // back from the browser: Premium may be on now
}

export async function buy(product: Product) {
  track("checkout_start", { product });
  await open(await call({ action: "checkout", product }));
}

export async function manageBilling() {
  await open(await call({ action: "portal" }));
}

/** After returning from checkout the webhook may take a few seconds: check a few times. */
export async function waitForPremium(tries = 6): Promise<boolean> {
  for (let i = 0; i < tries; i++) {
    await refreshAccount();
    if (useAuth.getState().plan === "premium") return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
