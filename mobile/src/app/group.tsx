import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AdultOnly } from "@/components/Guard";
import { Press, Screen, Title } from "@/components/ui";
import type { GroupId } from "@/game/types";
import { useGame } from "@/state/store";
import { font, mix, useColors, type Colors } from "@/theme/tokens";

const TILES: { id: GroupId; name: string; sub: string; sym: string; wide?: boolean; row?: boolean; colors: (c: Colors) => [string, string] }[] = [
  { id: "couple", name: "Couple", sub: "Just the two of you", sym: "♡", wide: true, colors: (c) => [c.wine, c.plum] },
  { id: "friends", name: "Friends", sub: "A mixed group", sym: "✦", colors: (c) => [c.brass, mix(c.brass, c.wine, 0.45)] },
  { id: "girls", name: "Girls' night", sub: "The girls only", sym: "❀", colors: (c) => [c.rose, c.wine] },
  { id: "boys", name: "Boys' night", sub: "The lads only", sym: "◆", wide: true, row: true, colors: (c) => [c.plum, mix(c.plum, "#000000", 0.4)] },
];

export default function Group() {
  return <AdultOnly><Tiles /></AdultOnly>;
}

function Tiles() {
  const c = useColors();
  const setGroup = useGame((g) => g.setGroup);
  const pick = (id: GroupId) => {
    setGroup(id);
    router.push(id === "couple" ? "/couple" : "/players");
  };
  return (
    <Screen scroll>
      <Title>Who's playing tonight?</Title>
      <View style={st.grid}>
        {TILES.map((t, i) => (
          <Animated.View key={t.id} entering={FadeInDown.delay(i * 60).duration(420)} style={t.wide ? st.wide : st.half}>
            <Press onPress={() => pick(t.id)} scale={0.96} style={st.tileWrap} accessibilityRole="button" accessibilityLabel={t.name}>
              <LinearGradient colors={t.colors(c)} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={[st.tile, t.row ? st.row : null, t.id === "couple" ? { minHeight: 150 } : null]}>
                <View style={[st.bubble, { backgroundColor: c.onAccent + "1C" }]} />
                <Text style={[st.sym, { color: c.onAccent }]}>{t.sym}</Text>
                <View>
                  <Text style={[st.name, { color: c.onAccent }]}>{t.name}</Text>
                  <Text style={[st.sub, { color: c.onAccent }]}>{t.sub}</Text>
                </View>
              </LinearGradient>
            </Press>
          </Animated.View>
        ))}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  wide: { width: "100%" },
  half: { width: "47.9%", flexGrow: 1 },
  tileWrap: { borderRadius: 26, overflow: "hidden" },
  tile: { borderRadius: 26, padding: 18, minHeight: 168, justifyContent: "space-between", overflow: "hidden" },
  row: { minHeight: 0, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 16 },
  bubble: { position: "absolute", width: 130, height: 130, borderRadius: 65, right: -44, top: -44 },
  sym: { fontFamily: font.display, fontSize: 38, lineHeight: 42 },
  name: { fontFamily: font.display, fontSize: 28, lineHeight: 30 },
  sub: { fontFamily: font.body, fontSize: 13.5, opacity: 0.85, marginTop: 4 },
});
