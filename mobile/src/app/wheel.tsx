import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdultOnly } from "@/components/Guard";
import { MoodBar, MoodSheet } from "@/components/Mood";
import { Sheet } from "@/components/Sheet";
import { StarButton } from "@/components/StarButton";
import { Timer } from "@/components/Timer";
import { Wheel, type WheelHandle } from "@/components/Wheel";
import { Fine, GameBar, Screen } from "@/components/ui";
import { WHEELS } from "@/game/content";
import { fillTarget } from "@/game/match";
import { durationOf } from "@/game/timer";
import type { Wedge } from "@/game/types";
import { aiCardId, cardId, type CardSource } from "@/game/cards";
import { TOP_PICKS } from "@/game/topPicks";
import { planSpin, wedgeText } from "@/game/wheel";
import { takeGuestTurn } from "@/lib/guestTurns";
import { savePending } from "@/lib/pending";
import { host } from "@/lib/room";
import { useAuth } from "@/lib/auth";
import { track } from "@/lib/track";
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
  const [result, setResult] = useState<null | { label: string; text: string; ai: boolean; id?: string; source?: CardSource }>(null);
  const [moodOpen, setMoodOpen] = useState(false);
  const me = current({ players, turn }).name;
  // The first spins of a session land on top-pick wedges (not one already landed on)
  const topLanded = useRef<Set<number>>(new Set());
  const spins = useRef(0);

  const shownAt = useRef(0);
  useEffect(() => {
    host.screen("wheel");
    const g = useGame.getState();
    track("game_start", { game: "wheel", group: g.group, heat: g.heat, players_n: g.players.length, has_mood: !!g.mood });
  }, []);
  const ended = (name: "card_skip" | "card_done") => {
    if (result) track(name, { game: "wheel", heat, group, guest: !useAuth.getState().email, card_id: result.id, type: "wedge", source: result.source, ms_on_card: Date.now() - shownAt.current });
  };

  // New wedges from the AI mood: swap them in once the wheel is idle
  useEffect(() => {
    if (target === shown || spinning || result) return;
    wheel.current?.swap(() => { setShown(target); setHi(-1); });
  }, [target, spinning, result]); // eslint-disable-line react-hooks/exhaustive-deps

  async function spin(power: number, dir: 1 | -1, windup: boolean) {
    if (spinning || !wheel.current) return;
    setSpinning(true);
    // Guests get a few free spins; after that, sign in and carry on from here
    if (!(await takeGuestTurn())) {
      track("guest_wall", { reason: "turns", game: "wheel" });
      setSpinning(false);
      await savePending("turns", "/wheel");
      router.push("/account");
      return;
    }
    setHi(-1);
    const prefer = spins.current < 3 && shown !== aiWheel
      ? shown.map((w, i) => (TOP_PICKS.has(cardId(wedgeText(w[1], heat))) && !topLanded.current.has(i) ? i : -1)).filter((i) => i >= 0)
      : [];
    const plan = planSpin(shown.length, power, dir, windup, Math.random, prefer);
    spins.current++;
    if (prefer.includes(plan.win)) topLanded.current.add(plan.win);
    const start = wheel.current.rotation();
    host.spin(plan, start); // viewers replay the same spin from the same angle
    const win = await wheel.current.spin(plan, start);
    setHi(win);
    const w = shown[win];
    const s = useGame.getState();
    const raw = wedgeText(w[1], heat);
    const ai = shown === aiWheel;
    const r = { label: w[0], text: fillTarget(raw, current(s), s.players), ai, id: ai ? aiCardId(raw) : cardId(raw), source: (ai ? "ai" : prefer.includes(win) ? "top" : "deck") as CardSource };
    setResult(r);
    shownAt.current = Date.now();
    track("card_shown", { game: "wheel", heat, group, guest: !useAuth.getState().email, card_id: r.id, type: "wedge", source: r.source, turn_n: spins.current });
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
        <View style={st.labelRow}>
          <Text style={[st.kind, { color: c.brass }]}>{(result?.ai ? "✦ " : "") + (result?.label ?? "")}</Text>
          {result && <StarButton card={{ ...result, type: "wedge" }} game="wheel" heat={heat} />}
        </View>
        <Text style={[st.text, { color: c.onAccent }]}>{result?.text}</Text>
        {result && durationOf(result.text) && <View style={{ marginBottom: 14 }}><Timer key={result.text} seconds={durationOf(result.text)!} /></View>}
        <View style={st.row}>
          <Pressable onPress={() => { ended("card_skip"); close(); setTimeout(() => spin(0.4, 1, true), 240); }} style={[st.skip, { borderColor: c.onAccent + "66" }]} accessibilityRole="button">
            <Text style={[st.skipText, { color: c.onAccent }]}>Skip</Text>
          </Pressable>
          <Pressable onPress={() => { ended("card_done"); nextTurn(); close(); }} style={[st.done, { backgroundColor: c.onAccent }]} accessibilityRole="button">
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
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  skip: { flex: 1, borderWidth: 1.5, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  skipText: { fontFamily: font.semibold, fontSize: 16 },
  done: { flex: 1.4, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  doneText: { fontFamily: font.heavy, fontSize: 16 },
});
