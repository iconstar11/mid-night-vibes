// The signed-in user's profile & settings (name, he/she, who they're into, appearance) and the players they
// chose to save. Private to their account (RLS). Guests have none of this.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { Into, Sex } from "@/game/types";
import { supabase } from "./supabase";

export type Theme = "system" | "light" | "dark";
export type SavedPlayer = { id: string; name: string; g: Sex; into: Into };

type ProfileState = {
  loaded: boolean;
  name: string;
  g: Sex;
  into: Into;
  theme: Theme;
  saved: SavedPlayer[];
};

const EMPTY: ProfileState = { loaded: false, name: "", g: null, into: "opp", theme: "system", saved: [] };
const THEME_KEY = "mv.theme";

export const useProfile = create<ProfileState>(() => ({ ...EMPTY }));

// The appearance applies before the account loads: remember it on the device too
AsyncStorage.getItem(THEME_KEY)
  .then((t) => { if (t === "light" || t === "dark") useProfile.setState({ theme: t }); })
  .catch(() => {});

type ProfileRow = { display_name: string | null; gender: Sex; into_pref: Into; theme: Theme };
type PlayerRow = { id: string; name: string; gender: Sex; into_pref: Into };
const toPlayer = (r: PlayerRow): SavedPlayer => ({ id: r.id, name: r.name, g: r.gender, into: r.into_pref });

/** Load for a signed-in user (`fallbackName`: the name from sign-up, if the profile has none). */
export async function loadProfile(fallbackName: string | null) {
  if (!supabase) return;
  const [p, s] = await Promise.all([
    supabase.from("profiles").select("display_name,gender,into_pref,theme").maybeSingle<ProfileRow>(),
    supabase.from("saved_players").select("id,name,gender,into_pref").order("created_at").returns<PlayerRow[]>(),
  ]);
  const row = p.data;
  const theme = row?.theme ?? "system";
  useProfile.setState({
    loaded: true,
    name: row?.display_name ?? fallbackName ?? "",
    g: row?.gender ?? null,
    into: row?.into_pref ?? "opp",
    theme,
    saved: (s.data ?? []).map(toPlayer),
  });
  AsyncStorage.setItem(THEME_KEY, theme).catch(() => {});
}

/** Signed out: forget everything, back to the device's appearance. */
export function clearProfile() {
  useProfile.setState({ ...EMPTY });
  AsyncStorage.removeItem(THEME_KEY).catch(() => {});
}

/** Save part of the profile. Optimistic; returns an error message or "". */
export async function saveProfile(patch: Partial<Pick<ProfileState, "name" | "g" | "into" | "theme">>): Promise<string> {
  const before = useProfile.getState();
  useProfile.setState(patch);
  if (patch.theme) AsyncStorage.setItem(THEME_KEY, patch.theme).catch(() => {});
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return "";
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.display_name = patch.name.trim().slice(0, 40) || null;
  if (patch.g !== undefined) row.gender = patch.g;
  if (patch.into !== undefined) row.into_pref = patch.into;
  if (patch.theme !== undefined) row.theme = patch.theme;
  const { error } = await supabase.from("profiles").update(row).eq("id", uid);
  if (error) {
    useProfile.setState({ name: before.name, g: before.g, into: before.into, theme: before.theme });
    return "Couldn't save. Check your connection and try again.";
  }
  if (patch.name !== undefined) {
    // Keep the sign-up name in step, so the greeting matches everywhere
    supabase.auth.updateUser({ data: { display_name: row.display_name } }).catch(() => {});
  }
  return "";
}

/** Add a player the user chose to save. Returns an error message or "". */
export async function addSavedPlayer(p: Omit<SavedPlayer, "id">): Promise<string> {
  const name = p.name.trim().slice(0, 24);
  if (!name) return "Type a name first.";
  if (useProfile.getState().saved.some((s) => s.name.toLowerCase() === name.toLowerCase())) return `${name} is already saved.`;
  if (!supabase) return "";
  const { data, error } = await supabase.from("saved_players").insert({ name, gender: p.g, into_pref: p.into }).select("id,name,gender,into_pref").single<PlayerRow>();
  if (error || !data) return error?.message.includes("30") ? "You can save up to 30 players." : "Couldn't save. Try again.";
  useProfile.setState((s) => ({ saved: [...s.saved, toPlayer(data)] }));
  return "";
}

export async function updateSavedPlayer(id: string, patch: Partial<Omit<SavedPlayer, "id">>) {
  const before = useProfile.getState().saved;
  useProfile.setState({ saved: before.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  if (!supabase) return;
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 24);
  if (patch.g !== undefined) row.gender = patch.g;
  if (patch.into !== undefined) row.into_pref = patch.into;
  const { error } = await supabase.from("saved_players").update(row).eq("id", id);
  if (error) useProfile.setState({ saved: before });
}

export async function removeSavedPlayer(id: string) {
  const before = useProfile.getState().saved;
  useProfile.setState({ saved: before.filter((s) => s.id !== id) });
  if (!supabase) return;
  const { error } = await supabase.from("saved_players").delete().eq("id", id);
  if (error) useProfile.setState({ saved: before });
}
