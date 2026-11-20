import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useGame } from "@/state/store";
import { font, useColors } from "@/theme/tokens";
import { Btn, Fine, Screen, Title } from "./ui";

/** The gate itself, also shown to people who open a live-room link. */
export function GateView({ onConfirm, lead }: { onConfirm: () => void; lead?: string }) {
  const c = useColors();
  const confirm = useGame((g) => g.confirmAdult);
  const [blocked, setBlocked] = useState(false);

  if (blocked)
    return (
      <Screen>
        <Title>Come back when you're 18.</Title>
        <Text style={[st.lead, { color: c.muted }]}>Midnight Vibes is for adults only.</Text>
      </Screen>
    );

  return (
    <Screen>
      <View style={[st.seal, { borderColor: c.brass }]}><Text style={[st.sealText, { color: c.brass }]}>18+</Text></View>
      <Text style={[st.mark, { color: c.ink }]} accessibilityRole="header">
        Midnight{"\n"}<Text style={{ color: c.wine, fontFamily: font.displayItalic }}>Vibes</Text>
      </Text>
      <Text style={[st.lead, { color: c.muted }]}>{lead ?? "Party games for couples and friends. Truth or Dare and Spin the Wheel, tailored to your mood."}</Text>
      <View style={{ marginTop: "auto", gap: 6 }}>
        <Btn label="I'm 18 or older" onPress={() => { confirm(); onConfirm(); }} />
        <Btn kind="quiet" label="I'm under 18" onPress={() => setBlocked(true)} />
        <Fine>For consenting adults. Every dare is optional.</Fine>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  seal: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: "8%" },
  sealText: { fontFamily: font.heavy, letterSpacing: 0.6 },
  mark: { fontFamily: font.display, fontSize: 72, lineHeight: 68 },
  lead: { fontFamily: font.body, fontSize: 17, lineHeight: 25, maxWidth: 320 },
});
