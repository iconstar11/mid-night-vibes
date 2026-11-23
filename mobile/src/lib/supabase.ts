import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Public values only: the anon key is designed to ship in apps. Row Level Security protects the data.
// The Anthropic key is never here; it lives in Supabase secrets and is used by the Edge Function.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = !!(url && anonKey);

/** Is a sign-in provider (e.g. "google") switched on in the Supabase project? */
export async function providerEnabled(name: string): Promise<boolean> {
  if (!supabaseReady) return false;
  try {
    const r = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey! } });
    const j = await r.json();
    return !!j?.external?.[name];
  } catch {
    return false;
  }
}

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url!, anonKey!, {
      auth: {
        // Web uses localStorage by default; static rendering on the server has no storage at all
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: typeof window !== "undefined" || Platform.OS !== "web",
        detectSessionInUrl: Platform.OS === "web",
        // PKCE: Google sign-in returns a one-time code (works for web redirects and app deep links)
        flowType: "pkce",
      },
    })
  : null;

/** Everyone gets a user id, at least an anonymous one, so AI limits and rooms work without an account. */
let pending: Promise<import("@supabase/supabase-js").Session | null> | null = null;
export function ensureSession() {
  if (!supabase) return Promise.resolve(null);
  // One sign-in at a time, even if the AI and a room ask together
  pending ??= (async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error("Couldn't sign in. Check your connection.");
    return anon.session;
  })().finally(() => { pending = null; });
  return pending;
}
