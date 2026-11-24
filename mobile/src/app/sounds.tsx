// Sound lab: hear every game sound in each style, then pick one. Open from Profile & settings → Preview sounds.
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Btn, Fine, RoundBtn, Screen } from "@/components/ui";
import { setPrefs, usePrefs, type SoundStyle } from "@/lib/prefs";
import { SOUND_EVENTS, SOUND_STYLES, audioState, play, type SoundEvent } from "@/lib/sound";
import { font, useColors } from "@/theme/tokens";

/** A wheel spin in miniature: whoosh, ticks that slow down, then the landing. */
function demoSpin(style: SoundStyle, misfortune: boolean) {
  play("spin", { style, force: true });
  let t = 0;
  for (let i = 0; i < 22; i++) {
    const gap = 45 + i * i * 1.1; // ticks spread out as the wheel slows
    t += gap;
    setTimeout(() => play("tick", { style, force: true, speed: Math.min(1, 90 / gap) }), t);
  }
  setTimeout(() => play(misfortune ? "misfortune" : "land", { style, force: true }), t + 380);
}

export default function SoundLab() {
  const c = useColors();
  const chosen = usePrefs((p) => p.soundStyle);
  const soundOn = usePrefs((p) => p.sound);
  const [last, setLast] = useState("");
  const hit = (style: SoundStyle, e: SoundEvent) => { play(e, { style, force: true }); setLast(`${style} · ${e}`); };

  return (
    <Screen scroll>
      <View style={st.bar}>
        <RoundBtn icon="back" a11y="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/account"))} />
        <Text style={[st.barTitle, { color: c.ink }]}>Sound lab</Text>
        <View style={{ width: 44 }} />
      </View>
      <Fine style={{ textAlign: "left" }}>
        Tap to hear each sound in each style. All are made in the app (no downloads). Turn your volume up a little: game sounds are quiet on purpose.
      </Fine>
      {!soundOn && <Fine style={{ textAlign: "left" }}>Sounds are off in your settings; the previews here still play.</Fine>}

      {SOUND_STYLES.map((style) => {
        const picked = style.id === chosen;
        return (
          <View key={style.id} style={[st.card, { backgroundColor: c.surface, borderColor: picked ? c.rose : c.line }]}>
            <View style={st.head}>
              <Text style={[st.name, { color: c.ink }]}>{style.name}{picked ? "  ✓" : ""}</Text>
            </View>
            <Fine style={{ textAlign: "left", marginTop: -6 }}>{style.note}</Fine>
            <View style={st.demoRow}>
              <Pressable onPress={() => demoSpin(style.id, false)} style={[st.demo, { backgroundColor: c.wine }]} accessibilityRole="button">
                <Text style={[st.demoText, { color: c.onAccent }]}>▶ Spin demo</Text>
              </Pressable>
              <Pressable onPress={() => demoSpin(style.id, true)} style={[st.demo, { backgroundColor: "#1E0A10" }]} accessibilityRole="button">
                <Text style={[st.demoText, { color: "#FFF5F3" }]}>▶ Misfortune demo</Text>
              </Pressable>
            </View>
            <View style={st.grid}>
              {SOUND_EVENTS.map((e) => (
                <Pressable key={e.id} onPress={() => hit(style.id, e.id)} accessibilityRole="button" accessibilityLabel={`Play ${e.name}, ${style.name}`}
                  style={[st.chip, { borderColor: c.line, backgroundColor: c.bg }]}>
                  <Text style={[st.chipText, { color: c.ink }]}>▶ {e.name}</Text>
                </Pressable>
              ))}
            </View>
            {picked
              ? <Fine style={{ textAlign: "left" }}>This is the style the games use.</Fine>
              : <Btn kind="quiet" label={`Use ${style.name}`} onPress={() => setPrefs({ soundStyle: style.id })} />}
          </View>
        );
      })}
      {!!last && <Fine style={{ textAlign: "left", opacity: 0.6 }}>Last played: {last} · audio {audioState()}</Fine>}
    </Screen>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  barTitle: { fontFamily: font.display, fontSize: 26 },
  card: { borderWidth: 1.5, borderRadius: 20, padding: 16, gap: 12 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontFamily: font.display, fontSize: 26 },
  demoRow: { flexDirection: "row", gap: 10 },
  demo: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  demoText: { fontFamily: font.heavy, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  chipText: { fontFamily: font.semibold, fontSize: 13.5 },
});
