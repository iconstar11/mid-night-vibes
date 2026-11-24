import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { FAQ, HEADLINE, INTRO } from "@/lib/seo";
import { useGame } from "@/state/store";
import { font, useColors } from "@/theme/tokens";
import { LegalLinks } from "./LegalPage";
import { Btn, Fine, Screen, Title } from "./ui";

/** The gate itself, also shown to people who open a live-room link. With `about`, the welcome page also explains the
 *  app below the fold (a heading, intro and FAQ), so search engines and AI assistants have real text to read. */
export function GateView({ onConfirm, lead, about }: { onConfirm: () => void; lead?: string; about?: boolean }) {
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

  const gate = (
    <>
      <View style={[st.seal, { borderColor: c.brass }]}><Text style={[st.sealText, { color: c.brass }]}>18+</Text></View>
      <Text style={[st.mark, { color: c.ink }]} accessibilityRole={about ? undefined : "header"}>
        Midnight{"\n"}<Text style={{ color: c.wine, fontFamily: font.displayItalic }}>Vibes</Text>
      </Text>
      <Text style={[st.lead, { color: c.muted }]}>{lead ?? "Party games for couples and friends: Truth or Dare, Spin the Wheel and Wheel of Misfortune, tailored to your mood."}</Text>
      <View style={{ marginTop: "auto", gap: 6 }}>
        <Btn label="I'm 18 or older" onPress={() => { confirm(); onConfirm(); }} />
        <Btn kind="quiet" label="I'm under 18" onPress={() => setBlocked(true)} />
        <Fine>For consenting adults. Every dare is optional.</Fine>
        <LegalLinks />
      </View>
    </>
  );
  if (!about) return <Screen>{gate}</Screen>;

  return (
    <Screen scroll>
      {/* The gate fills the first screen; the explanation waits below it */}
      <View style={[st.first, { minHeight: FIRST_SCREEN }]}>{gate}</View>
      <View style={st.about}>
        <Text style={[st.kicker, { color: c.brass }]}>ABOUT MIDNIGHT VIBES</Text>
        <Text style={[st.h1, { color: c.ink }]} role="heading" aria-level={1}>{HEADLINE}</Text>
        <Text style={[st.p, { color: c.muted }]}>{INTRO}</Text>
      </View>
      <View style={st.about}>
        <Text style={[st.h2, { color: c.ink }]} role="heading" aria-level={2}>Questions</Text>
        {FAQ.map((f) => (
          <View key={f.q} style={[st.qa, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Text style={[st.q, { color: c.ink }]} role="heading" aria-level={3}>{f.q}</Text>
            <Text style={[st.p, { color: c.muted }]}>{f.a}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

// The first screen minus the page padding. A CSS height on the web, so the server-built HTML is already right.
const FIRST_SCREEN = (Platform.OS === "web" ? "calc(100svh - 40px)" : "92%") as `${number}%`;

const st = StyleSheet.create({
  seal: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: "8%" },
  sealText: { fontFamily: font.heavy, letterSpacing: 0.6 },
  mark: { fontFamily: font.display, fontSize: 72, lineHeight: 68 },
  lead: { fontFamily: font.body, fontSize: 17, lineHeight: 25, maxWidth: 320 },
  first: { gap: 18 },
  about: { gap: 12, paddingTop: 18 },
  kicker: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1.4 },
  h1: { fontFamily: font.display, fontSize: 34, lineHeight: 40 },
  h2: { fontFamily: font.display, fontSize: 28, lineHeight: 34 },
  qa: { borderWidth: 1, borderRadius: 20, borderCurve: "continuous", padding: 16, gap: 6 },
  q: { fontFamily: font.semibold, fontSize: 17, lineHeight: 23 },
  p: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
});
