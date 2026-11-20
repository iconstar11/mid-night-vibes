import { StyleSheet, Text, View } from "react-native";

import { useRoom } from "@/lib/room";
import { font, useColors } from "@/theme/tokens";

/** Small "LIVE · 3" badge in game headers while hosting a room. */
export function LiveBadge() {
  const c = useColors();
  const role = useRoom((r) => r.role);
  const status = useRoom((r) => r.status);
  const viewers = useRoom((r) => r.viewers);
  if (role !== "host" || status !== "live") return null;
  return (
    <View style={[st.badge, { backgroundColor: c.rose }]} accessibilityLabel={`Live room, ${viewers} watching`}>
      <View style={[st.dot, { backgroundColor: c.onAccent }]} />
      <Text style={[st.text, { color: c.onAccent }]}>LIVE · {viewers}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, alignSelf: "center", marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: font.heavy, fontSize: 10, letterSpacing: 1 },
});
