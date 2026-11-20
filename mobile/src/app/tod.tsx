import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";
import Svg, { Circle, Rect } from "react-native-svg";

import { AdultOnly } from "@/components/Guard";
import { MoodBar, MoodSheet } from "@/components/Mood";
import { GameBar, Press, Screen } from "@/components/ui";
import type { Card, CardType } from "@/game/types";
import { easeIn, easeOut, to, wait } from "@/lib/anim";
import { current, nextUp, useGame } from "@/state/store";
import { HEAT_NAMES, font, useColors } from "@/theme/tokens";

const label = (t: CardType) => (t === "truth" ? "Truth" : "Dare");
const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };

export default function TruthOrDare() {
  return <AdultOnly needPlayers><Game /></AdultOnly>;
}

function Game() {
  const c = useColors();
  const reduce = useReducedMotion();
  const turn = useGame((g) => g.turn);
  const players = useGame((g) => g.players);
  const heat = useGame((g) => g.heat);
  const draw = useGame((g) => g.draw);
  const nextTurn = useGame((g) => g.nextTurn);
  const me = current({ players, turn }).name;
  const next = nextUp({ players, turn }).name;

  const [card, setCard] = useState<Card | null>(null);
  const [shuffleText, setShuffleText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const width = useRef(360);

  // Card motion: rotateY for flips, x/rot/opacity for fly-out, y/scale for rise-in, wobble for Random
  const flipY = useSharedValue(0);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const pulseT = useSharedValue(1);
  const pulseD = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 1200 }, { translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { rotateY: `${flipY.value}deg` }, { scale: scale.value }],
  }));
  const tStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseT.value }] }));
  const dStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseD.value }] }));

  useEffect(() => { setCard(null); }, [heat]);

  async function flip(change: () => void) {
    await to(flipY, 90, { duration: 170, easing: easeIn }, reduce);
    change();
    flipY.value = reduce ? 0 : -90;
    await to(flipY, 0, { duration: 240, easing: easeOut }, reduce);
  }

  async function reveal(type: CardType) {
    if (busy) return;
    setBusy(true); tap();
    await flip(() => setCard(draw(type)));
    setBusy(false);
  }

  async function random() {
    if (busy) return;
    setBusy(true); tap();
    const type: CardType = Math.random() < 0.5 ? "truth" : "dare";
    const other: CardType = type === "truth" ? "dare" : "truth";
    const steps = reduce ? 1 : 11 + (type === "dare" ? 1 : 0);
    for (let i = 0; i < steps; i++) {
      setShuffleText(label((steps - 1 - i) % 2 === 0 ? type : other) + "…");
      if (!reduce) {
        y.value = -6; rot.value = i % 2 ? 1.5 : -1.5;
        to(y, 0, { duration: 110 }); to(rot, 0, { duration: 110 });
      }
      await wait(reduce ? 0 : 60 + i * i * 3.2);
    }
    const pulse = type === "truth" ? pulseT : pulseD;
    if (!reduce) { await to(pulse, 1.08, { duration: 160 }); await to(pulse, 1, { duration: 160 }); }
    tap();
    await wait(reduce ? 0 : 250);
    await flip(() => { setShuffleText(null); setCard(draw(type)); });
    setBusy(false);
  }

  async function done() {
    if (busy) return;
    setBusy(true); tap();
    await Promise.all([
      to(x, -width.current * 1.15, { duration: 340, easing: easeIn }, reduce),
      to(rot, -14, { duration: 340, easing: easeIn }, reduce),
      to(opacity, 0, { duration: 340, easing: easeIn }, reduce),
    ]);
    nextTurn(); setCard(null);
    x.value = 0; rot.value = 0; y.value = reduce ? 0 : 26; scale.value = reduce ? 1 : 0.94;
    await Promise.all([
      to(opacity, 1, { duration: 320, easing: easeOut }, reduce),
      to(y, 0, { duration: 320, easing: easeOut }, reduce),
      to(scale, 1, { duration: 320, easing: easeOut }, reduce),
    ]);
    setBusy(false);
  }

  const who = shuffleText ? `${me}, the deck is choosing` : card ? `${me}, your turn to ${card.type === "truth" ? "tell the truth" : "take the dare"}` : `Round ${turn + 1}`;
  const text = shuffleText ?? card?.text ?? `${me}, truth or dare?`;
  const kind = shuffleText ? "Random" : card ? (card.ai ? "✦ " : "") + label(card.type) : HEAT_NAMES[heat - 1];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <GameBar game="Truth or Dare" who={`${me}'s turn`} />
        <MoodBar onPress={() => setMoodOpen(true)} />
        <View style={st.deck} onLayout={(e) => { width.current = e.nativeEvent.layout.width; }}>
          <View style={[st.behind, st.behind2, { backgroundColor: c.rose }]} />
          <View style={[st.behind, st.behind1, { backgroundColor: c.rose }]} />
          <Animated.View style={[st.card, { shadowColor: c.plum }, cardStyle]} accessibilityLiveRegion="polite">
            <LinearGradient colors={[c.wine, c.plum]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={[st.who, { color: c.onAccent }]}>{who}</Text>
            <Text style={[st.text, { color: c.onAccent }, shuffleText ? { fontFamily: font.displayItalic, color: c.brass } : null]}>{text}</Text>
            <Text style={[st.kind, { color: c.brass }]}>{kind}</Text>
            {card && !shuffleText && (
              <View style={st.onCard}>
                <Pressable onPress={() => reveal(card.type)} disabled={busy} style={[st.skip, { borderColor: c.onAccent + "66" }]} accessibilityRole="button">
                  <Text style={[st.skipText, { color: c.onAccent }]}>Skip</Text>
                </Pressable>
                <Pressable onPress={done} disabled={busy} style={[st.done, { backgroundColor: c.onAccent }]} accessibilityRole="button">
                  <Text style={[st.doneText, { color: c.wine }]} numberOfLines={1}>Done, {next}'s turn</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </View>

        {!card && (
          <View style={st.pair}>
            <Animated.View style={[{ flex: 1 }, tStyle]}>
              <Press onPress={() => reveal("truth")} disabled={busy} style={[st.pick, { backgroundColor: c.plum }]} accessibilityRole="button" accessibilityLabel="Truth">
                <Text style={[st.pickSmall, { color: c.onAccent }]}>Answer honestly</Text>
                <Text style={[st.pickBig, { color: c.onAccent }]}>Truth</Text>
              </Press>
            </Animated.View>
            <Press onPress={random} disabled={busy} scale={0.92} accessibilityRole="button" accessibilityLabel="Random: let the deck choose truth or dare"
              style={[st.rand, { backgroundColor: c.surface, borderColor: c.brass, shadowColor: c.plum }]}>
              <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={c.brass} strokeWidth={1.8}>
                <Rect x={3.5} y={3.5} width={17} height={17} rx={4} />
                <Circle cx={8.5} cy={8.5} r={1.3} fill={c.brass} /><Circle cx={15.5} cy={15.5} r={1.3} fill={c.brass} /><Circle cx={12} cy={12} r={1.3} fill={c.brass} />
              </Svg>
              <Text style={[st.randText, { color: c.brass }]}>Random</Text>
            </Press>
            <Animated.View style={[{ flex: 1 }, dStyle]}>
              <Press onPress={() => reveal("dare")} disabled={busy} style={[st.pick, { backgroundColor: c.wine }]} accessibilityRole="button" accessibilityLabel="Dare">
                <Text style={[st.pickSmall, { color: c.onAccent }]}>Do it now</Text>
                <Text style={[st.pickBig, { color: c.onAccent }]}>Dare</Text>
              </Press>
            </Animated.View>
          </View>
        )}
      </Screen>
      <MoodSheet open={moodOpen} onClose={() => setMoodOpen(false)} />
    </View>
  );
}

const st = StyleSheet.create({
  deck: { flex: 1, minHeight: 360, marginTop: 14 },
  behind: { position: "absolute", borderRadius: 30 },
  behind2: { left: 22, right: 22, top: -14, bottom: 14, opacity: 0.25 },
  behind1: { left: 11, right: 11, top: -7, bottom: 7, opacity: 0.5 },
  card: { flex: 1, borderRadius: 30, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 20, overflow: "hidden", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 22 }, elevation: 8, backfaceVisibility: "hidden" },
  who: { fontFamily: font.semibold, fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8, textAlign: "center" },
  text: { fontFamily: font.display, fontSize: 34, lineHeight: 38, textAlign: "center", marginVertical: "auto" },
  kind: { fontFamily: font.heavy, fontSize: 12.5, letterSpacing: 1.8, textTransform: "uppercase", textAlign: "center" },
  onCard: { flexDirection: "row", gap: 10, marginTop: 18 },
  skip: { flex: 1, borderWidth: 1.5, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  skipText: { fontFamily: font.semibold, fontSize: 16 },
  done: { flex: 1.4, borderRadius: 999, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  doneText: { fontFamily: font.heavy, fontSize: 16 },
  pair: { flexDirection: "row", alignItems: "center", gap: 10 },
  pick: { borderRadius: 22, paddingVertical: 20, paddingHorizontal: 18, gap: 2 },
  pickSmall: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 },
  pickBig: { fontFamily: font.displayItalic, fontSize: 34, lineHeight: 36 },
  rand: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 1, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 8 } },
  randText: { fontFamily: font.heavy, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
});
