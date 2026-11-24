// Explains the two wheels (shown the first time Misfortune is picked, and from the ? button),
// with the Drinks switch for Misfortune.
import { StyleSheet, Text, View } from "react-native";

import { setPrefs, usePrefs, type WheelMode } from "@/lib/prefs";
import { font, useColors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { Btn, Fine, Label, Seg } from "./ui";

export function WheelModeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const mode = usePrefs((p) => p.wheelMode);
  const drinks = usePrefs((p) => p.drinks);
  const choose = (m: WheelMode) => { setPrefs({ wheelMode: m, misfortuneSeen: true }); onClose(); };

  return (
    <Sheet open={open} onClose={() => { setPrefs({ misfortuneSeen: true }); onClose(); }} tone="light">
      <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">Two wheels</Text>

      <View style={[st.card, { borderColor: mode === "spin" ? c.rose : c.line, backgroundColor: c.surface }]}>
        <Text style={[st.title, { color: c.ink }]}>Spin the Wheel</Text>
        <Text style={[st.body, { color: c.muted }]}>
          Lucky spins: a kiss, a compliment, a slow dance, a hot seat. The wedges get bolder with the heat.
        </Text>
      </View>

      <View style={[st.card, { borderColor: mode === "misfortune" ? c.rose : c.line, backgroundColor: c.surface }]}>
        <Text style={[st.title, { color: c.ink }]}>Wheel of Misfortune</Text>
        <Text style={[st.body, { color: c.muted }]}>
          Bad luck when it lands on you: a forfeit, like biting a lemon, eating chilli, a spank or an ice cube.
          Have chilli or hot sauce, a lemon and some ice nearby. Anyone can still skip, and every forfeit says when you can say stop.
        </Text>
      </View>

      <View>
        <Label>Drinks in Misfortune</Label>
        <Seg<"off" | "on"> value={drinks ? "on" : "off"} onChange={(v) => setPrefs({ drinks: v === "on" })} accent={c.rose}
          options={[["off", "No drinks"], ["on", "Include drinks"]]} />
        <Fine style={{ textAlign: "left", marginTop: 6 }}>Adds sip forfeits. Water or juice works just as well.</Fine>
      </View>

      <Btn label={mode === "misfortune" ? "Keep playing Misfortune" : "Play Wheel of Misfortune"} onPress={() => choose("misfortune")} />
      <Btn kind="quiet" label={mode === "spin" ? "Stay on Spin the Wheel" : "Back to Spin the Wheel"} onPress={() => choose("spin")} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  h: { fontFamily: font.display, fontSize: 32, lineHeight: 34 },
  card: { borderWidth: 1.5, borderRadius: 18, padding: 14, gap: 4 },
  title: { fontFamily: font.semibold, fontSize: 17 },
  body: { fontFamily: font.body, fontSize: 14.5, lineHeight: 21 },
});
