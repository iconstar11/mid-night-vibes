// Terms, Privacy and Refunds: a readable page of headed sections, open to everyone (no 18+ gate), so payment
// providers and visitors can read them before signing up.
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { RoundBtn, Screen } from "@/components/ui";
import { font, useColors } from "@/theme/tokens";

export const OPERATOR = "Midnight Vibes (midnightvibes.online), based in Kenya";
export const CONTACT = "hello@midnightvibes.online";
export const UPDATED = "24 November 2026";

/** A paragraph, or a list of points. */
export type Block = string | string[];
export type LegalSection = { h: string; body: Block[] };

const PAGES = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
] as const;

/** "Terms · Privacy · Refunds" links, for the welcome screen and Account. */
export function LegalLinks() {
  const c = useColors();
  return (
    <View style={st.footer} accessibilityRole="navigation">
      {PAGES.map((p, i) => (
        <Text key={p.href} style={[st.footerText, { color: c.muted }]}>
          {i > 0 ? "·  " : ""}
          <Text onPress={() => router.push(p.href)} accessibilityRole="link" style={st.footerLink}>{p.label}</Text>
        </Text>
      ))}
    </View>
  );
}

export function LegalPage({ title, intro, sections, here }: { title: string; intro: string; sections: LegalSection[]; here: (typeof PAGES)[number]["href"] }) {
  const c = useColors();
  return (
    <Screen scroll>
      <View style={st.bar}>
        <RoundBtn icon="back" a11y="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
        <Text style={[st.barTitle, { color: c.ink }]}>Midnight Vibes</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[st.kicker, { color: c.brass }]}>LAST UPDATED {UPDATED.toUpperCase()}</Text>
        <Text style={[st.title, { color: c.ink }]} accessibilityRole="header">{title}</Text>
        <Text style={[st.p, { color: c.muted }]}>{intro}</Text>
      </View>

      {sections.map((s, i) => (
        <View key={s.h} style={[st.card, { backgroundColor: c.surface, borderColor: c.line }]}>
          <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">{i + 1}. {s.h}</Text>
          {s.body.map((b, j) =>
            typeof b === "string" ? (
              <Text key={j} style={[st.p, { color: c.ink }]} selectable>{b}</Text>
            ) : (
              <View key={j} style={{ gap: 6 }}>
                {b.map((li) => (
                  <View key={li} style={st.li}>
                    <Text style={[st.dot, { color: c.rose }]}>•</Text>
                    <Text style={[st.p, { color: c.ink, flex: 1 }]} selectable>{li}</Text>
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}

      <View style={st.links}>
        {PAGES.filter((p) => p.href !== here).map((p) => (
          <Text key={p.href} onPress={() => router.push(p.href)} accessibilityRole="link" style={[st.link, { color: c.rose }]}>{p.label}</Text>
        ))}
        <Text style={[st.p, { color: c.muted }]} selectable>Questions: {CONTACT}</Text>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  barTitle: { fontFamily: font.display, fontSize: 24, lineHeight: 30 },
  kicker: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: font.display, fontSize: 40, lineHeight: 46 },
  card: { borderWidth: 1, borderRadius: 22, borderCurve: "continuous", padding: 18, gap: 10 },
  h: { fontFamily: font.semibold, fontSize: 17, lineHeight: 23 },
  p: { fontFamily: font.body, fontSize: 15, lineHeight: 22 },
  li: { flexDirection: "row", gap: 8 },
  dot: { fontFamily: font.heavy, fontSize: 15, lineHeight: 22 },
  links: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 16, paddingHorizontal: 4, paddingBottom: 8 },
  link: { fontFamily: font.semibold, fontSize: 15, textDecorationLine: "underline" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 8 },
  footerText: { fontFamily: font.body, fontSize: 13 },
  footerLink: { textDecorationLine: "underline" },
});
