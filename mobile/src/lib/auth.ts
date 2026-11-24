// Accounts: guests play with an anonymous Supabase user; signing up gives them a real account.
// Plans: guest (no AI) / free / premium, with AI mood limits per window of days from the plan_limits table.
import type { User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { create } from "zustand";

import { useGame } from "@/state/store";
import { takePending } from "./pending";

const SIGNING_IN = "mv.signingIn"; // set before Google's redirect, so the reload knows it was a sign-in
import { peekPending } from "./pending";
import { clearProfile, loadProfile } from "./profile";
import { track } from "./track";
import { stopHosting, useRoom } from "./room";
import { ensureSession, providerEnabled, supabase } from "./supabase";

export type Plan = "guest" | "free" | "premium";

type AuthState = {
  ready: boolean;
  user: User | null; // null until the first sign-in (guest or real)
  email: string | null;
  name: string | null;
  plan: Plan;
  used: number; // AI moods used in the current window
  limit: number; // AI moods per window on this plan
  windowDays: number; // the limit covers this many days (free: 2)
  nextAt: string | null; // date (YYYY-MM-DD) the oldest counted AI mood drops out of the window
  premiumUntil: string | null;
  product: "monthly" | "yearly" | "pass" | null;
  canManage: boolean; // has a card subscription (Paystack page: update card, cancel)
  renews: boolean; // that subscription will charge again
};

export const useAuth = create<AuthState>(() => ({
  ready: false, user: null, email: null, name: null, plan: "guest", used: 0, limit: 0, windowDays: 1, nextAt: null, premiumUntil: null, product: null, canManage: false, renews: false,
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
  const before = useAuth.getState();
  if (!user) { useAuth.setState({ ...base, ready: true, plan: "guest", used: 0 }); return; }
  const { data: rows } = await supabase.rpc("my_usage");
  const row = Array.isArray(rows) ? rows[0] : rows;
  useAuth.setState({
    ...base,
    ready: true,
    plan: (row?.plan as Plan) ?? (user.is_anonymous ? "guest" : "free"),
    used: row?.used ?? 0,
    limit: row?.day_limit ?? 0,
    windowDays: row?.window_days ?? 1,
    nextAt: row?.next_at ?? null,
    premiumUntil: row?.premium_until ?? null,
    product: row?.product ?? null,
    canManage: !!row?.can_manage,
    renews: !!row?.renews,
  });
  useGame.setState({ premium: useAuth.getState().plan === "premium" });
  if (base.email) {
    if (!before.email) trackSignIn(user, before.ready);
    loadProfile(base.name).catch(() => null);
    resumePending();
  } else clearProfile();
}

/** Stats: a guest just became signed in (sign-up if the account is brand new). Not counted on normal app opens. */
async function trackSignIn(user: User, wasReady: boolean) {
  const flag = await AsyncStorage.getItem(SIGNING_IN).catch(() => null);
  if (!wasReady && !flag) return; // just opening the app while already signed in
  AsyncStorage.removeItem(SIGNING_IN).catch(() => {});
  const isNew = Date.now() - new Date(user.created_at).getTime() < 10 * 60 * 1000;
  const from = (await peekPending())?.reason ?? null;
  track(isNew ? "signup" : "signin", { method: user.app_metadata?.provider === "google" ? "google" : "email", from });
}

let resuming = false;
/** They were sent to sign in mid-game (or to join/host a room): put things back and take them there. */
async function resumePending() {
  if (resuming) return;
  resuming = true;
  try {
    const p = await takePending();
    if (!p) return;
    const game = useGame.getState();
    game.restore(p.game); // after a page reload (Google sign-in) memory is empty: rebuild the game
    if (p.mood) game.setMood(p.mood);
    const needsPlayers = p.path === "/tod" || p.path === "/wheel";
    if (p.path !== "/account" && (!needsPlayers || useGame.getState().players.length >= 2)) router.replace(p.path as never);
  } finally {
    resuming = false;
  }
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
  // The confirmation email links back here (not Supabase's default Site URL), which signs them straight in
  const emailRedirectTo = Platform.OS === "web" ? `${window.location.origin}/account` : Linking.createURL("account");
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo, data: { display_name: name.trim().slice(0, 40) || null } } });
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
    await AsyncStorage.setItem(SIGNING_IN, "google").catch(() => {});
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

/** How many AI moods are left and how to describe the window: "today" or "every 2 days", plus when the next one frees up. */
export function aiAllowance({ used, limit, windowDays, nextAt }: Pick<AuthState, "used" | "limit" | "windowDays" | "nextAt">) {
  const left = Math.max(limit - used, 0);
  const period = windowDays > 1 ? `every ${windowDays} days` : "today";
  // nextAt is a plain date; read it as local midnight so the weekday doesn't shift
  const next = nextAt && !left ? new Date(`${nextAt}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : null;
  return { left, period, next, unit: limit === 1 ? "AI mood" : "AI moods" };
}

export const PLAN_NAMES: Record<Plan, string> ={ guest: "Guest", free: "Free account", premium: "Premium" };
