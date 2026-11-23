// One-line notice on first open: anonymous game stats are on, and how to switch them off.
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { closeAnalyticsNotice, setAnalytics, useAnalytics } from "@/lib/track";
import { font, useColors } from "@/theme/tokens";

export function AnalyticsNotice() {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const { loaded, noticeSeen } = useAnalytics();
  if (!loaded || noticeSeen) return null;
  return (
    <Animated.View entering={FadeInDown.delay(1200).duration(300)} exiting={FadeOutDown} pointerEvents="box-none"
      style={[st.wrap, { bottom: ins.bottom + 12 }]}>
      <View style={[st.box, { backgroundColor: c.surface, borderColor: c.line, shadowColor: c.plum }]} accessibilityRole="alert">
        <Text style={[st.text, { color: c.ink }]}>
          We count anonymous game stats (like which cards get skipped) to make the cards better. No names, no messages.
        </Text>
        <View style={st.row}>
          <Pressable onPress={() => setAnalytics(false)} hitSlop={8} accessibilityRole="button">
            <Text style={[st.off, { color: c.muted }]}>Turn off</Text>
          </Pressable>
          <Pressable onPress={closeAnalyticsNotice} style={[st.ok, { backgroundColor: c.wine }]} accessibilityRole="button">
            <Text style={[st.okText, { color: c.onAccent }]}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, alignItems: "center" },
  box: { width: "100%", maxWidth: 440, borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 10, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  text: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 18 },
  off: { fontFamily: font.semibold, fontSize: 14 },
  ok: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 22 },
  okText: { fontFamily: font.heavy, fontSize: 14 },
});
