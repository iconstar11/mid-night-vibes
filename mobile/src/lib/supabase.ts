import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Public values only: the anon key is designed to ship in apps. Row Level Security protects the data.
// The Anthropic key is never here; it lives in Supabase secrets and is used by the Edge Function.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseReady = !!(url && anonKey);

export const supabase: SupabaseClient | null = supabaseReady
  ? createClient(url!, anonKey!, {
      auth: {
        // Web uses localStorage by default; static rendering on the server has no storage at all
        storage: Platform.OS === "web" ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: typeof window !== "undefined" || Platform.OS !== "web",
        detectSessionInUrl: Platform.OS === "web",
      },
    })
  : null;
