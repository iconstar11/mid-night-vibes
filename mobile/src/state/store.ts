import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { aiCardId, cardId } from "@/game/cards";
import { Draw, shuffle } from "@/game/deck";
import { fillTarget } from "@/game/match";
import { localMood } from "@/game/mood";
import { FILL_TO, ownWheel } from "@/game/ownWheel";
import { RISE, comfort, freshRise, shouldRise, type Result, type RiseConfig, type RiseState } from "@/game/heatRise";
import { fillWedges } from "@/game/content";
import { wheelFor, type WheelKind } from "@/game/pickWheel";

export { wheelFor };
import type { Card, CardType, GroupId, Heat, PairId, Player, Sex, Wedge } from "@/game/types";
import { AiLimitError, askAI } from "@/lib/ai";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { recentStarredTexts } from "@/lib/stars";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/track";

export const PAIR_SEX: Record<PairId, [Sex, Sex]> = { mf: ["m", "f"], ff: ["f", "f"], mm: ["m", "m"], any: [null, null] };

/** "own": the mood box held a list, so the wheel is the players' own (no AI). */
export type AiState = "off" | "loading" | "ready" | "local" | "own";

/** The game setup, saved before a guest signs in so it can be rebuilt after a page reload. */
export type GameSnapshot = {
  adult: boolean; group: GroupId; pair: PairId; players: Player[]; heat: Heat; turn: number; mood: string;
  /** Free passes each player holds (by name). */
  passes?: Record<string, number>;
  /** Wedges the players edited by hand, per wheel. */
  edited?: Partial<Record<WheelKind, Wedge[] | null>>;
};

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
  /** Free passes won on the wheel, by player name: skip one dare or forfeit later. */
  passes: Record<string, number>;
  givePass(name: string): void;
  usePass(name: string): boolean;
  /** Wedges edited by hand ("Edit wedges"), per wheel; null = not edited. Cleared when the mood changes. */
  edited: Partial<Record<WheelKind, Wedge[] | null>>;
  setEdited(kind: WheelKind, w: Wedge[] | null): void;
  /** Picks which built-in wedges this game's wheels show (a new one each game). */
  wheelSeed: number;
  /** Heat of the dares that fill a short pasted list; refills the wheel. */
  setFillHeat(h: 1 | 2 | 3): void;
  /** "Heat rises over time": progress at the current level (see game/heatRise.ts). */
  rise: RiseState;
  /** The last automatic rise, for the "heat is rising" note with Undo; null when there's nothing to show. */
  riseNote: { from: Heat; to: Heat; at: number } | null;
  /** A turn ended: the card was done or skipped (a free pass counts as skipped). May move the heat up. */
  recordResult(r: Result): void;
  /** Undo the last automatic rise and stop rising for the rest of this game. */
  undoRise(): void;
  dismissRiseNote(): void;
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

/** Long enough for a pasted list of wedges. */
export const MOOD_MAX = 1500;

// Dev only: set globalThis.MV_FAST_HEAT = true in the browser console to try rising in a few turns
const FAST_RISE: RiseConfig = { ...RISE, minTurns: 2, perPlayer: 1, minMinutes: 0 };
const riseConfig = () => (__DEV__ && (globalThis as { MV_FAST_HEAT?: boolean }).MV_FAST_HEAT ? FAST_RISE : RISE);

export const current = (s: Pick<State, "players" | "turn">) => s.players[s.turn % s.players.length];
export const nextUp = (s: Pick<State, "players" | "turn">) => s.players[(s.turn + 1) % s.players.length];

export const useGame = create<State>((set, get) => {
  /** `isNew`: the player typed or picked a new mood, so it counts toward their AI limit (heat or player changes don't). */
  async function loadMood(isNew = false) {
    const id = ++aiReq;
    const { mood, heat, group, pair, players } = get();
    set({ ai: { state: mood ? "loading" : "off", tod: null, wheel: null, note: "", limited: false }, aiMisfortune: null, aiMisfortuneFor: "" });
    if (!mood) return;
    const own = ownWheel(mood);
    if (own) {
      // A short list is topped up to FILL_TO: built-in dares straight away, then AI ones for signed-in players.
      // The players' own wedges are never changed.
      const kind = usePrefs.getState().wheelMode;
      const fillHeat = usePrefs.getState().fillHeat ?? 2;
      const deckId = group === "couple" ? "couple" : "group";
      const missing = Math.max(0, FILL_TO - own.length);
      const seed = get().wheelSeed;
      const builtIn = (n: number, taken: string[] = []) => fillWedges(deckId, kind, fillHeat, n, seed, [...own.map((w) => w[0]), ...taken]);
      const note = missing ? `Added ${missing} to fill your wheel.` : "";
      set({ ai: { state: "own", tod: { truth: [], dare: shuffle(own.map((w) => w[1][0])) }, wheel: [...own, ...builtIn(missing)], note, limited: false } });
      if (!missing || !supabase) return;
      const user = (await supabase.auth.getSession()).data.session?.user;
      if (id !== aiReq || !user || user.is_anonymous) return;
      try {
        const j = await askAI({ game: kind === "misfortune" ? "misfortune" : "wheel", vibe: mood, heat: fillHeat, group, pair, players: players.length, newMood: isNew, fill: missing });
        const add = (j.wedges ?? []).slice(0, missing).map((x): Wedge => [x.label, [x.text], { ai: true, fill: true }]);
        if (id === aiReq && add.length) {
          set((s) => ({ ai: { ...s.ai, wheel: [...own, ...add, ...builtIn(missing - add.length, add.map((w) => w[0]))] } }));
        }
      } catch {} // limit reached or AI unreachable: the built-in fill stays
      return;
    }
    if (usePrefs.getState().wheelMode === "misfortune") loadMisfortune();
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
    const wheel = !limited && w.status === "fulfilled" && w.value.wedges ? w.value.wedges.map((x): Wedge => [x.label, [x.text], { ai: true }]) : null;
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
    if (!mood || key === aiMisfortuneFor || key === misfortuneLoading || ownWheel(mood)) return;
    const user = supabase ? (await supabase.auth.getSession()).data.session?.user : null;
    if (!user || user.is_anonymous) return; // guests use the built-in forfeits
    misfortuneLoading = key;
    try {
      const j = await askAI({ game: "misfortune", vibe: mood, heat, group, pair, players: players.length });
      const wedges = j.wedges?.map((x): Wedge => [x.label, [x.text], { ai: true }]) ?? null;
      if (`${get().mood}|${get().heat}|${get().group}` === key) set({ aiMisfortune: wedges?.length ? wedges : null, aiMisfortuneFor: key });
    } catch {
      // Limit reached or AI unreachable: the built-in forfeits are used
      if (`${get().mood}|${get().heat}|${get().group}` === key) set({ aiMisfortune: null, aiMisfortuneFor: key });
    }
    misfortuneLoading = "";
  }

  /** Change the heat: new draw piles, and AI cards for the mood at the new heat. */
  function applyHeat(heat: Heat) {
    set({ heat });
    deck = new Draw(get().group, heat);
    tailored = { truth: [], dare: [] }; // written for the old heat
    if (get().mood) {
      clearTimeout(heatTimer);
      heatTimer = setTimeout(() => loadMood(), 500);
    }
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
    passes: {},
    givePass: (name) => set((s) => ({ passes: { ...s.passes, [name]: (s.passes[name] ?? 0) + 1 } })),
    usePass: (name) => {
      const n = get().passes[name] ?? 0;
      if (!n) return false;
      set((s) => ({ passes: { ...s.passes, [name]: n - 1 } }));
      return true;
    },
    wheelSeed: Math.random(),
    setFillHeat: (h) => {
      setPrefs({ fillHeat: h });
      if (get().ai.state === "own") loadMood();
    },
    edited: {},
    setEdited: (kind, w) => set((s) => ({ edited: { ...s.edited, [kind]: w } })),
    hydrated: false,

    confirmAdult: () => set({ adult: true }),
    snapshot: () => {
      const { adult, group, pair, players, heat, turn, mood, passes, edited } = get();
      return { adult, group, pair, players, heat, turn, mood, passes, edited };
    },
    restore: (s) => {
      const g = get();
      if (s.adult && !g.adult) set({ adult: true });
      if (g.players.length >= 2 || s.players.length < 2) return;
      set({ group: s.group, pair: s.pair, players: s.players, roster: s.group === "couple" ? g.roster : s.players, heat: s.heat, turn: s.turn, mood: s.mood, passes: s.passes ?? {}, edited: s.edited ?? {} });
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
      set({ players: names.map((name, i) => ({ name, g: PAIR_SEX[pair][i], into: "both" as const })), turn: 0, passes: {}, wheelSeed: Math.random(), rise: freshRise(Date.now()), riseNote: null });
      deck = new Draw("couple", get().heat);
      tailored = { truth: [], dare: [] };
      loadMood();
    },
    setRoster: (roster) => set({ roster }),
    startGroup: () => {
      set((s) => ({ players: s.roster.map((p) => ({ ...p })), turn: 0, passes: {}, wheelSeed: Math.random(), rise: freshRise(Date.now()), riseNote: null }));
      deck = new Draw(get().group, get().heat);
      tailored = { truth: [], dare: [] };
      loadMood();
    },
    setHeat: (heat) => {
      if (heat === get().heat) return;
      // Picked by hand once the game is going: the players chose, so the heat stops rising on its own
      const midGame = get().players.length > 0 && (get().turn > 0 || get().rise.turns > 0);
      set({ rise: { ...freshRise(Date.now()), paused: get().rise.paused || midGame }, riseNote: null });
      applyHeat(heat);
    },
    rise: freshRise(Date.now()),
    riseNote: null,
    recordResult: (r) => {
      const s = get();
      const rise = { ...s.rise, turns: s.rise.turns + 1, results: [...s.rise.results, r].slice(-20) };
      set({ rise });
      if (!usePrefs.getState().heatRise || !shouldRise(s.heat, rise, Date.now(), s.players.length, riseConfig())) return;
      const to = (s.heat + 1) as Heat;
      track("heat_up", {
        from: s.heat, to, turn_n: rise.turns, minutes: Math.round((Date.now() - rise.since) / 6000) / 10,
        comfort: comfort(rise.results), players_n: s.players.length, group: s.group,
      });
      set({ rise: freshRise(Date.now()), riseNote: { from: s.heat, to, at: Date.now() } });
      applyHeat(to);
    },
    undoRise: () => {
      const note = get().riseNote;
      if (!note) return;
      track("heat_undo", { from: note.to, to: note.from, group: get().group });
      set({ rise: { ...freshRise(Date.now()), paused: true }, riseNote: null });
      applyHeat(note.from);
    },
    dismissRiseNote: () => set({ riseNote: null }),
    nextTurn: () => set((s) => ({ turn: s.turn + 1 })),
    setMood: (m) => {
      const mood = m.trim().slice(0, MOOD_MAX);
      if (mood === get().mood) return;
      set({ mood, edited: {} });
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
    wedges: () => wheelFor(get(), "spin", false),
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
      s.roster === prev.roster && s.heat === prev.heat && s.turn === prev.turn && s.mood === prev.mood &&
      s.passes === prev.passes && s.edited === prev.edited) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data: Saved = { ...useGame.getState().snapshot(), roster: useGame.getState().roster, at: Date.now() };
    AsyncStorage.setItem(SAVE_KEY, JSON.stringify(data)).catch(() => {});
  }, 300);
});
