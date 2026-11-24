// Premium payments with Paystack (via the Supabase "billing" function). The app never sees card details or PINs.
// Card: Paystack's page, in USD; monthly and yearly renew automatically. M-Pesa: a PIN prompt on the phone, in KES;
// each payment buys 7, 30 or 365 days.
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { refreshAccount, useAuth } from "./auth";
import { supabase } from "./supabase";
import { track } from "./track";

export type Product = "monthly" | "yearly" | "pass";

export const OFFERS: { id: Product; title: string; price: string; kes: string; per: string; note: string }[] = [
  { id: "pass", title: "Party pass", price: "$2.99", kes: "KES 390", per: "7 days", note: "One payment, perfect for a night or a weekend" },
  { id: "monthly", title: "Monthly", price: "$4.99", kes: "KES 650", per: "month", note: "Card renews monthly, cancel any time. M-Pesa: 30 days" },
  { id: "yearly", title: "Yearly", price: "$29.99", kes: "KES 3,900", per: "year", note: "Half the monthly price. M-Pesa: 365 days" },
];

const origin = () => (Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : "https://midnightvibes.online");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Payments need the Supabase settings.");
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>("billing", { body: { ...body, origin: origin() } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    const b = ctx && typeof ctx.json === "function" ? await ctx.json().catch(() => null) : null;
    throw new Error(b?.error ?? "The payment couldn't start. Try again in a moment.");
  }
  return data as T;
}

/** What cards are charged in right now: KES until Paystack enables USD on the account. */
export async function cardCurrency(): Promise<"USD" | "KES"> {
  const r = await call<{ cardCurrency?: string }>({ action: "config" }).catch(() => ({ cardCurrency: "KES" }));
  return r.cardCurrency === "USD" ? "USD" : "KES";
}

/** Card: go to Paystack's page (it comes back to /account?paid=1&ref=…). Apps: in-app browser, then check. */
export async function payByCard(product: Product) {
  track("checkout_start", { product, method: "card" });
  const { url, reference } = await call<{ url: string; reference: string }>({ action: "card", product });
  if (Platform.OS === "web") { window.location.assign(url); return; }
  await WebBrowser.openBrowserAsync(url);
  await waitForPayment(reference, 5);
}

/** M-Pesa: sends the PIN prompt to their phone. Returns the reference to wait on. */
export async function payByMpesa(product: Product, phone: string): Promise<{ reference: string; message: string }> {
  track("checkout_start", { product, method: "mpesa" });
  return call({ action: "mpesa", product, phone });
}

/** Ask the server to check a payment with Paystack (and switch Premium on once it's paid). */
export async function checkPayment(reference: string): Promise<{ status: "success" | "pending" | "failed"; message?: string }> {
  return call({ action: "verify", reference });
}

/** Check every few seconds until paid, failed, or out of tries. M-Pesa gives people about 3 minutes. */
export async function waitForPayment(reference: string, tries = 40, everyMs = 4000): Promise<"success" | "pending" | "failed"> {
  for (let i = 0; i < tries; i++) {
    const r = await checkPayment(reference).catch(() => ({ status: "pending" as const }));
    if (r.status !== "pending") { await refreshAccount(); return r.status; }
    await new Promise((res) => setTimeout(res, everyMs));
  }
  await refreshAccount();
  return "pending";
}

/** Card subscribers: Paystack's page to update the card or stop renewing. */
export async function manageBilling() {
  const { url } = await call<{ url: string }>({ action: "manage" });
  if (Platform.OS === "web") { window.location.assign(url); return; }
  await WebBrowser.openBrowserAsync(url);
  await refreshAccount();
}

/** Back from the card page: check that payment (or, without a reference, just reload a few times). */
export async function waitForPremium(reference?: string): Promise<boolean> {
  if (reference) return (await waitForPayment(reference, 8, 2500)) === "success";
  for (let i = 0; i < 6; i++) {
    await refreshAccount();
    if (useAuth.getState().plan === "premium") return true;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
