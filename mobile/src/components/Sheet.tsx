import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/theme/tokens";

/**
 * Bottom sheet that slides up over the screen and slides down to close.
 * `tone="dark"` is the wine/plum result sheet; `tone="light"` is the page-coloured mood/install sheet.
 */
export function Sheet({ open, onClose, tone = "dark", children }: { open: boolean; onClose: () => void; tone?: "dark" | "light"; children: ReactNode }) {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(1);

  useEffect(() => {
    if (open) {
      setMounted(true);
      y.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      y.value = withTiming(1, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: `${y.value * 100}%` }] }));
  const scrim = useAnimatedStyle(() => ({ opacity: 1 - y.value }));
  if (!mounted) return null;

  const bg = tone === "dark" ? c.plum : c.bg;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={st.dock} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[st.sheet, { backgroundColor: bg, paddingBottom: ins.bottom + 22, paddingLeft: Math.max(22, ins.left), paddingRight: Math.max(22, ins.right) }, sheet]}
        >
          {tone === "dark" && <View style={[StyleSheet.absoluteFill, st.wash, { backgroundColor: c.wine }]} pointerEvents="none" />}
          <View style={[st.grab, { backgroundColor: tone === "dark" ? c.onAccent + "66" : c.line }]} />
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  sheet: { width: "100%", maxWidth: 440, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12, gap: 12, overflow: "hidden" },
  wash: { opacity: 0.55, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  grab: { width: 40, height: 5, borderRadius: 9, alignSelf: "center", marginBottom: 8 },
});
