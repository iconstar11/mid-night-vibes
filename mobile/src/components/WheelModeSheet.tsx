// Wheel settings (the ⚙ button, and shown the first time Misfortune is picked): pick a wheel, drinks in Misfortune,
// editing the wedges, and the heat of wedges added to a short pasted list. Same grouped style as Account.
import { Pressable, StyleSheet, Text, View } from "react-native";

import { setPrefs, usePrefs, type WheelMode } from "@/lib/prefs";
import { useGame } from "@/state/store";
import { font, useColors } from "@/theme/tokens";
import { Icon, Row, Section, Toggle } from "./SettingsList";
import { Sheet } from "./Sheet";
import { Seg } from "./ui";

export const FILL_HEATS: ["1" | "2" | "3", string][] = [["1", "Flirty"], ["2", "Steamy"], ["3", "Spicy"]];

type Props = { open: boolean; onClose: () => void; onEditWedges?: () => void; edited?: boolean; filled?: boolean };

const WHEELS: { id: WheelMode; title: string; body: string }[] = [
  { id: "spin", title: "Spin the Wheel", body: "Lucky spins: kisses, dances, sweet dares. Bolder with the heat." },
  { id: "misfortune", title: "Wheel of Misfortune", body: "Bad luck forfeits: lemon, chilli, ice. Anyone can skip, and every forfeit says when to stop." },
];

export function WheelModeSheet({ open, onClose, onEditWedges, edited, filled }: Props) {
  const c = useColors();
  const mode = usePrefs((p) => p.wheelMode);
  const drinks = usePrefs((p) => p.drinks);
  const fillHeat = usePrefs((p) => p.fillHeat);
  const setFillHeat = useGame((g) => g.setFillHeat);
  const close = () => { setPrefs({ misfortuneSeen: true }); onClose(); };
  const choose = (m: WheelMode) => { setPrefs({ wheelMode: m, misfortuneSeen: true }); onClose(); };

  return (
    <Sheet open={open} onClose={close} tone="light">
      <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">Wheel settings</Text>

      <View style={st.wheels} accessibilityRole="radiogroup">
        {WHEELS.map((w) => {
          const on = w.id === mode;
          return (
            <Pressable key={w.id} onPress={() => choose(w.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={({ pressed }) => [st.wheel, {
                backgroundColor: c.surface, borderColor: on ? c.rose : c.line,
                boxShadow: on ? `0 10px 24px ${c.rose}33` : "none", transform: [{ scale: pressed ? 0.98 : 1 }],
              }]}>
              <View style={st.wheelHead}>
                <Text style={[st.wheelTitle, { color: c.ink }]}>{w.title}</Text>
                <View style={[st.radio, { borderColor: on ? c.rose : c.line, backgroundColor: on ? c.rose : "transparent" }]}>
                  {on && <Icon name="check" color="#FFF5F3" size={12} width={3} />}
                </View>
              </View>
              <Text style={[st.wheelBody, { color: c.muted }]}>{w.body}</Text>
            </Pressable>
          );
        })}
      </View>

      <Section>
        <Row icon="glass" tint={c.wine} title="Drinks in Misfortune" detail="Adds sip forfeits. Water or juice works too."
          right={<Toggle value={drinks} onChange={(v) => setPrefs({ drinks: v })} label="Drinks in Wheel of Misfortune" />} />
        {onEditWedges && (
          <Row icon="edit" tint={c.plum} title="Edit sections" detail={edited ? "Your edited sections are in use" : "Add, remove or change sections"} onPress={onEditWedges} />
        )}
        <Row icon="flame" tint={c.rose} title="Heat of added sections"
          detail={filled ? "Your list was short, so we added some. This sets how bold they are." : "Used when you paste fewer than 6 dares."}
          below={<Seg<"1" | "2" | "3"> value={String(fillHeat ?? 2) as "1" | "2" | "3"} onChange={(v) => setFillHeat(Number(v) as 1 | 2 | 3)} accent={c.rose} options={FILL_HEATS} />} />
      </Section>

      <Pressable onPress={close} accessibilityRole="button" style={[st.done, { backgroundColor: c.wine }]}>
        <Text style={[st.doneText, { color: c.onAccent }]}>Done</Text>
      </Pressable>
    </Sheet>
  );
}

const st = StyleSheet.create({
  h: { fontFamily: font.display, fontSize: 30, lineHeight: 36 },
  wheels: { gap: 10 },
  wheel: { borderWidth: 1.5, borderRadius: 20, borderCurve: "continuous", paddingVertical: 12, paddingHorizontal: 16, gap: 3 },
  wheelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  wheelTitle: { fontFamily: font.semibold, fontSize: 16.5 },
  wheelBody: { fontFamily: font.body, fontSize: 13.5, lineHeight: 19 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  done: { borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  doneText: { fontFamily: font.semibold, fontSize: 16.5 },
});
