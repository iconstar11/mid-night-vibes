import { LinearGradient } from "expo-linear-gradient";
import { useRef, type ReactNode } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";

import type { CardType } from "@/game/types";
import { easeIn, easeOut, to, wait } from "@/lib/anim";
import { GlossText } from "./GlossText";
import { font, useColors } from "@/theme/tokens";

export const cardLabel = (t: CardType) => (t === "truth" ? "Truth" : "Dare");

/** Type size for a card or wheel result: long dares (AI or pasted) get smaller type so they fit on the card,
 *  narrow phones a little smaller again. Line height is 1.2x so letters like g, y, p aren't clipped. */
export function cardTextSize(text: string, width: number, big = 34) {
  const n = text.length;
  let size = n <= 50 ? big : n <= 90 ? big - 4 : n <= 130 ? big - 8 : n <= 180 ? big - 11 : big - 14;
  if (width < 380) size -= 2;
  return { fontSize: size, lineHeight: Math.round(size * 1.2) };
}

/** Card motion shared by the host's game and live-room viewers: flip, Random shuffle, fly out / rise in. */
export function useCardMotion() {
  const reduce = useReducedMotion();
  const width = useRef(360);
  const flipY = useSharedValue(0);
  const x = useSharedValue(0);
  const rot = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ perspective: 1200 }, { translateX: x.value }, { translateY: y.value }, { rotate: `${rot.value}deg` }, { rotateY: `${flipY.value}deg` }, { scale: scale.value }],
  }));

  async function flip(change: () => void) {
    await to(flipY, 90, { duration: 170, easing: easeIn }, reduce);
    change();
    flipY.value = reduce ? 0 : -90;
    await to(flipY, 0, { duration: 240, easing: easeOut }, reduce);
  }

  /** Alternates "Truth…"/"Dare…" with slowing wobbles, ending on `type`. */
  async function shuffle(type: CardType, show: (text: string) => void) {
    const other: CardType = type === "truth" ? "dare" : "truth";
    const steps = reduce ? 1 : 11 + (type === "dare" ? 1 : 0);
    for (let i = 0; i < steps; i++) {
      show(cardLabel((steps - 1 - i) % 2 === 0 ? type : other) + "…");
      if (!reduce) {
        y.value = -6; rot.value = i % 2 ? 1.5 : -1.5;
        to(y, 0, { duration: 110 }); to(rot, 0, { duration: 110 });
      }
      await wait(reduce ? 0 : 60 + i * i * 3.2);
    }
  }

  /** Card flies off to the left; `between` swaps the content; the next card rises in. */
  async function next(between: () => void) {
    await Promise.all([
      to(x, -width.current * 1.15, { duration: 340, easing: easeIn }, reduce),
      to(rot, -14, { duration: 340, easing: easeIn }, reduce),
      to(opacity, 0, { duration: 340, easing: easeIn }, reduce),
    ]);
    between();
    x.value = 0; rot.value = 0; y.value = reduce ? 0 : 26; scale.value = reduce ? 1 : 0.94;
    await Promise.all([
      to(opacity, 1, { duration: 320, easing: easeOut }, reduce),
      to(y, 0, { duration: 320, easing: easeOut }, reduce),
      to(scale, 1, { duration: 320, easing: easeOut }, reduce),
    ]);
  }

  return { style, flip, shuffle, next, reduce, onLayout: (w: number) => { width.current = w; } };
}

type FaceProps = {
  motion: ReturnType<typeof useCardMotion>;
  who: string;
  text: string;
  kind: string;
  shuffling?: boolean;
  children?: ReactNode; // Skip / Done on the host's card
};

/** The stacked deck with the wine/plum card on top. */
export function CardFace({ motion, who, text, kind, shuffling, children }: FaceProps) {
  const c = useColors();
  const { width } = useWindowDimensions();
  const fit = cardTextSize(text, width);
  return (
    <View style={st.deck} onLayout={(e) => motion.onLayout(e.nativeEvent.layout.width)}>
      <View style={[st.behind, st.behind2, { backgroundColor: c.rose }]} />
      <View style={[st.behind, st.behind1, { backgroundColor: c.rose }]} />
      <Animated.View style={[st.card, { shadowColor: c.plum }, motion.style]} accessibilityLiveRegion="polite">
        <LinearGradient colors={[c.wine, c.plum]} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={[st.who, { color: c.onAccent }]}>{who}</Text>
        {shuffling
          ? <Text style={[st.text, fit, { fontFamily: font.displayItalic, color: c.brass }]}>{text}</Text>
          : <GlossText text={text} color={c.onAccent} box={st.textBox} style={[st.text, fit, { color: c.onAccent, marginVertical: 0 }]} />}
        <Text style={[st.kind, { color: c.brass }]}>{kind}</Text>
        {children}
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  deck: { flex: 1, minHeight: 250, marginTop: 14 },
  behind: { position: "absolute", borderRadius: 30 },
  behind2: { left: 22, right: 22, top: -14, bottom: 14, opacity: 0.25 },
  behind1: { left: 11, right: 11, top: -7, bottom: 7, opacity: 0.5 },
  card: { flex: 1, borderRadius: 30, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 20, overflow: "hidden", shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 22 }, elevation: 8, backfaceVisibility: "hidden" },
  who: { fontFamily: font.semibold, fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8, textAlign: "center" },
  text: { fontFamily: font.display, fontSize: 34, lineHeight: 38, textAlign: "center", marginVertical: "auto" },
  kind: { fontFamily: font.heavy, fontSize: 12.5, letterSpacing: 1.8, textTransform: "uppercase", textAlign: "center" },
  textBox: { marginVertical: "auto" },
});
