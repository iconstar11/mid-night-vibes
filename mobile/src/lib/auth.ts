// Accounts: guests play with an anonymous Supabase user; signing up gives them a real account.
// Plans: guest / free / premium, with daily AI mood limits from the plan_limits table.
import type { User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { create } from "zustand";

import { stopHosting, useRoom } from "./room";
import { ensureSession, providerEnabled, supabase } from "./supabase";

export type Plan = "guest" | "free" | "premium";

type AuthState = {
  ready: boolean;
  user: User | null; // null until the first sign-in (guest or real)
  email: string | null;
  name: string | null;
  plan: Plan;
  used: number; // AI moods today
  limit: number; // AI moods per day on this plan
  premiumUntil: string | null;
  product: "monthly" | "yearly" | "pass" | null;
  canManage: boolean; // has a Stripe customer (portal: receipts, cancel)
};

export const useAuth = create<AuthState>(() => ({
  ready: false, user: null, email: null, name: null, plan: "guest", used: 0, limit: 3, premiumUntil: null, product: null, canManage: false,
}));

/** Reload who's signed in, their plan and today's AI usage. */
export async function refreshAccount() {
  if (!supabase) { useAuth.setState({ ready: true }); return; }
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;
  const base = {
    user,
    email: user && !user.is_anonymous ? user.email ?? null : null,
    name: (user?.user_metadata?.display_name as string | undefined) ?? null,
  };
  if (!user) { useAuth.setState({ ...base, ready: true, plan: "guest", used: 0 }); return; }
  const { data: rows } = await supabase.rpc("my_usage");
  const row = Array.isArray(rows) ? rows[0] : rows;
  useAuth.setState({
    ...base,
    ready: true,
    plan: (row?.plan as Plan) ?? (user.is_anonymous ? "guest" : "free"),
    used: row?.used ?? 0,
    limit: row?.day_limit ?? 3,
    premiumUntil: row?.premium_until ?? null,
    product: row?.product ?? null,
    canManage: !!row?.can_manage,
  });
}

if (supabase) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
      setTimeout(refreshAccount, 0); // outside the auth callback, as Supabase recommends
    }
  });
}

/** Switching users ends any room this phone is hosting (its broadcast rights belong to the old user). */
async function beforeSwitch() {
  if (useRoom.getState().role === "host") await stopHosting();
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "That email already has an account. Sign in instead.";
  if (m.includes("invalid login")) return "Email or password doesn't match.";
  if (m.includes("password") && m.includes("characters")) return "Use a password of at least 8 characters.";
  if (m.includes("valid email") || m.includes("invalid format")) return "That doesn't look like an email address.";
  if (m.includes("email not confirmed")) return "Confirm your email first: check your inbox for the link.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a minute and try again.";
  if (m.includes("signups not allowed")) return "New accounts are paused right now.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Google sign-in isn't switched on yet. Use email for now.";
  return message || "Something went wrong. Try again.";
}

const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export type AuthResult = { ok: true; confirm?: boolean } | { ok: false; error: string };

/** Create an account. If the project requires email confirmation, `confirm` is true and they must click the email link. */
export async function signUp(email: string, password: string, name: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Accounts need the Supabase settings." };
  email = email.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "That doesn't look like an email address." };
  if (password.length < 8) return { ok: false, error: "Use a password of at least 8 characters." };
  await beforeSwitch();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name.trim().slice(0, 40) || null } } });
  if (error) return { ok: false, error: friendly(error.message) };
  // Supabase hides "already registered" behind an empty identities list when confirmation is on
  if (data.user && data.user.identities?.length === 0) return { ok: false, error: "That email already has an account. Sign in instead." };
  await refreshAccount();
  return { ok: true, confirm: !data.session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Accounts need the Supabase settings." };
  email = email.trim().toLowerCase();
  if (!validEmail(email)) return { ok: false, error: "That doesn't look like an email address." };
  await beforeSwitch();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: friendly(error.message) };
  await refreshAccount();
  return { ok: true };
}

/** Sign out, then carry on as a fresh guest. */
export async function signOut() {
  if (!supabase) return;
  await beforeSwitch();
  await supabase.auth.signOut();
  await ensureSession().catch(() => null);
  await refreshAccount();
}

/** Google sign-in. Web: a full-page redirect that comes back to /account. Apps: an in-app browser + deep link. */
export async function signInWithGoogle(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Accounts need the Supabase settings." };
  if (!(await providerEnabled("google"))) return { ok: false, error: "Google sign-in isn't switched on yet. Use email for now." };
  await beforeSwitch();
  if (Platform.OS === "web") {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/account` } });
    return error ? { ok: false, error: friendly(error.message) } : { ok: true };
  }
  const redirectTo = Linking.createURL("account");
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) return { ok: false, error: friendly(error?.message ?? "") };
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") return { ok: false, error: "Google sign-in was cancelled." };
  const code = new URL(res.url).searchParams.get("code");
  if (!code) return { ok: false, error: "Google didn't finish signing you in. Try again." };
  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
  if (exErr) return { ok: false, error: friendly(exErr.message) };
  await refreshAccount();
  return { ok: true };
}

export const PLAN_NAMES: Record<Plan, string> = { guest: "Guest", free: "Free account", premium: "Premium" };
