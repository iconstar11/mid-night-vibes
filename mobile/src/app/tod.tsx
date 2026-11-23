import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import Svg, { Circle, Rect } from "react-native-svg";

import { AdultOnly } from "@/components/Guard";
import { MoodBar, MoodSheet } from "@/components/Mood";
import { CardFace, cardLabel, useCardMotion } from "@/components/TodCard";
import { Timer } from "@/components/Timer";
import { durationOf } from "@/game/timer";
import { GameBar, Press, Screen } from "@/components/ui";
import type { Card, CardType } from "@/game/types";
import { to, wait } from "@/lib/anim";
import { takeGuestTurn } from "@/lib/guestTurns";
import { savePending } from "@/lib/pending";
import { host } from "@/lib/room";
import { current, nextUp, useGame } from "@/state/store";
import { HEAT_NAMES, font, useColors } from "@/theme/tokens";

const tap = () => { if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {}); };

export default function TruthOrDare() {
  return <AdultOnly needPlayers><Game /></AdultOnly>;
}

function Game() {
  const c = useColors();
  const motion = useCardMotion();
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

  const pulseT = useSharedValue(1);
  const pulseD = useSharedValue(1);
  const tStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseT.value }] }));
  const dStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseD.value }] }));

  useEffect(() => { host.screen("tod"); }, []);
  useEffect(() => { setCard(null); }, [heat]);

  /** Guests get a few free cards; after that, sign in and carry on from this card. */
  async function allowed() {
    if (await takeGuestTurn()) return true;
    await savePending("turns", "/tod");
    router.push("/account");
    return false;
  }

  async function reveal(type: CardType) {
    if (busy) return;
    setBusy(true);
    if (!(await allowed())) { setBusy(false); return; }
    tap();
    const drawn = draw(type);
    host.card(drawn, false);
    await motion.flip(() => setCard(drawn));
    setBusy(false);
  }

  async function random() {
    if (busy) return;
    setBusy(true);
    if (!(await allowed())) { setBusy(false); return; }
    tap();
    const type: CardType = Math.random() < 0.5 ? "truth" : "dare";
    const drawn = draw(type);
    host.card(drawn, true); // viewers run the same shuffle and land on the same card
    await motion.shuffle(type, setShuffleText);
    if (!motion.reduce) {
      const pulse = type === "truth" ? pulseT : pulseD;
      await to(pulse, 1.08, { duration: 160 }); await to(pulse, 1, { duration: 160 });
    }
    tap();
    await wait(motion.reduce ? 0 : 250);
    await motion.flip(() => { setShuffleText(null); setCard(drawn); });
    setBusy(false);
  }

  async function done() {
    if (busy) return;
    setBusy(true); tap();
    host.next();
    await motion.next(() => { nextTurn(); setCard(null); });
    setBusy(false);
  }

  const who = shuffleText ? `${me}, the deck is choosing` : card ? `${me}, your turn to ${card.type === "truth" ? "tell the truth" : "take the dare"}` : `Round ${turn + 1}`;
  const text = shuffleText ?? card?.text ?? `${me}, truth or dare?`;
  const kind = shuffleText ? "Random" : card ? (card.ai ? "✦ " : "") + cardLabel(card.type) : HEAT_NAMES[heat - 1];

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <GameBar game="Truth or Dare" who={`${me}'s turn`} />
        <MoodBar onPress={() => setMoodOpen(true)} />
        <CardFace motion={motion} who={who} text={text} kind={kind} shuffling={!!shuffleText}>
          {card && !shuffleText && durationOf(card.text) && <Timer key={card.text} seconds={durationOf(card.text)!} />}
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
        </CardFace>

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
