// Starred cards on this device: shown as ★, counted as card_star events, and (for Premium) used to tailor AI picks.
// Only ids are kept. Tailoring looks up built-in cards' original text (no player names); AI cards aren't reused.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import type { CardSource } from "@/game/cards";
import { builtInText } from "@/game/catalog";
import { track } from "./track";

const KEY = "mv.stars";
type Starred = { id: string; at: number };

export const useStars = create<{ list: Starred[] }>(() => ({ list: [] }));
AsyncStorage.getItem(KEY)
  .then((raw) => { if (raw) useStars.setState({ list: JSON.parse(raw) }); })
  .catch(() => {});

export function toggleStar(card: { id: string; source?: CardSource; game: "tod" | "wheel"; type?: string; heat?: number }) {
  const list = useStars.getState().list;
  const on = !list.some((s) => s.id === card.id);
  const next = on ? [...list, { id: card.id, at: Date.now() }] : list.filter((s) => s.id !== card.id);
  useStars.setState({ list: next });
  AsyncStorage.setItem(KEY, JSON.stringify(next.slice(-300))).catch(() => {});
  track("card_star", { card_id: card.id, on, source: card.source, game: card.game, type: card.type, heat: card.heat });
}

/** Up to `n` most recent starred built-in cards, as their original text (for tailored AI picks). */
export function recentStarredTexts(n = 5): string[] {
  return useStars.getState().list.map((s) => builtInText(s.id)).filter((t): t is string => !!t).slice(-n);
}
