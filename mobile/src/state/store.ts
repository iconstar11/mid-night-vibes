import { create } from "zustand";

import { aiCardId, cardId } from "@/game/cards";
import { Draw, shuffle } from "@/game/deck";
import { fillTarget } from "@/game/match";
import { localMood } from "@/game/mood";
import { WHEELS } from "@/game/content";
import type { Card, CardType, GroupId, Heat, PairId, Player, Sex, Wedge } from "@/game/types";
import { AiLimitError, askAI } from "@/lib/ai";
import { supabase } from "@/lib/supabase";

export const PAIR_SEX: Record<PairId, [Sex, Sex]> = { mf: ["m", "f"], ff: ["f", "f"], mm: ["m", "m"], any: [null, null] };

export type AiState = "off" | "loading" | "ready" | "local";

/** The game setup, saved before a guest signs in so it can be rebuilt after a page reload. */
export type GameSnapshot = { adult: boolean; group: GroupId; pair: PairId; players: Player[]; heat: Heat; turn: number; mood: string };

type State = {
  adult: boolean;
  group: GroupId;
  pair: PairId;
  players: Player[];
  roster: Player[]; // group players being edited on the players screen
  heat: Heat;
  turn: number;
  mood: string;
  ai: { state: AiState; tod: Record<CardType, string[]> | null; wheel: Wedge[] | null; note: string; limited: boolean };

  confirmAdult(): void;
  setGroup(g: GroupId): void;
  setPair(p: PairId): void;
  startCouple(names: [string, string]): void;
  setRoster(r: Player[]): void;
  startGroup(): void;
  setHeat(h: Heat): void;
  nextTurn(): void;
  setMood(m: string): void;
  /** Draw the next card: AI cards for the mood first, then the built-in deck. {target} is filled. */
  draw(type: CardType): Card;
  wedges(): Wedge[];
  snapshot(): GameSnapshot;
  /** Put a saved game back (after sign-in). Leaves an in-memory game alone if one is already going. */
  restore(s: GameSnapshot): void;
};

let deck = new Draw("couple", 1);
let aiReq = 0;
let topping = false;
let heatTimer: ReturnType<typeof setTimeout> | undefined;

export const current = (s: Pick<State, "players" | "turn">) => s.players[s.turn % s.players.length];
export const nextUp = (s: Pick<State, "players" | "turn">) => s.players[(s.turn + 1) % s.players.length];

export const useGame = create<State>((set, get) => {
  /** `isNew`: the player typed or picked a new mood, so it counts toward their AI limit (heat or player changes don't). */
  async function loadMood(isNew = false) {
    const id = ++aiReq;
    const { mood, heat, group, pair, players } = get();
    set({ ai: { state: mood ? "loading" : "off", tod: null, wheel: null, note: "", limited: false } });
    if (!mood) return;
    // Guests don't get AI: the mood still steers the built-in cards
    const user = supabase ? (await supabase.auth.getSession()).data.session?.user : null;
    if (id !== aiReq) return;
    if (supabase && (!user || user.is_anonymous)) {
      const local = localMood(mood, group, heat);
      set({ ai: { state: "local", tod: local, wheel: null, limited: true, note: "Sign in to customize with AI. " + (local ? "Using built-in cards that match the mood." : "Using the built-in deck for now.") } });
      return;
    }
    const req = { vibe: mood, heat, group, pair, players: players.length };
    // In parallel for speed. Only the cards call counts as the new mood; the server also refuses the wheel call past the limit.
    const [t, w] = await Promise.allSettled([askAI({ ...req, game: "tod", newMood: isNew }), askAI({ ...req, game: "wheel" })]);
    if (id !== aiReq) return;
    const limited = t.status === "rejected" && t.reason instanceof AiLimitError;
    const tod = t.status === "fulfilled" && t.value.truths ? { truth: shuffle(t.value.truths), dare: shuffle(t.value.dares!) } : null;
    // Past the limit, don't keep an AI wheel that slipped through before the cards call was counted
    const wheel = !limited && w.status === "fulfilled" && w.value.wedges ? w.value.wedges.map((x): Wedge => [x.label, [x.text]]) : null;
    const ok = !!(tod || wheel);
    const why = t.status === "rejected" ? (t.reason as Error)?.message ?? "" : "";
    set({
      ai: {
        limited,
        state: ok ? "ready" : "local",
        tod: tod ?? localMood(mood, group, heat),
        wheel,
        note: ok ? "" : (why ? why + " " : "") + (localMood(mood, group, heat) ? "Using built-in cards that match the mood." : "Using the built-in deck for now."),
      },
    });
  }

  async function topUp() {
    const { ai, mood, heat, group, pair, players } = get();
    if (ai.state !== "ready" || topping || !ai.tod) return;
    topping = true;
    const id = aiReq;
    try {
      const j = await askAI({ game: "tod", vibe: mood, heat, group, pair, players: players.length });
      const tod = get().ai.tod;
      if (id === aiReq && tod && j.truths) {
        set((s) => ({ ai: { ...s.ai, tod: { truth: [...shuffle(j.truths!), ...tod.truth], dare: [...shuffle(j.dares!), ...tod.dare] } } }));
      }
    } catch {}
    topping = false;
  }

  return {
    adult: false,
    group: "couple",
    pair: "mf",
    players: [],
    roster: [],
    heat: 1,
    turn: 0,
    mood: "",
    ai: { state: "off", tod: null, wheel: null, note: "", limited: false },

    confirmAdult: () => set({ adult: true }),
    snapshot: () => {
      const { adult, group, pair, players, heat, turn, mood } = get();
      return { adult, group, pair, players, heat, turn, mood };
    },
    restore: (s) => {
      const g = get();
      if (s.adult && !g.adult) set({ adult: true });
      if (g.players.length >= 2 || s.players.length < 2) return;
      set({ group: s.group, pair: s.pair, players: s.players, roster: s.group === "couple" ? g.roster : s.players, heat: s.heat, turn: s.turn, mood: s.mood });
      deck = new Draw(s.group, s.heat);
      loadMood();
    },
    setGroup: (group) => {
      const prev = get().group;
      let roster = get().roster;
      // Girls' and boys' nights: everyone's sex is known
      if (prev !== group && group !== "friends" && group !== "couple") roster = roster.map((p) => ({ ...p, g: group === "girls" ? "f" : "m" }));
      set({ group, roster });
    },
    setPair: (pair) => set({ pair }),
    startCouple: (names) => {
      const pair = get().pair;
      set({ players: names.map((name, i) => ({ name, g: PAIR_SEX[pair][i], into: "both" as const })), turn: 0 });
      deck = new Draw("couple", get().heat);
      loadMood();
    },
    setRoster: (roster) => set({ roster }),
    startGroup: () => {
      set((s) => ({ players: s.roster.map((p) => ({ ...p })), turn: 0 }));
      deck = new Draw(get().group, get().heat);
      loadMood();
    },
    setHeat: (heat) => {
      if (heat === get().heat) return;
      set({ heat });
      deck = new Draw(get().group, heat);
      if (get().mood) {
        clearTimeout(heatTimer);
        heatTimer = setTimeout(() => loadMood(), 500);
      }
    },
    nextTurn: () => set((s) => ({ turn: s.turn + 1 })),
    setMood: (m) => {
      const mood = m.trim().slice(0, 200);
      if (mood === get().mood) return;
      set({ mood });
      loadMood(true);
    },
    draw: (type) => {
      const s = get();
      const pool = s.ai.tod?.[type];
      if (pool && pool.length) {
        const text = pool[pool.length - 1];
        set({ ai: { ...s.ai, tod: { ...s.ai.tod!, [type]: pool.slice(0, -1) } } });
        const ai = s.ai.state === "ready";
        if (pool.length <= 3) topUp();
        // AI cards, or built-in cards that match the mood (local fallback)
        return { type, text: fillTarget(text, current(s), s.players), ai, id: ai ? aiCardId(text) : cardId(text), source: ai ? "ai" : "deck" };
      }
      const d = deck.next(type);
      return { type, text: fillTarget(d.text, current(s), s.players), ai: false, id: d.id, source: d.top ? "top" : "deck" };
    },
    wedges: () => {
      const s = get();
      return s.ai.wheel?.length ? s.ai.wheel : WHEELS[s.group === "couple" ? "couple" : "group"];
    },
  };
});
