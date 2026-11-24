// Anonymous game stats (events table). Batched and sent in the background; never blocks the game.
// Privacy: only the property names in ALLOWED are kept, so names, emails, gender, typed moods or card text
// can't slip in. Disclosed in the privacy policy; people can switch it off in Profile & settings.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { create } from "zustand";

import { cleanProps, type Value } from "@/game/privacy";

import { ensureSession, supabase } from "./supabase";

export type EventName =
  | "session_start" | "game_start" | "card_shown" | "card_skip" | "card_done" | "card_star"
  | "mood_set" | "guest_wall" | "signup" | "signin" | "room_start" | "room_join"
  | "premium_view" | "checkout_start" | "premium_on" | "found_via" | "heat_up" | "heat_undo" | "premium_interest";

const OPT_KEY = "mv.analytics"; // "off" when switched off
export const useAnalytics = create<{ on: boolean; loaded: boolean }>(() => ({ on: true, loaded: false }));
AsyncStorage.getItem(OPT_KEY)
  .then((opt) => {
    useAnalytics.setState({ on: opt !== "off", loaded: true });
    if (opt === "off") queue.length = 0; // anything queued before we knew they'd switched it off
  })
  .catch(() => useAnalytics.setState({ loaded: true }));

/** The switch in Profile & settings. */
export function setAnalytics(on: boolean) {
  useAnalytics.setState({ on });
  AsyncStorage.setItem(OPT_KEY, on ? "on" : "off").catch(() => {});
  if (!on) queue.length = 0;
}

/** One id per app open, to group events into sessions. */
export const sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

type Row = { session_id: string; name: EventName; props: Record<string, Value>; at: string };
const queue: Row[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

// Testing on localhost shouldn't count as real players in the stats
const isLocal = Platform.OS === "web" && typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

export function track(name: EventName, props: Record<string, unknown> = {}) {
  if (!supabase || !useAnalytics.getState().on || isLocal) return;
  queue.push({ session_id: sessionId, name, props: cleanProps(props), at: new Date().toISOString() });
  if (queue.length >= 15) flush();
  else { clearTimeout(timer); timer = setTimeout(flush, 4000); }
}

async function flush() {
  clearTimeout(timer);
  if (!supabase || !queue.length) return;
  const batch = queue.splice(0, queue.length);
  try {
    // New visitors have no session until they use AI, rooms or Account: start their guest session now
    const session = await ensureSession();
    if (!session) { queue.unshift(...batch); return; }
    const { error } = await supabase.from("events").insert(batch);
    if (error && queue.length < 200) queue.unshift(...batch); // keep for the next try, within reason
  } catch {
    if (queue.length < 200) queue.unshift(...batch);
  }
}

// Web: send what's queued when the tab is hidden or closed
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
}

// The address the app was opened at, read before any screen redirects (the 18+ gate drops the query)
const START_URL = Platform.OS === "web" && typeof window !== "undefined" ? window.location.href : "";

/** Opening the app: where they came from and how. A post's short link like midnightvibes.online/t/12 arrives as
 *  /go/tt-12 (see public/_redirects); bio links and others as ?ref=tt-bio. */
export function trackSessionStart() {
  let ref: string | null = null;
  let installed = false;
  if (START_URL) {
    const url = new URL(START_URL);
    ref = url.searchParams.get("ref") ?? url.pathname.match(/^\/go\/([a-z]{2}-[a-z0-9-]+)\/?$/i)?.[1] ?? null;
    installed = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  }
  track("session_start", { ref: ref?.replace(/[^a-z0-9-]/gi, "").slice(0, 30) || null, platform: Platform.OS, installed });
}
