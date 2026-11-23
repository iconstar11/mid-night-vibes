// Countdown for timed dares ("Give a 1-minute massage"). Sits on the card; give it a `key` per card so it resets.
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { clock } from "@/game/timer";
import { font, useColors } from "@/theme/tokens";

const SIZE = 56;
const STROKE = 4;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type Phase = "ready" | "running" | "paused" | "done";

/** A short two-note chime on web, a buzz on phones. */
function alarm() {
  if (Platform.OS !== "web") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return;
  }
  try {
    navigator.vibrate?.([180, 90, 180]);
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    [880, 1175].forEach((hz, i) => {
      const t = ac.currentTime + i * 0.22;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ac.close().catch(() => {}), 1200);
  } catch {
    // Sound is a nice-to-have
  }
}

export function Timer({ seconds }: { seconds: number }) {
  const c = useColors();
  const [phase, setPhase] = useState<Phase>("ready");
  const [left, setLeft] = useState(seconds * 1000);
  const endsAt = useRef(0);

  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      const ms = Math.max(0, endsAt.current - Date.now());
      setLeft(ms);
      if (ms === 0) { setPhase("done"); alarm(); }
    }, 200);
    return () => clearInterval(id);
  }, [phase]);

  function toggle() {
    if (phase === "running") { setPhase("paused"); return; }
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    const from = phase === "done" ? seconds * 1000 : left;
    endsAt.current = Date.now() + from;
    setLeft(from);
    setPhase("running");
  }

  function reset() {
    setPhase("ready");
    setLeft(seconds * 1000);
  }

  const shown = Math.ceil(left / 1000);
  const done = phase === "done";
  const label = phase === "running" ? "Pause" : phase === "paused" ? "Resume" : done ? "Again" : `Start ${clock(seconds)} timer`;

  return (
    <View style={[st.wrap, { backgroundColor: c.onAccent + "14", borderColor: done ? c.brass : c.onAccent + "33" }]}>
      <View style={st.ring} accessibilityRole="timer" accessibilityLabel={done ? "Time's up" : `${shown} seconds left`}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.onAccent + "33"} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.brass} strokeWidth={STROKE} fill="none" strokeLinecap="round"
            strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - left / (seconds * 1000))}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <Text style={[st.time, { color: done ? c.brass : c.onAccent }]}>{done ? "0:00" : clock(shown)}</Text>
      </View>

      <Text style={[st.status, { color: done ? c.brass : c.onAccent }]} numberOfLines={1}>
        {done ? "Time's up!" : phase === "running" ? "Go!" : phase === "paused" ? "Paused" : "Timed dare"}
      </Text>

      {phase !== "ready" && !done && (
        <Pressable onPress={reset} hitSlop={8} accessibilityRole="button" accessibilityLabel="Reset timer">
          <Text style={[st.reset, { color: c.onAccent }]}>Reset</Text>
        </Pressable>
      )}
      <Pressable onPress={toggle} style={[st.go, { backgroundColor: c.brass }]} accessibilityRole="button">
        <Text style={[st.goText, { color: c.plum }]} numberOfLines={1}>{label}</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 999, padding: 6, paddingRight: 8, marginTop: 14 },
  ring: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  time: { fontFamily: font.heavy, fontSize: 14, fontVariant: ["tabular-nums"] },
  status: { flex: 1, fontFamily: font.semibold, fontSize: 15 },
  reset: { fontFamily: font.semibold, fontSize: 14, opacity: 0.8, paddingHorizontal: 4 },
  go: { borderRadius: 999, paddingVertical: 11, paddingHorizontal: 16 },
  goText: { fontFamily: font.heavy, fontSize: 14 },
});
