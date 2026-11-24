// Card text with uncommon words underlined (dotted): tap one to see what it means, tap again to hide.
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { glossParts } from "@/game/glossary";
import { font } from "@/theme/tokens";

export function GlossText({ text, style, color, box }: { text: string; style?: StyleProp<TextStyle>; color: string; box?: StyleProp<ViewStyle> }) {
  const [open, setOpen] = useState<{ word: string; meaning: string } | null>(null);
  useEffect(() => setOpen(null), [text]);
  const parts = glossParts(text);
  return (
    <View style={box}>
      <Text style={style}>
        {parts.map((p, i) =>
          typeof p === "string" ? p : (
            <Text key={i} onPress={() => setOpen(open?.word === p.word ? null : p)} accessibilityRole="button"
              accessibilityLabel={`${p.word}: ${p.meaning}`} style={st.word}>
              {p.word}
            </Text>
          ),
        )}
      </Text>
      {open && (
        <Text style={[st.meaning, { color, borderColor: color + "55" }]} accessibilityLiveRegion="polite" onPress={() => setOpen(null)}>
          <Text style={{ fontFamily: font.heavy }}>{open.word}</Text>: {open.meaning}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  word: {
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    ...(Platform.OS === "web" ? ({ textUnderlineOffset: 5, textDecorationThickness: 2, cursor: "help" } as object) : null),
  },
  meaning: { fontFamily: font.body, fontSize: 14.5, lineHeight: 20, textAlign: "center", borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12, marginTop: 4, alignSelf: "center" },
});
