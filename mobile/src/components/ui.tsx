import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { setPrefs, usePrefs } from "@/lib/prefs";
import { play } from "@/lib/sound";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/state/store";
import { LiveBadge } from "./LiveBadge";
import { FLAMES, HEAT_NAMES, font, useColors } from "@/theme/tokens";

/** Phone-width column with safe-area padding. Scrolls when `scroll` is set. */
export function Screen({ children, scroll, style }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const pad = { paddingTop: ins.top + 18, paddingBottom: ins.bottom + 22, paddingLeft: Math.max(18, ins.left), paddingRight: Math.max(18, ins.right) };
  const inner = <View style={[s.column, style]}>{children}</View>;
  return (
    <View style={[s.fill, { backgroundColor: c.bg }]}>
      <LinearGradient colors={[c.rose + "44", c.bg + "00"]} style={s.glow} pointerEvents="none" />
      {scroll ? (
        <ScrollView contentContainerStyle={[s.grow, pad]} keyboardShouldPersistTaps="handled">{inner}</ScrollView>
      ) : (
        <View style={[s.fill, pad]}>{inner}</View>
      )}
    </View>
  );
}

/** Pressable that shrinks a little while pressed. */
export function Press({ style, scale = 0.97, children, ...rest }: PressableProps & { style?: StyleProp<ViewStyle>; scale?: number; children: ReactNode }) {
  const v = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: v.value }] }));
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => { v.value = withTiming(scale, { duration: 90 }); rest.onPressIn?.(e); }}
      onPressOut={(e) => { v.value = withTiming(1, { duration: 140 }); rest.onPressOut?.(e); }}
    >
      <Animated.View style={[style, a, rest.disabled ? { opacity: 0.55 } : null]}>{children}</Animated.View>
    </Pressable>
  );
}

export function Btn({ label, onPress, kind = "primary", disabled }: { label: string; onPress: () => void; kind?: "primary" | "quiet"; disabled?: boolean }) {
  const c = useColors();
  if (kind === "quiet")
    return (
      <Pressable onPress={onPress} style={s.quiet} accessibilityRole="button">
        <Text style={[s.quietText, { color: c.muted }]}>{label}</Text>
      </Pressable>
    );
  return (
    <Press onPress={onPress} disabled={disabled} scale={0.98} style={[s.btn, { backgroundColor: c.wine, shadowColor: c.wine }]} accessibilityRole="button">
      <Text style={[s.btnText, { color: c.onAccent }]}>{label}</Text>
    </Press>
  );
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[s.title, { color: c.ink }, style]} accessibilityRole="header">{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[s.label, { color: c.muted }]}>{children}</Text>;
}

export function Fine({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[s.fine, { color: c.muted }, style]}>{children}</Text>;
}

/** Row of pill options; the selected one is filled. */
export function Seg<T extends string>({ options, value, onChange, accent }: { options: [T, string][]; value: T; onChange: (v: T) => void; accent?: string }) {
  const c = useColors();
  const on = accent ?? c.ink;
  return (
    <View style={s.seg} accessibilityRole="radiogroup">
      {options.map(([v, label]) => {
        const sel = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
            style={[s.segBtn, { borderColor: sel ? on : c.line, backgroundColor: sel ? on : c.surface }]}>
            <Text style={[s.segText, { color: sel ? (accent ? c.onAccent : c.bg) : c.muted }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, onPress, selected }: { label: string; onPress: () => void; selected?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }} style={[s.chip, { borderColor: selected ? c.ink : c.line, backgroundColor: selected ? c.ink : c.surface }]}>
      <Text style={[s.chipText, { color: selected ? c.bg : c.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** Round icon button. `icon="back"` draws a chevron (a text "‹" sits on the baseline and never looks centred). */
export function RoundBtn({ label, icon, onPress, a11y }: { label?: string; icon?: "back"; onPress: () => void; a11y: string }) {
  const c = useColors();
  return (
    <Press onPress={onPress} scale={0.92} style={[s.round, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityLabel={a11y} accessibilityRole="button">
      {icon === "back" ? (
        // Nudged 1px right: a left-pointing chevron looks off-centre when it's mathematically centred
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ marginLeft: 1 }}>
          <Path d="M15 5 8 12l7 7" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <Text style={[s.roundText, { color: c.ink }]}>{label}</Text>
      )}
    </Press>
  );
}

/** Game header: back, whose turn, heat pill (tap cycles the heat). */
/** Speaker button on the game screens: sounds on/off (saved on the device, works for guests). */
export function SoundToggle() {
  const c = useColors();
  const on = usePrefs((p) => p.sound);
  return (
    <Pressable onPress={() => { setPrefs({ sound: !on }); if (!on) play("done", { force: true }); }} hitSlop={6}
      accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={on ? "Sounds on. Tap to mute" : "Sounds off. Tap to turn on"}
      style={[s.sound, { borderColor: c.line, backgroundColor: c.surface }]}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={c.ink} />
        {on ? (
          <Path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" stroke={c.ink} strokeWidth={2} strokeLinecap="round" />
        ) : (
          <Path d="M16 9.5l5 5M21 9.5l-5 5" stroke={c.rose} strokeWidth={2} strokeLinecap="round" />
        )}
      </Svg>
    </Pressable>
  );
}

export function GameBar({ game, who }: { game: string; who: string }) {
  const c = useColors();
  const heat = useGame((g) => g.heat);
  const setHeat = useGame((g) => g.setHeat);
  return (
    <View style={s.bar}>
      <RoundBtn icon="back" a11y="Back to games" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />
      <View style={s.turn}>
        <Text style={[s.turnSmall, { color: c.muted }]}>{game}</Text>
        <Text style={[s.turnBig, { color: c.ink }]} numberOfLines={1}>{who}</Text>
        <LiveBadge />
      </View>
      <SoundToggle />
      <Pressable onPress={() => setHeat(((heat % 3) + 1) as 1 | 2 | 3)} accessibilityLabel="Change heat level"
        style={[s.heatPill, { borderColor: c.line, backgroundColor: c.surface }]}>
        <Text style={[s.heatPillText, { color: c.ink }]}>{HEAT_NAMES[heat - 1]} </Text>
        <Text style={{ color: c.rose, fontSize: 10, letterSpacing: 1 }}>{FLAMES[heat - 1]}</Text>
      </Pressable>
    </View>
  );
}

export const s = StyleSheet.create({
  fill: { flex: 1 },
  grow: { flexGrow: 1 },
  glow: { position: "absolute", left: 0, right: 0, top: 0, height: 360 },
  column: { flex: 1, width: "100%", maxWidth: 440, alignSelf: "center", gap: 18 },
  btn: { borderRadius: 999, paddingVertical: 16, paddingHorizontal: 22, alignItems: "center", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  btnText: { fontFamily: font.semibold, fontSize: 17 },
  quiet: { padding: 12, alignItems: "center" },
  quietText: { fontFamily: font.body, fontSize: 16, textDecorationLine: "underline" },
  title: { fontFamily: font.display, fontSize: 42, lineHeight: 44, marginTop: 20 },
  label: { fontFamily: font.semibold, fontSize: 12.5, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  fine: { fontFamily: font.body, fontSize: 13.5, textAlign: "center" },
  seg: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  segBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  segText: { fontFamily: font.semibold, fontSize: 14 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  chipText: { fontFamily: font.body, fontSize: 15 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  roundText: { fontSize: 22, lineHeight: 26 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 44 },
  turn: { flex: 1, alignItems: "center", minWidth: 0 },
  turnSmall: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  turnBig: { fontFamily: font.display, fontSize: 26, lineHeight: 30 },
  sound: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  heatPill: { height: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, flexDirection: "row", alignItems: "center" },
  heatPillText: { fontFamily: font.semibold, fontSize: 14.5 },
});
