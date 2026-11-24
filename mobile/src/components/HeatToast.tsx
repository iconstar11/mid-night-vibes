// "The heat is rising: Steamy ●●○" with Undo, shown for a few seconds after the heat moves up on its own.
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGame } from "@/state/store";
import { FLAMES, HEAT_NAMES, font, useColors } from "@/theme/tokens";
import { Icon } from "./SettingsList";

// Under the game header (back, sound, heat), so it never covers those buttons
const SHOW_MS = 6000;

export function HeatToast() {
  const c = useColors();
  const ins = useSafeAreaInsets();
  const note = useGame((g) => g.riseNote);
  const undo = useGame((g) => g.undoRise);
  const dismiss = useGame((g) => g.dismissRiseNote);
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(dismiss, Math.max(0, note.at + SHOW_MS - Date.now()));
    return () => clearTimeout(t);
  }, [note, dismiss]);
  if (!note) return null;

  return (
    <View style={[st.dock, { top: ins.top + 68 }]} pointerEvents="box-none">
      <Animated.View entering={FadeInUp.duration(260)} exiting={FadeOutUp.duration(200)} accessibilityLiveRegion="polite"
        style={[st.toast, { backgroundColor: c.plum, borderColor: c.brass + "66", boxShadow: `0 14px 32px ${c.plum}88` }]}>
        <View style={[st.tile, { backgroundColor: c.rose }]}><Icon name="flame" color="#FFF5F3" size={17} width={2} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.kicker, { color: c.brass }]}>THE HEAT IS RISING</Text>
          <Text style={[st.text, { color: c.onAccent }]} numberOfLines={1}>
            {HEAT_NAMES[note.to - 1]} <Text style={{ color: c.rose, fontSize: 11, letterSpacing: 1.5 }}>{FLAMES[note.to - 1]}</Text>
          </Text>
        </View>
        <Pressable onPress={undo} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Undo, back to ${HEAT_NAMES[note.from - 1]}`}
          style={[st.undo, { borderColor: c.onAccent + "55" }]}>
          <Text style={[st.undoText, { color: c.onAccent }]}>Undo</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const st = StyleSheet.create({
  dock: { position: "absolute", left: 0, right: 0, alignItems: "center", paddingHorizontal: 18, zIndex: 20 },
  toast: { width: "100%", maxWidth: 440, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 20, borderCurve: "continuous", paddingVertical: 10, paddingLeft: 10, paddingRight: 12 },
  tile: { width: 36, height: 36, borderRadius: 11, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  kicker: { fontFamily: font.heavy, fontSize: 10, letterSpacing: 1.4 },
  text: { fontFamily: font.display, fontSize: 22, lineHeight: 27 },
  undo: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  undoText: { fontFamily: font.heavy, fontSize: 13 },
});
