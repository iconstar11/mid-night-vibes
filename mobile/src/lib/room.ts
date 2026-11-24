// Live party rooms over Supabase Realtime.
// The host's phone broadcasts small events on a private channel "room:CODE"; viewers replay them.
// Only the host can broadcast (Realtime Authorization policies in supabase/migrations). Nothing is stored.
import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";

import type { Card, GroupId, PairId, Wedge } from "@/game/types";
import type { SpinPlan } from "@/game/wheel";
import { type AiState, useGame } from "@/state/store";
import { ensureSession, supabase } from "./supabase";
import { misfortuneWheel } from "@/game/content";
import { usePrefs } from "./prefs";
import { track } from "./track";

export type Screen = "home" | "tod" | "wheel";
export type Result = { label: string; text: string; ai: boolean };

/** Everything a viewer needs to draw the host's game. Never includes players' sex or "into" settings. */
export type Snapshot = {
  group: GroupId;
  pair: PairId;
  names: string[];
  turn: number;
  heat: number;
  mood: string;
  aiState: AiState;
  screen: Screen;
  wedges: Wedge[];
  /** Which wheel the host is on (older hosts don't send it: treat as "spin"). */
  wheelMode?: "spin" | "misfortune";
  card: Card | null;
  result: Result | null;
};

type Payload =
  | { t: "state"; s: Snapshot }
  | { t: "tod.card"; card: Card; random: boolean } // card text already has {target} filled
  | { t: "tod.next" }
  | { t: "spin"; plan: SpinPlan; start: number } // every phone runs the same plan from the same angle
  | { t: "result"; r: Result | null }
  | { t: "end" };
export type RoomEvent = Payload & { v: 1; seq: number };

type RoomState = {
  role: "host" | "viewer" | null;
  code: string | null;
  status: "idle" | "connecting" | "live" | "closed" | "error";
  error: string;
  viewers: number; // host side
  hostHere: boolean; // viewer side
  snapshot: Snapshot | null; // viewer side
};
export const useRoom = create<RoomState>(() => ({
  role: null, code: null, status: "idle", error: "", viewers: 0, hostHere: false, snapshot: null,
}));

let channel: RealtimeChannel | null = null;
let seq = 0;
let unsubGame: (() => void) | null = null;
const listeners = new Set<(e: RoomEvent) => void>();

// Host-side memory so late joiners see the current card / result
const hostView: { screen: Screen; card: Card | null; result: Result | null } = { screen: "home", card: null, result: null };

/** Link viewers open. On web it uses the current site (so localhost works), in the apps the real domain. */
export function roomLink(code: string) {
  const origin = typeof window !== "undefined" && window.location?.origin?.startsWith("http") ? window.location.origin : "https://midnightvibes.online";
  return `${origin}/r/${code}`;
}

const mustHaveSupabase = () => {
  if (!supabase) throw new Error("Live rooms need the Supabase settings in mobile/.env.local.");
  return supabase;
};

async function openChannel(code: string, presenceKey: string) {
  const sb = mustHaveSupabase();
  await ensureSession();
  await sb.realtime.setAuth();
  const ch = sb.channel(`room:${code}`, { config: { private: true, broadcast: { self: false }, presence: { key: presenceKey, enabled: true } } });
  return ch;
}

/** Subscribe to a private channel. If Realtime hasn't created today's message table yet (new or idle
 *  projects: "MissingPartition"), one plain public connection makes it do so; then try once more. */
async function subscribeWithWarmup(code: string, presenceKey: string, setup: (ch: RealtimeChannel) => void): Promise<RealtimeChannel> {
  let ch = await openChannel(code, presenceKey);
  setup(ch);
  try {
    await subscribe(ch);
    return ch;
  } catch (e) {
    await supabase?.removeChannel(ch);
    if (!/partition/i.test((e as Error)?.message ?? "")) throw e;
    const warm = supabase!.channel("warmup-" + Math.random().toString(36).slice(2));
    await subscribe(warm).catch(() => {});
    await supabase!.removeChannel(warm);
    ch = await openChannel(code, presenceKey);
    setup(ch);
    await subscribe(ch);
    return ch;
  }
}

function subscribe(ch: RealtimeChannel) {
  return new Promise<void>((resolve, reject) => {
    ch.subscribe((status, err) => {
      if (status === "SUBSCRIBED") resolve();
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(err ?? new Error(status));
    });
  });
}

// ---------- Host ----------

function snapshot(): Snapshot {
  const g = useGame.getState();
  return {
    group: g.group, pair: g.pair, names: g.players.map((p) => p.name), turn: g.turn, heat: g.heat,
    // Viewers only get the mood if the host chose to show it on screen
    mood: usePrefs.getState().showMood ? g.mood : "", aiState: g.ai.state, ...hostView,
    wheelMode: usePrefs.getState().wheelMode,
    wedges: usePrefs.getState().wheelMode === "misfortune"
      ? misfortuneWheel(g.group === "couple" ? "couple" : "group", usePrefs.getState().drinks, g.aiMisfortune)
      : g.wedges(),
  };
}

function send(p: Payload) {
  if (!channel || useRoom.getState().role !== "host") return;
  channel.send({ type: "broadcast", event: "ev", payload: { v: 1, seq: ++seq, ...p } }).catch(() => {});
}

let stateTimer: ReturnType<typeof setTimeout> | undefined;
function sendStateSoon() {
  clearTimeout(stateTimer);
  stateTimer = setTimeout(() => send({ t: "state", s: snapshot() }), 120);
}

export async function startHosting(): Promise<string> {
  const room = useRoom.getState();
  if (room.role === "host" && room.code) return room.code;
  useRoom.setState({ role: "host", status: "connecting", error: "", viewers: 0 });
  let createdCode: string | null = null;
  try {
    const sb = mustHaveSupabase();
    await ensureSession();
    const { data: code, error } = await sb.rpc("create_room");
    if (error || typeof code !== "string") throw new Error(error?.message.includes("too many") ? "You already have 3 rooms open." : "Couldn't create a room.");
    createdCode = code;
    const ch = await subscribeWithWarmup(code, "host", (ch) => {
      ch.on("presence", { event: "sync" }, () => {
        const viewers = Object.keys(ch.presenceState()).filter((k) => k !== "host").length;
        useRoom.setState({ viewers });
      });
      ch.on("presence", { event: "join" }, ({ key }) => { if (key !== "host") sendStateSoon(); });
    });
    await ch.track({ role: "host" });
    channel = ch;
    useRoom.setState({ code, status: "live" });
    track("room_start", {});
    // Any change to players, turn, heat, mood or AI wedges goes out as a fresh snapshot
    const offGame = useGame.subscribe(sendStateSoon);
    const offPrefs = usePrefs.subscribe(sendStateSoon); // showing/hiding the mood updates viewers too
    unsubGame = () => { offGame(); offPrefs(); };
    sendStateSoon();
    return code;
  } catch (e) {
    // Don't leave an unusable room behind (each host may have 3 open)
    if (createdCode) await supabase?.from("rooms").delete().eq("code", createdCode);
    const msg = (e as Error).message || "";
    useRoom.setState({ role: null, status: "error", error: /partition|CHANNEL_ERROR|TIMED_OUT/i.test(msg) ? "Live rooms couldn't connect. Try again in a moment." : msg || "Couldn't start the room." });
    throw e;
  }
}

export async function stopHosting() {
  const { code, role } = useRoom.getState();
  if (role !== "host") return;
  send({ t: "end" });
  unsubGame?.(); unsubGame = null;
  if (channel) await supabase?.removeChannel(channel);
  channel = null;
  if (code) await supabase?.from("rooms").delete().eq("code", code);
  useRoom.setState({ role: null, code: null, status: "idle", viewers: 0 });
}

/** Called by the host's screens. No-ops when not hosting. */
export const host = {
  screen(screen: Screen) { hostView.screen = screen; if (screen !== "tod") hostView.card = null; if (screen !== "wheel") hostView.result = null; sendStateSoon(); },
  card(card: Card, random: boolean) { hostView.card = card; send({ t: "tod.card", card, random }); },
  next() { hostView.card = null; send({ t: "tod.next" }); },
  spin(plan: SpinPlan, start: number) { hostView.result = null; send({ t: "spin", plan, start }); },
  result(r: Result | null) { hostView.result = r; send({ t: "result", r }); },
};

// ---------- Viewer ----------

export function onRoomEvent(f: (e: RoomEvent) => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

export async function joinRoom(code: string) {
  code = code.toUpperCase();
  await leaveRoom();
  useRoom.setState({ role: "viewer", code, status: "connecting", error: "", snapshot: null, hostHere: false });
  try {
    const sb = mustHaveSupabase();
    const { data: open } = await sb.rpc("room_open", { room_code: code });
    if (!open) { useRoom.setState({ status: "closed" }); return; }
    const session = await ensureSession();
    let lastSeq = 0;
    const ch = await subscribeWithWarmup(code, session?.user.id ?? "viewer-" + Math.random().toString(36).slice(2), (ch) => {
      ch.on("broadcast", { event: "ev" }, ({ payload }) => {
        const e = payload as RoomEvent;
        if (e.t !== "state" && e.seq <= lastSeq) return; // ignore anything older than what we've shown
        lastSeq = Math.max(lastSeq, e.seq);
        if (e.t === "state") useRoom.setState({ snapshot: e.s });
        if (e.t === "end") useRoom.setState({ status: "closed" });
        listeners.forEach((f) => f(e));
      });
      ch.on("presence", { event: "sync" }, () => useRoom.setState({ hostHere: "host" in ch.presenceState() }));
    });
    await ch.track({ role: "viewer" });
    channel = ch;
    useRoom.setState({ status: "live" });
    track("room_join", {});
  } catch (e) {
    useRoom.setState({ status: "error", error: (e as Error).message || "Couldn't join the room." });
  }
}

export async function leaveRoom() {
  if (useRoom.getState().role !== "viewer") return;
  if (channel) await supabase?.removeChannel(channel);
  channel = null;
  useRoom.setState({ role: null, code: null, status: "idle", snapshot: null, hostHere: false });
}
