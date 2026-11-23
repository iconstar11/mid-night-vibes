// Counts guests' cards and spins on this device (see game/turns.ts). Signed-in players are never counted.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { takeTurn, today, type TurnCount } from "@/game/turns";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const KEY = "mv.guestTurns";

/** Call before showing a new card or spinning. False: out of free turns, send them to sign in. */
export async function takeGuestTurn(): Promise<boolean> {
  const auth = useAuth.getState();
  if (auth.email) return true;
  if (!auth.ready && supabase) {
    // Account info is still loading right after opening: ask the session directly
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (user && !user.is_anonymous) return true;
  }
  let stored: TurnCount | null = null;
  try { stored = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "null"); } catch {}
  const { ok, next } = takeTurn(stored, today());
  if (ok) { try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {} }
  return ok;
}
