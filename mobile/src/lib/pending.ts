// Where a guest was when they were sent to sign in, so the app carries on from there afterwards:
// the game (players, heat, turn, mood), a live room they were joining, or the share sheet they opened.
// Kept on the device because Google sign-in on the web reloads the page and memory is lost.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useGame, type GameSnapshot } from "@/state/store";

const KEY = "mv.pendingResume";
const MAX_AGE = 24 * 60 * 60 * 1000; // email confirmation can take a while, but not days

export type PendingReason = "turns" | "room" | "host" | "mood";
export type PendingResume = { reason: PendingReason; path: string; mood?: string; game: GameSnapshot; at: number };

/** Remember where they are (and the mood they picked, if any) before sending them to sign in. */
export async function savePending(reason: PendingReason, path: string, mood?: string) {
  const m = mood?.trim().slice(0, 200);
  const p: PendingResume = { reason, path, mood: m || undefined, game: useGame.getState().snapshot(), at: Date.now() };
  try { await AsyncStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}

/** What's waiting, without clearing it (the Account page uses this to explain why they're signing in). */
export async function peekPending(): Promise<PendingResume | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingResume;
    return p?.path && Date.now() - p.at < MAX_AGE ? p : null;
  } catch {
    return null;
  }
}

/** Returns what's waiting once and forgets it. */
export async function takePending(): Promise<PendingResume | null> {
  const p = await peekPending();
  try { await AsyncStorage.removeItem(KEY); } catch {}
  return p;
}
