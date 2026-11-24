// Game sounds ("Soft" style), generated in code with Web Audio: no files, no licences, works offline.
// Guidance followed (Microsoft/Material/Glasgow earcon guidelines): short (under a second), soft and at similar
// loudness, mostly in the 600 Hz–2 kHz band, a distinct rhythm per meaning, used sparingly, and easy to mute.
// Quiet by default, off with the Sounds setting, silent while the tab is hidden.
// Browsers only allow audio after a tap, so the engine unlocks itself on the first touch, click or key.
// Phones (native) get haptics only for now; `buzz()` covers both.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { usePrefs } from "./prefs";

export type SoundEvent =
  | "tick" | "spin" | "land" | "misfortune"               // wheel
  | "truth" | "dare" | "shuffle" | "skip" | "done"        // Truth or Dare
  | "star" | "countdown" | "timer";                       // shared

const MASTER = 0.32; // quiet
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function audio(): AudioContext | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);
  }
  return ctx;
}

// Unlock on the first gesture (browsers start AudioContext suspended)
if (Platform.OS === "web" && typeof document !== "undefined") {
  const unlock = () => {
    const a = audio();
    if (a && a.state !== "running") a.resume().catch(() => {});
    if (a?.state === "running") ["pointerdown", "touchend", "keydown"].forEach((e) => document.removeEventListener(e, unlock, true));
  };
  ["pointerdown", "touchend", "keydown"].forEach((e) => document.addEventListener(e, unlock, true));
}

// ---------- Building blocks ----------

type ToneOpts = { type?: OscillatorType; gain?: number; attack?: number; to?: number };
function tone(at: number, freq: number, dur: number, o: ToneOpts = {}) {
  const a = ctx!, out = master!;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  const peak = o.gain ?? 0.3, att = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + att);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at); osc.stop(at + dur + 0.05);
}

/** A marimba-ish note: a sine body plus a short bright overtone. */
function mallet(at: number, f: number, gain = 0.32, dur = 0.5) {
  tone(at, f, dur, { gain });
  tone(at, f * 4, 0.12, { gain: gain * 0.22 });
}

let noiseBuf: AudioBuffer | null = null;
function noise(at: number, dur: number, o: { freq: number; q?: number; to?: number; gain?: number; type?: BiquadFilterType }) {
  const a = ctx!, out = master!;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf;
  f.type = o.type ?? "lowpass"; f.Q.value = o.q ?? 0.6;
  f.frequency.setValueAtTime(o.freq, at);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.2, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at); src.stop(at + dur + 0.05);
}

// ---------- The sounds ----------
// `speed` (0..1): wheel ticks and shuffle taps drop in pitch and volume as they slow down.
const C5 = 523.3, D5 = 587.3, E5 = 659.3, G5 = 784, A5 = 880, B5 = 987.8, D6 = 1174.7;

const SOUNDS: Record<SoundEvent, (t: number, speed: number) => void> = {
  // Wheel
  tick: (t, s) => tone(t, 700 + s * 400, 0.04, { gain: 0.25 + s * 0.2 }),
  spin: (t) => noise(t, 0.6, { freq: 250, to: 900, gain: 0.22 }),
  land: (t) => [C5, E5, G5].forEach((f, i) => mallet(t + i * 0.09, f, 0.35)),
  misfortune: (t) => [110, 165.5, 221, 276].forEach((f, i) => tone(t, f, 2.4 - i * 0.4, { gain: 0.3 / (i + 1), attack: 0.01 })),
  // Truth or Dare: truth is calm and low (two slow notes), dare is bright and quick (three fast notes rising)
  truth: (t) => { mallet(t, C5, 0.3, 0.6); mallet(t + 0.16, E5, 0.28, 0.7); },
  dare: (t) => [G5, B5, D6].forEach((f, i) => mallet(t + i * 0.06, f, 0.26, 0.35)),
  shuffle: (t, s) => tone(t, 820 + s * 300, 0.035, { gain: 0.18 + s * 0.12 }),
  skip: (t) => { mallet(t, E5, 0.22, 0.25); mallet(t + 0.1, C5, 0.2, 0.35); },
  done: (t) => tone(t, 520, 0.12, { to: 300, gain: 0.3 }),
  // Shared
  star: (t) => { tone(t, 1046.5, 0.4, { gain: 0.2 }); tone(t + 0.1, 1568, 0.5, { gain: 0.16 }); },
  countdown: (t) => tone(t, D5, 0.08, { gain: 0.2 }),
  timer: (t) => [G5, E5, A5].forEach((f, i) => mallet(t + i * 0.18, f, 0.3, 0.45)),
};

/** Play a game sound (if Sounds is on). `force` plays even when Sounds is off (the mute button's own preview). */
export function play(event: SoundEvent, opts: { speed?: number; force?: boolean } = {}) {
  if (!opts.force && !usePrefs.getState().sound) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  const a = audio();
  if (!a || !master) return;
  if (a.state !== "running") a.resume().catch(() => {});
  try {
    SOUNDS[event](a.currentTime + 0.01, Math.min(Math.max(opts.speed ?? 1, 0), 1));
  } catch {
    // Sound is a nice-to-have
  }
}

/** A light phone vibration (if Vibration is on). */
export function buzz(kind: "tick" | "pick" | "success" = "pick") {
  if (Platform.OS === "web" || !usePrefs.getState().vibration) return;
  if (kind === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
}
