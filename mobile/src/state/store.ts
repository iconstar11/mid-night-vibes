import { create } from "zustand";

import { Draw, shuffle } from "@/game/deck";
import { fillTarget } from "@/game/match";
import { localMood } from "@/game/mood";
import { WHEELS } from "@/game/content";
import type { Card, CardType, GroupId, Heat, PairId, Player, Sex, Wedge } from "@/game/types";
import { AiLimitError, askAI } from "@/lib/ai";

export const PAIR_SEX: Record<PairId, [Sex, Sex]> = { mf: ["m", "f"], ff: ["f", "f"], mm: ["m", "m"], any: [null, null] };

export type AiState = "off" | "loading" | "ready" | "local";

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
};

let deck = new Draw("couple", 1);
let aiReq = 0;
let topping = false;
let heatTimer: ReturnType<typeof setTimeout> | undefined;

export const current = (s: Pick<State, "players" | "turn">) => s.players[s.turn % s.players.length];
export const nextUp = (s: Pick<State, "players" | "turn">) => s.players[(s.turn + 1) % s.players.length];

export const useGame = create<State>((set, get) => {
  async function loadMood() {
    const id = ++aiReq;
    const { mood, heat, group, pair, players } = get();
    set({ ai: { state: mood ? "loading" : "off", tod: null, wheel: null, note: "", limited: false } });
    if (!mood) return;
    const req = { vibe: mood, heat, group, pair, players: players.length };
    // In parallel for speed. Only the cards call counts as the new mood; the server also refuses the wheel call past the limit.
    const [t, w] = await Promise.allSettled([askAI({ ...req, game: "tod", newMood: true }), askAI({ ...req, game: "wheel" })]);
    if (id !== aiReq) return;
    const tod = t.status === "fulfilled" && t.value.truths ? { truth: shuffle(t.value.truths), dare: shuffle(t.value.dares!) } : null;
    const wheel = w.status === "fulfilled" && w.value.wedges ? w.value.wedges.map((x): Wedge => [x.label, [x.text]]) : null;
    const ok = !!(tod || wheel);
    const why = t.status === "rejected" ? (t.reason as Error)?.message ?? "" : "";
    const limited = t.status === "rejected" && t.reason instanceof AiLimitError;
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
        heatTimer = setTimeout(loadMood, 500);
      }
    },
    nextTurn: () => set((s) => ({ turn: s.turn + 1 })),
    setMood: (m) => {
      const mood = m.trim().slice(0, 200);
      if (mood === get().mood) return;
      set({ mood });
      loadMood();
    },
    draw: (type) => {
      const s = get();
      const pool = s.ai.tod?.[type];
      let text: string;
      let ai = false;
      if (pool && pool.length) {
        text = pool[pool.length - 1];
        set({ ai: { ...s.ai, tod: { ...s.ai.tod!, [type]: pool.slice(0, -1) } } });
        ai = s.ai.state === "ready";
        if (pool.length <= 3) topUp();
      } else text = deck.next(type);
      return { type, text: fillTarget(text, current(s), s.players), ai };
    },
    wedges: () => {
      const s = get();
      return s.ai.wheel?.length ? s.ai.wheel : WHEELS[s.group === "couple" ? "couple" : "group"];
    },
  };
});
