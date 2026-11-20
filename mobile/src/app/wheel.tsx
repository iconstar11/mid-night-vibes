import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdultOnly } from "@/components/Guard";
import { MoodBar, MoodSheet } from "@/components/Mood";
import { Sheet } from "@/components/Sheet";
import { Wheel, type WheelHandle } from "@/components/Wheel";
import { Fine, GameBar, Screen } from "@/components/ui";
import { WHEELS } from "@/game/content";
import { fillTarget } from "@/game/match";
import type { Wedge } from "@/game/types";
import { planSpin } from "@/game/wheel";
import { host } from "@/lib/room";
import { current, nextUp, useGame } from "@/state/store";
import { font, useColors } from "@/theme/tokens";

export default function SpinTheWheel() {
  return <AdultOnly needPlayers><Game /></AdultOnly>;
}

function Game() {
  const c = useColors();
  const turn = useGame((g) => g.turn);
  const players = useGame((g) => g.players);
  const heat = useGame((g) => g.heat);
  const nextTurn = useGame((g) => g.nextTurn);
  const aiWheel = useGame((g) => g.ai.wheel);
  const group = useGame((g) => g.group);
  const target: Wedge[] = aiWheel?.length ? aiWheel : WHEELS[group === "couple" ? "couple" : "group"];

  const wheel = useRef<WheelHandle>(null);
  const [shown, setShown] = useState<Wedge[]>(target);
  const [hi, setHi] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<null | { label: string; text: string; ai: boolean }>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const me = current({ players, turn }).name;

  useEffect(() => { host.screen("wheel"); }, []);

  // New wedges from the AI mood: swap them in once the wheel is idle
  useEffect(() => {
    if (target === shown || spinning || result) return;
    wheel.current?.swap(() => { setShown(target); setHi(-1); });
  }, [target, spinning, result]); // eslint-disable-line react-hooks/exhaustive-deps

  async function spin(power: number, dir: 1 | -1, windup: boolean) {
    if (spinning || !wheel.current) return;
    setSpinning(true); setHi(-1);
    const plan = planSpin(shown.length, power, dir, windup);
    const start = wheel.current.rotation();
    host.spin(plan, start); // viewers replay the same spin from the same angle
    const win = await wheel.current.spin(plan, start);
    setHi(win);
    const w = shown[win];
    const s = useGame.getState();
    const r = { label: w[0], text: fillTarget(w[1][Math.min(heat, w[1].length) - 1], current(s), s.players), ai: shown === aiWheel };
    setResult(r);
    host.result(r);
    setSpinning(false);
  }

  const close = () => { setResult(null); setHi(-1); host.result(null); };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <GameBar game="Spin the Wheel" who={`${me}'s turn`} />
        <MoodBar onPress={() => setMoodOpen(true)} />
        <View style={st.center}>
          <Wheel ref={wheel} wedges={shown} hi={hi} disabled={spinning || !!result} onRequestSpin={spin} />
          <Fine>Tap Spin, or flick the wheel with your finger.</Fine>
        </View>
      </Screen>

      <Sheet open={!!result} onClose={close}>
        <Text style={[st.who, { color: c.onAccent }]}>{me}, this one's yours</Text>
        <Text style={[st.kind, { color: c.brass }]}>{(result?.ai ? "✦ " : "") + (result?.label ?? "")}</Text>
        <Text style={[st.text, { color: c.onAccent }]}>{result?.text}</Text>
        <View style={st.row}>
          <Pressable onPress={() => { close(); setTimeout(() => spin(0.4, 1, true), 240); }} style={[st.skip, { borderColor: c.onAccent + "66" }]} accessibilityRole="button">
            <Text style={[st.skipText, { color: c.onAccent }]}>Skip</Text>
          </Pressable>
          <Pressable onPress={() => { nextTurn(); close(); }} style={[st.done, { backgroundColor: c.onAccent }]} accessibilityRole="button">
            <Text style={[st.doneText, { color: c.wine }]} numberOfLines={1}>Done, {nextUp({ players, turn }).name}'s turn</Text>
          </Pressable>
        </View>
      </Sheet>
      <MoodSheet open={moodOpen} onClose={() => setMoodOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: 16 },
  who: { fontFamily: font.semibold, fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8, textAlign: "center" },
  kind: { fontFamily: font.heavy, fontSize: 12.5, letterSpacing: 1.8, textTransform: "uppercase", textAlign: "center" },
  text: { fontFamily: font.display, fontSize: 32, lineHeight: 36, textAlign: "center", marginVertical: 10 },
  row: { flexDirection: "row", gap: 10 },
  skip: { flex: 1, borderWidth: 1.5, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  skipText: { fontFamily: font.semibold, fontSize: 16 },
  done: { flex: 1.4, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  doneText: { fontFamily: font.heavy, fontSize: 16 },
});
