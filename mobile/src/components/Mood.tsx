import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { router, usePathname } from "expo-router";

import { GROUPS } from "@/game/content";
import { aiAllowance, refreshAccount, useAuth } from "@/lib/auth";
import { savePending } from "@/lib/pending";
import { useGame, type AiState } from "@/state/store";
import { font, useColors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { Btn, Chip, Fine } from "./ui";

/** The brass ✦, twinkling while the AI is writing. */
export function Spark({ size = 16, color }: { size?: number; color?: string }) {
  const c = useColors();
  const state = useGame((g) => g.ai.state);
  const v = useSharedValue(1);
  useEffect(() => {
    if (state === "loading") v.value = withRepeat(withTiming(0.55, { duration: 500 }), -1, true);
    else { cancelAnimation(v); v.value = withTiming(1); }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.7 + v.value * 0.3 }, { rotate: `${(1 - v.value) * 100}deg` }] }));
  return <Animated.Text style={[{ color: color ?? c.brass, fontSize: size, lineHeight: size * 1.1 }, a]}>✦</Animated.Text>;
}

export const moodTag = (s: AiState) => (s === "loading" ? "writing…" : s === "ready" ? "AI picks" : "built-in");

/** One bar under the header of each game. */
export function MoodBar({ onPress }: { onPress: () => void }) {
  const c = useColors();
  const mood = useGame((g) => g.mood);
  const state = useGame((g) => g.ai.state);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={mood ? `Mood: ${mood}. Change` : "Set a mood for AI picks"}
      style={[st.bar, { backgroundColor: c.surface, borderColor: mood ? c.brass + "99" : c.line }]}>
      <Spark />
      <Text style={[st.text, { color: c.ink }]} numberOfLines={1}>
        {mood ? mood + " " : "Set a mood "}
        <Text style={{ color: c.muted, fontFamily: font.body }}>{mood ? "· " + moodTag(state) : "for AI picks"}</Text>
      </Text>
      <Text style={[st.go, { color: c.rose }]}>{mood ? "Change" : "Set"}</Text>
    </Pressable>
  );
}

export function MoodSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const group = useGame((g) => g.group);
  const mood = useGame((g) => g.mood);
  const note = useGame((g) => g.ai.note);
  const limited = useGame((g) => g.ai.limited);
  const auth = useAuth();
  const { plan, email, limit } = auth;
  const setMood = useGame((g) => g.setMood);
  const [text, setText] = useState(mood);
  useEffect(() => { if (open) { setText(mood); refreshAccount(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const { left, period, next, unit } = aiAllowance(auth);
  const path = usePathname();
  const toAccount = () => { onClose(); router.push("/account"); };
  // Guests: remember the mood so it's set for them once they've signed in
  const signInFor = (m: string) => { savePending("mood", path, m); toAccount(); };

  const apply = (m: string) => { setMood(m); onClose(); };
  // Picking a mood is customizing with AI: guests go to sign in first
  const choose = (m: string) => (email ? apply(m) : signInFor(m));
  return (
    <Sheet open={open} onClose={onClose} tone="light">
      <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">What's the mood?</Text>
      <TextInput value={text} onChangeText={setText} onSubmitEditing={() => choose(text)} maxLength={200}
        autoFocus={Platform.OS === "web"} returnKeyType="done" placeholder="e.g. kissing, anniversary, getting to know you" placeholderTextColor={c.muted}
        style={[st.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }]} />
      <View style={st.chips}>
        {GROUPS[group].moods.map((m) => (
          <Chip key={m} label={m} selected={text.trim().toLowerCase() === m.toLowerCase()} onPress={() => { setText(m); choose(m); }} />
        ))}
      </View>
      {!email ? (
        // Guests: AI needs an account; the mood still steers the built-in cards
        <>
          <Fine style={{ textAlign: "left" }}>Customizing with AI needs a free account. Without one, the mood picks matching built-in cards.</Fine>
          <Btn label="Sign in to customize with AI" onPress={() => signInFor(text)} />
          <Btn kind="quiet" label="Use the built-in cards for this mood" onPress={() => apply(text)} />
        </>
      ) : (limited || !left) && plan !== "premium" ? (
        <>
          <Fine style={{ textAlign: "left" }}>{note || "AI writes new truths, dares and wheel wedges around it, at your heat level."}</Fine>
          <Text style={[st.left, { color: c.rose }]}>
            <Text style={{ color: c.brass }}>✦</Text> {next ? `Your next AI mood is ready on ${next}` : `You've used your ${limit} ${unit} ${period}`}
          </Text>
          <Btn label="See Premium" onPress={toAccount} />
          <Btn kind="quiet" label="Use the built-in cards for this mood" onPress={() => apply(text)} />
        </>
      ) : (
        <>
          <Fine style={{ textAlign: "left" }}>{note || "AI writes new truths, dares and wheel wedges around it, at your heat level."}</Fine>
          <Text style={[st.left, { color: c.muted }]}>
            <Text style={{ color: c.brass }}>✦</Text> {left} of {limit} {unit} left {period}
          </Text>
          <Btn label="Set the mood" onPress={() => apply(text)} />
        </>
      )}
      {!!mood && <Btn kind="quiet" label="Clear the mood" onPress={() => apply("")} />}
    </Sheet>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1.5 },
  text: { flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 15 },
  go: { fontFamily: font.heavy, fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase" },
  h: { fontFamily: font.display, fontSize: 32, lineHeight: 34 },
  input: { fontFamily: font.body, fontSize: 17, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  left: { fontFamily: font.semibold, fontSize: 14 },
});
