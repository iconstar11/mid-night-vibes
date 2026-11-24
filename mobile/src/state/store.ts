import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { aiCardId, cardId } from "@/game/cards";
import { Draw, shuffle } from "@/game/deck";
import { fillTarget } from "@/game/match";
import { localMood } from "@/game/mood";
import { WHEELS } from "@/game/content";
import type { Card, CardType, GroupId, Heat, PairId, Player, Sex, Wedge } from "@/game/types";
import { AiLimitError, askAI } from "@/lib/ai";
import { usePrefs } from "@/lib/prefs";
import { recentStarredTexts } from "@/lib/stars";
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
  /** Set from the account: Premium players get an occasional "Picked for you" card from their stars. */
  premium: boolean;
  /** AI-written Wheel of Misfortune forfeits for the current mood (null until asked for / when none). */
  aiMisfortune: Wedge[] | null;
  /** What aiMisfortune was written for (mood|heat|group), so a change fetches new ones. */
  aiMisfortuneFor: string;
  /** Ask the AI for Misfortune forfeits around the mood (only when that wheel is in use). */
  ensureMisfortune(): void;
  /** True once the saved game (18+ confirmation, players, mood…) has been read back from the device. */
  hydrated: boolean;

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
// "Picked for you" (Premium): a few AI cards in the style of their starred cards, one every TAILOR_EVERY cards
const TAILOR_EVERY = 8;
let tailored: Record<CardType, string[]> = { truth: [], dare: [] };
let tailoring = false;
let draws = 0;
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
    set({ ai: { state: mood ? "loading" : "off", tod: null, wheel: null, note: "", limited: false }, aiMisfortune: null, aiMisfortuneFor: "" });
    if (usePrefs.getState().wheelMode === "misfortune") loadMisfortune();
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

  async function fetchTailored() {
    const { premium, mood, heat, group, pair, players } = get();
    const likes = recentStarredTexts(5);
    if (!premium || likes.length < 3 || tailoring) return;
    tailoring = true;
    try {
      const j = await askAI({ game: "tod", vibe: mood, heat, group, pair, players: players.length, likes });
      if (j.truths?.length) tailored = { truth: shuffle(j.truths).slice(0, 3), dare: shuffle(j.dares ?? []).slice(0, 3) };
    } catch {}
    tailoring = false;
  }

  /** AI Misfortune forfeits: only fetched when that wheel is in use and a signed-in player set a mood. */
  let misfortuneLoading = "";
  async function loadMisfortune() {
    const { mood, heat, group, pair, players, aiMisfortuneFor } = get();
    const key = `${mood}|${heat}|${group}`;
    if (!mood || key === aiMisfortuneFor || key === misfortuneLoading) return;
    const user = supabase ? (await supabase.auth.getSession()).data.session?.user : null;
    if (!user || user.is_anonymous) return; // guests use the built-in forfeits
    misfortuneLoading = key;
    try {
      const j = await askAI({ game: "misfortune", vibe: mood, heat, group, pair, players: players.length });
      const wedges = j.wedges?.map((x): Wedge => [x.label, [x.text]]) ?? null;
      if (`${get().mood}|${get().heat}|${get().group}` === key) set({ aiMisfortune: wedges?.length ? wedges : null, aiMisfortuneFor: key });
    } catch {
      // Limit reached or AI unreachable: the built-in forfeits are used
      if (`${get().mood}|${get().heat}|${get().group}` === key) set({ aiMisfortune: null, aiMisfortuneFor: key });
    }
    misfortuneLoading = "";
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
    premium: false,
    aiMisfortune: null,
    aiMisfortuneFor: "",
    ensureMisfortune: () => { loadMisfortune(); },
    hydrated: false,

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
      tailored = { truth: [], dare: [] };
      loadMood();
    },
    setRoster: (roster) => set({ roster }),
    startGroup: () => {
      set((s) => ({ players: s.roster.map((p) => ({ ...p })), turn: 0 }));
      deck = new Draw(get().group, get().heat);
      tailored = { truth: [], dare: [] };
      loadMood();
    },
    setHeat: (heat) => {
      if (heat === get().heat) return;
      set({ heat });
      deck = new Draw(get().group, heat);
      tailored = { truth: [], dare: [] }; // written for the old heat
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
      draws++;
      // Premium: now and then a "Picked for you" card; fetch a few ahead of time
      if (s.premium && draws % TAILOR_EVERY === 0 && tailored[type].length) {
        const text = tailored[type].pop()!;
        return { type, text: fillTarget(text, current(s), s.players), ai: true, id: aiCardId(text), source: "tailored" };
      }
      if (s.premium && draws % TAILOR_EVERY === TAILOR_EVERY - 4 && !tailored[type].length) fetchTailored();
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

// ---------- Remember the game on this device ----------
// The 18+ confirmation, group, players, heat, mood and turn survive a reload, leaving to pay, or reopening the app,
// so nobody types names again. Stored only on this device.
const SAVE_KEY = "mv.game";
type Saved = GameSnapshot & { roster: Player[]; at: number };

AsyncStorage.getItem(SAVE_KEY)
  .then((raw) => {
    const saved = raw ? (JSON.parse(raw) as Saved) : null;
    if (saved) {
      const g = useGame.getState();
      useGame.setState({ adult: g.adult || saved.adult, roster: g.roster.length ? g.roster : saved.roster ?? [] });
      if (!g.players.length) useGame.setState({ group: saved.group, pair: saved.pair });
      g.restore(saved); // players, heat, turn, mood (only if no game is going in memory)
    }
  })
  .catch(() => {})
  .finally(() => useGame.setState({ hydrated: true }));

let saveTimer: ReturnType<typeof setTimeout> | undefined;
useGame.subscribe((s, prev) => {
  if (!s.hydrated) return; // don't overwrite the saved game before it's been read
  if (s.adult === prev.adult && s.group === prev.group && s.pair === prev.pair && s.players === prev.players &&
      s.roster === prev.roster && s.heat === prev.heat && s.turn === prev.turn && s.mood === prev.mood) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data: Saved = { ...useGame.getState().snapshot(), roster: useGame.getState().roster, at: Date.now() };
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data)).catch(() => {});
  }, 300);
});
