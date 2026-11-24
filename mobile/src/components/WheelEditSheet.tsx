// "Edit wedges": remove any wedge, add your own, or go back to the original. 2 to 16 wedges.
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { MAX_WEDGES, MIN_WEDGES, labelFor } from "@/game/ownWheel";
import type { Wedge } from "@/game/types";
import { wedgeText } from "@/game/wheel";
import { font, useColors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { Btn, Fine } from "./ui";

type Props = { open: boolean; onClose: () => void; wedges: Wedge[]; heat: number; edited: boolean; onSave: (w: Wedge[] | null) => void };

export function WheelEditSheet({ open, onClose, wedges, heat, edited, onSave }: Props) {
  const c = useColors();
  const [list, setList] = useState<Wedge[]>(wedges);
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  useEffect(() => { if (open) { setList(wedges); setText(""); setLabel(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = () => {
    const t = text.trim();
    if (!t || list.length >= MAX_WEDGES) return;
    setList([...list, [(label.trim() || labelFor(t)).slice(0, 16), [t], { own: true }]]);
    setText(""); setLabel("");
  };
  const remove = (i: number) => list.length > MIN_WEDGES && setList(list.filter((_, k) => k !== i));
  const save = () => { onSave(list); onClose(); };
  const input = [st.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }];

  return (
    <Sheet open={open} onClose={onClose} tone="light">
      <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">Edit sections</Text>
      <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 6 }}>
        {list.map((w, i) => (
          <View key={i} style={[st.row, { borderColor: c.line, backgroundColor: c.surface }]}>
            <View style={{ flex: 1 }}>
              <Text style={[st.label, { color: c.ink }]}>{w[0]}{w[2]?.w && w[2].w < 1 ? "  (thin, rare)" : ""}</Text>
              <Text style={[st.text, { color: c.muted }]} numberOfLines={2}>{wedgeText(w[1], heat)}</Text>
            </View>
            <Pressable onPress={() => remove(i)} disabled={list.length <= MIN_WEDGES} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${w[0]}`}
              style={[st.x, { borderColor: c.line, opacity: list.length <= MIN_WEDGES ? 0.3 : 1 }]}>
              <Text style={{ color: c.ink, fontFamily: font.heavy, fontSize: 15 }}>×</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      {list.length < MAX_WEDGES ? (
        <View style={{ gap: 6 }}>
          <TextInput value={text} onChangeText={setText} placeholder="Add a section: what to do" placeholderTextColor={c.muted} maxLength={220} style={input} onSubmitEditing={add} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={label} onChangeText={setLabel} placeholder="Short name (optional)" placeholderTextColor={c.muted} maxLength={16} style={[input, { flex: 1 }]} onSubmitEditing={add} />
            <Pressable onPress={add} accessibilityRole="button" style={[st.add, { backgroundColor: text.trim() ? c.rose : c.line }]}>
              <Text style={{ color: c.onAccent, fontFamily: font.heavy, fontSize: 15 }}>Add</Text>
            </Pressable>
          </View>
        </View>
      ) : <Fine>That's the most a wheel can hold ({MAX_WEDGES}).</Fine>}
      <Btn label={`Use these ${list.length} sections`} onPress={save} />
      {edited && <Btn kind="quiet" label="Back to the original sections" onPress={() => { onSave(null); onClose(); }} />}
    </Sheet>
  );
}

const st = StyleSheet.create({
  h: { fontFamily: font.display, fontSize: 30, lineHeight: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  label: { fontFamily: font.semibold, fontSize: 14 },
  text: { fontFamily: font.body, fontSize: 13 },
  x: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  input: { fontFamily: font.body, fontSize: 15, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  add: { borderRadius: 12, paddingHorizontal: 18, justifyContent: "center" },
});
