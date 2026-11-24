// "Where did you find us?": asked once, right after someone creates an account.
// Catches people who typed the address without a post's short link, so the Excel "Found via" sheet
// can show which platform brings players. Only the chosen option is stored (no free text).
import { StyleSheet, Text, View } from "react-native";
import { create } from "zustand";

import { track } from "@/lib/track";
import { font, useColors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { Btn, Chip } from "./ui";

const OPTIONS = [
  ["tiktok", "TikTok"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"],
  ["friend", "A friend"], ["search", "Google / search"], ["other", "Somewhere else"],
] as const;

const useFoundVia = create<{ open: boolean }>(() => ({ open: false }));

/** Called once a brand-new account has signed in. */
export function askFoundVia() {
  setTimeout(() => useFoundVia.setState({ open: true }), 1200); // after the sign-in screen has moved on
}

export function FoundVia() {
  const c = useColors();
  const open = useFoundVia((s) => s.open);
  const close = () => useFoundVia.setState({ open: false });
  const pick = (found: string) => { track("found_via", { found }); close(); };

  return (
    <Sheet open={open} onClose={close} tone="light">
      <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">Welcome in! One quick question</Text>
      <Text style={[st.body, { color: c.muted }]}>Where did you find Midnight Vibes?</Text>
      <View style={st.chips}>
        {OPTIONS.map(([id, label]) => <Chip key={id} label={label} onPress={() => pick(id)} />)}
      </View>
      <Btn kind="quiet" label="Skip" onPress={close} />
    </Sheet>
  );
}

const st = StyleSheet.create({
  h: { fontFamily: font.display, fontSize: 26, textAlign: "center" },
  body: { fontFamily: font.body, fontSize: 15, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginVertical: 6 },
});
