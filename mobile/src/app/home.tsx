import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";

import { AdultOnly } from "@/components/Guard";
import { MoodSheet, Spark } from "@/components/Mood";
import { PrivateMood } from "@/components/PrivateText";
import { LiveBadge } from "@/components/LiveBadge";
import { ShareRoom } from "@/components/ShareRoom";
import { Sheet } from "@/components/Sheet";
import { Icon } from "@/components/SettingsList";
import { Btn, Fine, Press, Screen } from "@/components/ui";
import { GROUPS } from "@/game/content";
import type { Heat } from "@/game/types";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { useInstall } from "@/lib/install";
import { host } from "@/lib/room";
import { useGame } from "@/state/store";
import { FLAMES, HEAT_NAMES, font, mix, useColors } from "@/theme/tokens";

export default function Home() {
  return <AdultOnly needPlayers><Games /></AdultOnly>;
}

function joinNames(n: string[]) {
  if (n.length <= 3) return n.join(" & ").replace(/ & (?=.* & )/g, ", ");
  return n.slice(0, 2).join(", ") + " & " + (n.length - 2) + " more";
}

function Games() {
  const c = useColors();
  const group = useGame((g) => g.group);
  const players = useGame((g) => g.players);
  const heat = useGame((g) => g.heat);
  const setHeat = useGame((g) => g.setHeat);
  const heatRise = usePrefs((p) => p.heatRise);
  const mood = useGame((g) => g.mood);
  const aiState = useGame((g) => g.ai.state);
  const [moodOpen, setMoodOpen] = useState(false);
  const [guide, setGuide] = useState<null | "ios-guide" | "safari-needed">(null);
  const { canInstall, install } = useInstall();
  const [shareOpen, setShareOpen] = useState(false);
  // Back from signing in to start a live game: open the share sheet again
  const { share } = useLocalSearchParams<{ share?: string }>();
  useEffect(() => { if (share === "1") setShareOpen(true); }, [share]);
  const email = useAuth((a) => a.email);
  const name = useAuth((a) => a.name);
  useFocusEffect(useCallback(() => { host.screen("home"); }, []));

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll>
        <View style={st.bar}>
          <View style={{ flexShrink: 1 }}>
          <Text style={[st.brand, { color: c.ink }]}>
            Midnight <Text style={{ color: c.wine, fontFamily: font.displayItalic }}>Vibes</Text>
          </Text>
          <View style={{ alignSelf: "flex-start" }}><LiveBadge /></View>
          </View>
          <View style={st.hdr}>
            {canInstall && (
              <Press onPress={async () => { const r = await install(); if (r !== "prompted") setGuide(r); }} scale={0.96}
                style={[st.install, { backgroundColor: c.brass, shadowColor: c.brass }]} accessibilityRole="button" accessibilityLabel="Install the app">
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={c.onAccent} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />
                </Svg>
                <Text style={[st.installText, { color: c.onAccent }]}>Install</Text>
              </Press>
            )}
            <Press onPress={() => setShareOpen(true)} scale={0.92} accessibilityRole="button" accessibilityLabel="Play together: share a live room"
              style={[st.share, { borderColor: c.line, backgroundColor: c.surface, boxShadow: `0 6px 16px ${c.plum}22` }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Circle cx={18} cy={5} r={2.6} /><Circle cx={6} cy={12} r={2.6} /><Circle cx={18} cy={19} r={2.6} />
                <Path d="M8.3 10.8 15.7 6.2M8.3 13.2l7.4 4.6" />
              </Svg>
            </Press>
            <Press onPress={() => router.push("/account")} scale={0.92} accessibilityRole="button" accessibilityLabel={email ? "Account" : "Sign in or create an account"}
              style={email ? { boxShadow: `0 6px 16px ${c.plum}33`, borderRadius: 22 } : [st.share, { borderColor: c.line, backgroundColor: c.surface, boxShadow: `0 6px 16px ${c.plum}22` }]}>
              {email ? (
                <LinearGradient colors={[c.brass, mix(c.brass, "#FFF5F3", 0.45), c.brass]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.ring}>
                  <View style={[st.avatar, { backgroundColor: c.wine }]}>
                    <Text style={[st.initial, { color: c.onAccent }]}>{(name || email)[0].toUpperCase()}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.ink} strokeWidth={2} strokeLinecap="round">
                  <Circle cx={12} cy={8.5} r={3.8} /><Path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" />
                </Svg>
              )}
            </Press>
          </View>
        </View>

        <View style={{ gap: 6 }}>
        <Text style={[st.kicker, { color: c.brass }]}>✦  TONIGHT · {GROUPS[group].name.toUpperCase()}</Text>
        <Text style={[st.hello, { color: c.ink }]}>
          Hey,{" "}
          <Text onPress={() => router.push(group === "couple" ? "/couple" : "/players")} accessibilityRole="button" accessibilityLabel="Change players"
            style={{ color: c.wine, fontFamily: font.displayItalic }}>
            {joinNames(players.map((p) => p.name))}<Text style={{ fontSize: 20, color: c.muted }}> ✎</Text>
          </Text>. What are we playing?
        </Text>
        </View>

        <View>
          <Text style={[st.head, { color: c.muted }]}>How hot tonight?</Text>
          <View style={[st.heat, { borderColor: c.line, backgroundColor: c.surface, boxShadow: `inset 0 2px 6px ${c.plum}26` }]} accessibilityRole="radiogroup">
            {HEAT_NAMES.map((h, i) => {
              const on = heat === i + 1;
              return (
                <Pressable key={h} onPress={() => setHeat((i + 1) as Heat)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                  style={[st.heatBtn, on && { backgroundColor: c.rose, boxShadow: `0 6px 16px ${c.rose}55` }]}>
                  <Text style={[st.heatText, { color: on ? c.onAccent : c.muted }]}>{h}</Text>
                  <Text style={[st.flames, { color: on ? c.onAccent : c.muted }]}>{FLAMES[i]}</Text>
                </Pressable>
              );
            })}
          </View>
          {heatRise !== false && heat < 3 && (
            <View style={st.riseRow}>
              <Icon name="rise" color={c.muted} size={14} width={2} />
              <Text style={[st.riseText, { color: c.muted }]}>Starts here and rises as you play</Text>
            </View>
          )}
        </View>

        <View style={st.games}>
          <Animated.View entering={FadeInDown.duration(380)} style={st.half}>
            <Press onPress={() => router.push("/tod")} style={[st.gameWrap, { borderColor: c.brass + "38", boxShadow: `0 18px 36px ${c.plum}55` }]} accessibilityRole="button" accessibilityLabel="Truth or Dare">
              <LinearGradient colors={[c.plum, mix(c.plum, "#000000", 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={st.game}>
                <View style={[st.glow, { backgroundColor: c.rose + "22" }]} pointerEvents="none" />
                <View style={st.artCards}>
                  <View style={[st.cardBack, { backgroundColor: c.rose }]} />
                  <View style={[st.cardFront, { backgroundColor: c.onAccent }]}><Text style={[st.q, { color: c.plum }]}>?</Text></View>
                </View>
                <Text style={[st.gameKicker, { color: c.brass }]}>CARDS</Text>
                <Text style={[st.gameName, { color: c.onAccent }]}>Truth or Dare</Text>
                <Text style={[st.gameSub, { color: c.onAccent }]}>Take turns: answer honestly or do the dare.</Text>
              </LinearGradient>
            </Press>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(70).duration(380)} style={st.half}>
            <Press onPress={() => router.push("/wheel")} style={[st.gameWrap, { borderColor: c.brass + "38", boxShadow: `0 18px 36px ${c.wine}55` }]} accessibilityRole="button" accessibilityLabel="Spin the Wheel">
              <LinearGradient colors={[c.wine, mix(c.wine, c.plum, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 0.5, y: 1 }} style={st.game}>
                <View style={[st.glow, { backgroundColor: c.brass + "1F" }]} pointerEvents="none" />
                <Svg width={120} height={120} viewBox="-60 -60 120 120" style={st.artWheel}>
                  <Circle r={58} fill={c.brass} />
                  <G>{Array.from({ length: 8 }, (_, i) => {
                    const a0 = (i * Math.PI) / 4, a1 = ((i + 1) * Math.PI) / 4, r = 53;
                    return <Path key={i} d={`M0 0 L${r * Math.cos(a0)} ${r * Math.sin(a0)} A${r} ${r} 0 0 1 ${r * Math.cos(a1)} ${r * Math.sin(a1)} Z`} fill={[c.rose, c.plum, c.onAccent, c.plum][i % 4]} />;
                  })}</G>
                </Svg>
                <Text style={[st.gameKicker, { color: c.brass }]}>WHEEL</Text>
                <Text style={[st.gameName, { color: c.onAccent }]}>Spin the Wheel</Text>
                <Text style={[st.gameSub, { color: c.onAccent }]}>Spin and do whatever it lands on.</Text>
              </LinearGradient>
            </Press>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(140).duration(380)} style={{ width: "100%", gap: 8, marginTop: 10 }}>
            <Text style={[st.head, { color: c.muted }]}>Mood</Text>
            <Press onPress={() => setMoodOpen(true)} style={[st.moodTile, { backgroundColor: c.surface, borderColor: mood ? c.brass + "99" : c.line, boxShadow: `0 10px 28px ${c.plum}22` }]} accessibilityRole="button">
              <LinearGradient colors={[c.brass, mix(c.brass, c.wine, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.spark}><Spark size={22} color={c.onAccent} /></LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[st.moodName, { color: c.ink }]} numberOfLines={1}>{mood ? <>Mood: <PrivateMood text={mood} peekable={false} /></> : "Set the mood"}</Text>
                <Text style={[st.moodSub, { color: c.muted }]}>
                  {!mood ? 'AI tailors both games to it, like "kissing".' : aiState === "loading" ? "AI is writing cards and wedges…" : aiState === "ready" ? "Both games are tailored to it." : aiState === "own" ? "Your own list is on the wheel and in the dares." : "AI isn't reachable, so the built-in deck is used."}
                </Text>
              </View>
              <View style={st.moodGoRow}>
                <Text style={[st.moodGo, { color: c.rose }]}>{mood ? "Change" : "Set"}</Text>
                <Icon name="chevron" color={c.rose} size={16} width={2.2} />
              </View>
            </Press>
          </Animated.View>
        </View>
        {aiState === "ready" && <Fine>✦ marks cards and wedges written by AI.</Fine>}
      </Screen>

      <MoodSheet open={moodOpen} onClose={() => setMoodOpen(false)} />
      <ShareRoom open={shareOpen} onClose={() => setShareOpen(false)} />
      <InstallGuide kind={guide} onClose={() => setGuide(null)} />
    </View>
  );
}

function InstallGuide({ kind, onClose }: { kind: null | "ios-guide" | "safari-needed"; onClose: () => void }) {
  const c = useColors();
  const steps = [
    <>Tap <Text style={{ fontFamily: font.heavy }}>Share</Text> in Safari's toolbar</>,
    <>Scroll down and tap <Text style={{ fontFamily: font.heavy }}>Add to Home Screen</Text></>,
    <>Tap <Text style={{ fontFamily: font.heavy }}>Add</Text>. The moon icon appears on your home screen.</>,
  ];
  return (
    <Sheet open={!!kind} onClose={onClose} tone="light">
      <Text style={[st.guideH, { color: c.ink }]} accessibilityRole="header">Install Midnight Vibes</Text>
      <Fine style={{ textAlign: "left" }}>
        {kind === "safari-needed"
          ? "On iPhone, only Safari can add apps to the home screen. Open midnightvibes.online in Safari, then:"
          : "Add it to your home screen. It opens full screen like an app, no App Store needed."}
      </Fine>
      {steps.map((t, i) => (
        <View key={i} style={st.step}>
          <View style={[st.stepNum, { backgroundColor: c.wine }]}><Text style={[st.stepNumText, { color: c.onAccent }]}>{i + 1}</Text></View>
          <Text style={[st.stepText, { color: c.ink }]}>{t}</Text>
        </View>
      ))}
      <Btn label="Got it" onPress={onClose} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 44 },
  brand: { fontFamily: font.display, fontSize: 25, flexShrink: 1 },
  kicker: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1.5 },
  riseRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 6 },
  riseText: { fontFamily: font.body, fontSize: 12.5 },
  head: { fontFamily: font.heavy, fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8, paddingHorizontal: 6 },
  ring: { width: 44, height: 44, borderRadius: 22, padding: 2 },
  avatar: { flex: 1, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  hdr: { flexDirection: "row", alignItems: "center", gap: 8 },
  share: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: font.heavy, fontSize: 17 },
  install: { height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 6, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  installText: { fontFamily: font.heavy, fontSize: 14 },
  hello: { fontFamily: font.display, fontSize: 37, lineHeight: 42 },
  heat: { flexDirection: "row", gap: 4, borderRadius: 999, borderWidth: 1.5, padding: 4 },
  heatBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 999 },
  heatText: { fontFamily: font.semibold, fontSize: 15.5 },
  flames: { fontSize: 9, letterSpacing: 2, opacity: 0.85 },
  games: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  half: { width: "47.9%", flexGrow: 1 },
  gameWrap: { borderRadius: 28, borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
  glow: { position: "absolute", width: 200, height: 200, borderRadius: 100, top: -90, left: -70 },
  gameKicker: { fontFamily: font.heavy, fontSize: 10.5, letterSpacing: 1.5, marginBottom: 2 },
  game: { minHeight: 210, padding: 18, justifyContent: "flex-end", gap: 4, overflow: "hidden" },
  gameName: { fontFamily: font.display, fontSize: 28, lineHeight: 29 },
  gameSub: { fontFamily: font.body, fontSize: 13.5, lineHeight: 18, opacity: 0.85 },
  artCards: { position: "absolute", top: 18, right: 18, width: 70, height: 88 },
  cardBack: { position: "absolute", width: 70, height: 88, borderRadius: 12, transform: [{ rotate: "-12deg" }, { translateX: -10 }, { translateY: 4 }] },
  cardFront: { position: "absolute", width: 70, height: 88, borderRadius: 12, alignItems: "center", justifyContent: "center", transform: [{ rotate: "8deg" }] },
  q: { fontFamily: font.displayItalic, fontSize: 38 },
  artWheel: { position: "absolute", top: 14, right: -22 },
  moodTile: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 22, borderCurve: "continuous", borderWidth: 1 },
  spark: { width: 46, height: 46, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  moodGoRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  moodName: { fontFamily: font.display, fontSize: 23, lineHeight: 28 },
  moodSub: { fontFamily: font.body, fontSize: 13.5 },
  moodGo: { fontFamily: font.heavy, fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase" },
  guideH: { fontFamily: font.display, fontSize: 32 },
  step: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: font.heavy, fontSize: 14 },
  stepText: { flex: 1, fontFamily: font.body, fontSize: 16 },
});
