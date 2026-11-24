// Game sounds, generated in code with Web Audio: no files, no licences, works offline.
// Quiet by default, off with the Sounds setting, silent while the tab is hidden.
// Browsers only allow audio after a tap, so the engine unlocks itself on the first touch, click or key.
// Phones (native) get haptics only for now; `buzz()` covers both.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { usePrefs, type SoundStyle } from "./prefs";

export type SoundEvent = "tick" | "spin" | "land" | "misfortune" | "flip" | "done" | "star" | "timer";

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

export const audioState = () => ctx?.state ?? "none";

// ---------- Building blocks ----------

type ToneOpts = { type?: OscillatorType; gain?: number; attack?: number; to?: number; detune?: number; vibrato?: number };
function tone(at: number, freq: number, dur: number, o: ToneOpts = {}) {
  const a = ctx!, out = master!;
  const osc = a.createOscillator(), g = a.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  if (o.detune) osc.detune.value = o.detune;
  if (o.vibrato) {
    const lfo = a.createOscillator(), depth = a.createGain();
    lfo.frequency.value = 6; depth.gain.value = o.vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(at); lfo.stop(at + dur + 0.05);
  }
  const peak = o.gain ?? 0.5, att = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + att);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(out);
  osc.start(at); osc.stop(at + dur + 0.05);
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
  f.type = o.type ?? "bandpass"; f.Q.value = o.q ?? 1.5;
  f.frequency.setValueAtTime(o.freq, at);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.6, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at); src.stop(at + dur + 0.05);
}

/** A struck bell: a few inharmonic partials with long decay. */
function bell(at: number, f: number, gain = 0.35) {
  [[1, 1], [2.76, 0.35], [5.4, 0.15]].forEach(([m, g]) => tone(at, f * m, 1.6 / Math.sqrt(m), { gain: gain * g, attack: 0.002 }));
}

// ---------- The sounds, per style ----------
// `speed` (0..1) lets the wheel tick drop in pitch and volume as it slows down.

type Recipe = (t: number, speed: number) => void;
const STYLES: Record<SoundStyle, Record<SoundEvent, Recipe>> = {
  // Wooden clicks and a bell; sad trombone for bad luck
  classic: {
    tick: (t, s) => { noise(t, 0.035, { freq: 2200 + s * 1400, q: 6, gain: 0.55 + s * 0.3 }); tone(t, 1300 + s * 500, 0.03, { gain: 0.18, type: "triangle" }); },
    spin: (t) => noise(t, 0.55, { freq: 350, to: 2200, q: 0.8, gain: 0.35 }),
    land: (t) => { bell(t, 880); bell(t + 0.12, 1318.5, 0.25); },
    misfortune: (t) => {
      [466.2, 440, 415.3].forEach((f, i) => tone(t + i * 0.32, f, 0.3, { type: "sawtooth", gain: 0.22, attack: 0.03 }));
      tone(t + 0.96, 392, 1.0, { type: "sawtooth", gain: 0.22, attack: 0.03, vibrato: 7 });
    },
    flip: (t) => noise(t, 0.14, { freq: 1200, to: 5200, q: 0.7, gain: 0.3, type: "highpass" }),
    done: (t) => tone(t, 620, 0.09, { to: 240, gain: 0.45 }),
    star: (t) => { tone(t, 1568, 0.35, { gain: 0.25 }); tone(t + 0.08, 2093, 0.45, { gain: 0.22 }); tone(t + 0.16, 3136, 0.5, { gain: 0.12 }); },
    timer: (t) => { bell(t, 880); bell(t + 0.22, 1174.7); },
  },
  // Muted taps and a marimba; low gong for bad luck
  soft: {
    tick: (t, s) => tone(t, 700 + s * 400, 0.04, { gain: 0.25 + s * 0.2, type: "sine" }),
    spin: (t) => noise(t, 0.6, { freq: 250, to: 900, q: 0.6, gain: 0.22, type: "lowpass" }),
    land: (t) => [523.3, 659.3, 784].forEach((f, i) => { tone(t + i * 0.09, f, 0.5, { gain: 0.35 }); tone(t + i * 0.09, f * 4, 0.12, { gain: 0.08 }); }),
    misfortune: (t) => { [110, 165.5, 221, 276].forEach((f, i) => tone(t, f, 2.4 - i * 0.4, { gain: 0.3 / (i + 1), attack: 0.01 })); },
    flip: (t) => noise(t, 0.12, { freq: 600, to: 2400, q: 0.5, gain: 0.2, type: "lowpass" }),
    done: (t) => tone(t, 520, 0.12, { to: 300, gain: 0.3 }),
    star: (t) => { tone(t, 1046.5, 0.4, { gain: 0.2 }); tone(t + 0.1, 1568, 0.5, { gain: 0.16 }); },
    timer: (t) => [784, 659.3, 784].forEach((f, i) => tone(t + i * 0.18, f, 0.45, { gain: 0.3 })),
  },
  // 8-bit blips; game-show buzzer for bad luck
  arcade: {
    tick: (t, s) => tone(t, 900 + s * 700, 0.025, { type: "square", gain: 0.12 + s * 0.08 }),
    spin: (t) => [330, 440, 554, 659, 880].forEach((f, i) => tone(t + i * 0.05, f, 0.06, { type: "square", gain: 0.12 })),
    land: (t) => [659.3, 784, 1046.5, 1318.5].forEach((f, i) => tone(t + i * 0.08, f, 0.12, { type: "square", gain: 0.14 })),
    misfortune: (t) => { tone(t, 150, 0.7, { type: "square", gain: 0.2 }); tone(t, 156, 0.7, { type: "sawtooth", gain: 0.12 }); },
    flip: (t) => tone(t, 400, 0.08, { type: "square", to: 1200, gain: 0.12 }),
    done: (t) => { tone(t, 988, 0.07, { type: "square", gain: 0.14 }); tone(t + 0.07, 1319, 0.18, { type: "square", gain: 0.14 }); },
    star: (t) => [1319, 1568, 2093].forEach((f, i) => tone(t + i * 0.06, f, 0.08, { type: "square", gain: 0.1 })),
    timer: (t) => [880, 0, 880, 0, 1175].forEach((f, i) => f && tone(t + i * 0.1, f, 0.09, { type: "square", gain: 0.14 })),
  },
};

/** Play a game sound (if Sounds is on). `style` overrides the chosen style (the sound lab). */
export function play(event: SoundEvent, opts: { speed?: number; style?: SoundStyle; force?: boolean } = {}) {
  const prefs = usePrefs.getState();
  if (!opts.force && !prefs.sound) return;
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
  const a = audio();
  if (!a || !master) return;
  if (a.state !== "running") a.resume().catch(() => {});
  try {
    STYLES[opts.style ?? prefs.soundStyle][event](a.currentTime + 0.01, Math.min(Math.max(opts.speed ?? 1, 0), 1));
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

export const SOUND_STYLES: { id: SoundStyle; name: string; note: string }[] = [
  { id: "classic", name: "Classic", note: "Wooden wheel clicks, a bell on landing, sad trombone for bad luck" },
  { id: "soft", name: "Soft", note: "Muted taps, a marimba on landing, a low gong for bad luck" },
  { id: "arcade", name: "Arcade", note: "8-bit blips, a little fanfare, a game-show buzzer for bad luck" },
];
export const SOUND_EVENTS: { id: SoundEvent; name: string }[] = [
  { id: "spin", name: "Spin starts" }, { id: "tick", name: "Wheel tick" }, { id: "land", name: "Lands (Spin the Wheel)" },
  { id: "misfortune", name: "Lands (Misfortune)" }, { id: "flip", name: "Card flips" }, { id: "done", name: "Done" },
  { id: "star", name: "Star" }, { id: "timer", name: "Timer ends" },
];
