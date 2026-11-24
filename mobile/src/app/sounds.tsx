// Sound lab: spin a real wheel in each sound style, hear every sound on its own, and pick
// (for "Recorded", pick the recording you like for each sound). Open from Profile & settings → Preview sounds.
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Wheel, type WheelHandle, type WheelTheme } from "@/components/Wheel";
import { Btn, Fine, RoundBtn, Screen } from "@/components/ui";
import { MISFORTUNE, WHEELS } from "@/game/content";
import { planSpin } from "@/game/wheel";
import { setPrefs, usePrefs, type SoundStyle } from "@/lib/prefs";
import { RECORDED, SOUND_EVENTS, SOUND_STYLES, play, preloadRecorded, setPreview, type SoundEvent } from "@/lib/sound";
import { font, useColors } from "@/theme/tokens";

const pretty = (file: string) => file.replace(/_0*(\d+)$/, " $1").replace(/^\w/, (c) => c.toUpperCase());

export default function SoundLab() {
  const c = useColors();
  const chosen = usePrefs((p) => p.soundStyle);
  const recorded = usePrefs((p) => p.recorded);
  const soundOn = usePrefs((p) => p.sound);
  const wheel = useRef<WheelHandle>(null);
  const [theme, setTheme] = useState<WheelTheme>("spin");
  const [busy, setBusy] = useState<string | null>(null);
  const [hi, setHi] = useState(-1);
  useEffect(() => { preloadRecorded(); return () => setPreview(null); }, []);

  /** Spin the wheel above with a style's sounds (doesn't change your setting). */
  async function demo(style: SoundStyle, misfortune: boolean) {
    if (busy || !wheel.current) return;
    setBusy(`${style}-${misfortune}`); setHi(-1);
    setTheme(misfortune ? "misfortune" : "spin");
    setPreview({ style, file: style === "recorded" ? recorded : undefined });
    await new Promise((r) => setTimeout(r, 60)); // let the disc recolour first
    const n = 8;
    const win = await wheel.current.spin(planSpin(n, 0.55, 1, true));
    setHi(win);
    play(misfortune ? "misfortune" : "land");
    setTimeout(() => { setPreview(null); setBusy(null); }, 900);
  }

  const wedges = theme === "misfortune" ? MISFORTUNE.couple : WHEELS.couple;

  return (
    <Screen scroll>
      <View style={st.bar}>
        <RoundBtn icon="back" a11y="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/account"))} />
        <Text style={[st.barTitle, { color: c.ink }]}>Sound lab</Text>
        <View style={{ width: 44 }} />
      </View>
      <Fine style={{ textAlign: "left" }}>
        Press a style's ▶ Spin to spin the wheel with its sounds: the ticks slow down with the wheel, then it lands.
        Turn your volume up a little; game sounds are quiet on purpose.
      </Fine>
      {!soundOn && <Fine style={{ textAlign: "left" }}>Sounds are off in your settings; previews here still play.</Fine>}

      <View style={st.wheelBox}>
        <Wheel ref={wheel} wedges={wedges} hi={hi} disabled hubLabel={busy ? "…" : "Demo"} onRequestSpin={() => {}} theme={theme} />
      </View>

      {SOUND_STYLES.map((style) => {
        const picked = style.id === chosen;
        return (
          <View key={style.id} style={[st.card, { backgroundColor: c.surface, borderColor: picked ? c.rose : c.line }]}>
            <Text style={[st.name, { color: c.ink }]}>{style.name}{picked ? "  ✓ in use" : ""}</Text>
            <Fine style={{ textAlign: "left", marginTop: -6 }}>{style.note}</Fine>
            <View style={st.demoRow}>
              <Pressable onPress={() => demo(style.id, false)} disabled={!!busy} style={[st.demo, { backgroundColor: c.wine, opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
                <Text style={[st.demoText, { color: c.onAccent }]}>▶ Spin</Text>
              </Pressable>
              <Pressable onPress={() => demo(style.id, true)} disabled={!!busy} style={[st.demo, { backgroundColor: "#1E0A10", opacity: busy ? 0.6 : 1 }]} accessibilityRole="button">
                <Text style={[st.demoText, { color: "#FFF5F3" }]}>▶ Misfortune spin</Text>
              </Pressable>
            </View>

            {style.id !== "recorded" ? (
              <View style={st.grid}>
                {SOUND_EVENTS.map((e) => (
                  <Pressable key={e.id} onPress={() => play(e.id, { style: style.id, force: true })} accessibilityRole="button"
                    accessibilityLabel={`Play ${e.name}, ${style.name}`} style={[st.chip, { borderColor: c.line, backgroundColor: c.bg }]}>
                    <Text style={[st.chipText, { color: c.ink }]}>▶ {e.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {SOUND_EVENTS.map((e) => {
                  const current = recorded[e.id] ?? RECORDED[e.id][0];
                  return (
                    <View key={e.id} style={{ gap: 6 }}>
                      <Text style={[st.evName, { color: c.muted }]}>{e.name}</Text>
                      <View style={st.grid}>
                        {RECORDED[e.id].map((file) => {
                          const on = file === current;
                          return (
                            <Pressable key={file} accessibilityRole="radio" accessibilityState={{ selected: on }}
                              accessibilityLabel={`${e.name}: ${pretty(file)}`}
                              onPress={() => { play(e.id as SoundEvent, { style: "recorded", file, force: true }); setPrefs({ recorded: { ...recorded, [e.id]: file } }); }}
                              style={[st.chip, { borderColor: on ? c.rose : c.line, backgroundColor: on ? c.rose + "22" : c.bg }]}>
                              <Text style={[st.chipText, { color: c.ink }]}>{on ? "✓ " : "▶ "}{pretty(file)}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
                <Fine style={{ textAlign: "left" }}>Tap a recording to hear it; the ✓ one is used. Sounds by Kenney (kenney.nl), CC0.</Fine>
              </View>
            )}

            {picked
              ? <Fine style={{ textAlign: "left" }}>This is the style the games use.</Fine>
              : <Btn kind="quiet" label={`Use ${style.name} in the games`} onPress={() => setPrefs({ soundStyle: style.id })} />}
          </View>
        );
      })}
    </Screen>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  barTitle: { fontFamily: font.display, fontSize: 26 },
  wheelBox: { width: "100%", maxWidth: 300, alignSelf: "center" },
  card: { borderWidth: 1.5, borderRadius: 20, padding: 16, gap: 12 },
  name: { fontFamily: font.display, fontSize: 26 },
  evName: { fontFamily: font.semibold, fontSize: 13, letterSpacing: 0.5 },
  demoRow: { flexDirection: "row", gap: 10 },
  demo: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  demoText: { fontFamily: font.heavy, fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  chipText: { fontFamily: font.semibold, fontSize: 13.5 },
});
