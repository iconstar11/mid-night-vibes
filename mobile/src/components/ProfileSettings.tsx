// Account page, signed in: the user's own name / he-she / into, players they chose to save, and the settings,
// as grouped sections (see SettingsList).
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { Into, Sex } from "@/game/types";
import { setPrefs, setShowMood, usePrefs } from "@/lib/prefs";
import { setAnalytics, useAnalytics } from "@/lib/track";
import { addSavedPlayer, removeSavedPlayer, saveProfile, updateSavedPlayer, useProfile, type SavedPlayer, type Theme } from "@/lib/profile";
import { useGame } from "@/state/store";
import { font, mix, useColors } from "@/theme/tokens";
import { Row, Section, Toggle } from "./SettingsList";
import { Seg } from "./ui";
import { FILL_HEATS } from "./WheelModeSheet";

type SexOpt = "m" | "f" | "";
const SEX_OPTS: [SexOpt, string][] = [["m", "He"], ["f", "She"], ["", "Rather not say"]];
const INTO_OPTS: [Into, string][] = [["opp", "Opposite sex"], ["same", "Same sex"], ["both", "Both"]];
const SEX_SHORT = { m: "he", f: "she" } as const;
const INTO_SHORT: Record<Into, string> = { opp: "", same: "into same sex", both: "into both" };

/** "Saved" for a moment after each change (or the error). */
function useSavedNote() {
  const [note, setNote] = useState("");
  useEffect(() => {
    if (note !== "Saved") return;
    const t = setTimeout(() => setNote(""), 1600);
    return () => clearTimeout(t);
  }, [note]);
  const run = async (p: Promise<string>) => setNote((await p) || "Saved");
  return [note, run] as const;
}

export function ProfileSettings() {
  const c = useColors();
  const p = useProfile();
  const [name, setName] = useState(p.name);
  const [note, run] = useSavedNote();
  const stats = useAnalytics((a) => a.on);
  const showMood = usePrefs((p) => p.showMood);
  const sound = usePrefs((p) => p.sound);
  const vibration = usePrefs((p) => p.vibration);
  const drinks = usePrefs((p) => p.drinks);
  const fillHeat = usePrefs((p) => p.fillHeat);
  const heatRise = usePrefs((p) => p.heatRise);
  const setFillHeat = useGame((g) => g.setFillHeat);
  useEffect(() => { setName(p.name); }, [p.name]);
  const saved = () => run(Promise.resolve(""));
  const saveName = () => { if (name.trim() !== p.name) run(saveProfile({ name })); };
  // Icon tiles: the brand colours, so the page reads as one set
  const t = { wine: c.wine, rose: c.rose, brass: c.brass, plum: c.plum, dusk: mix(c.plum, c.rose, 0.45) };

  const noteView = !!note && (
    <Animated.Text entering={FadeIn} exiting={FadeOut} style={[st.note, { color: note === "Saved" ? c.muted : c.rose }]}>
      {note === "Saved" ? "✓ Saved" : note}
    </Animated.Text>
  );

  return (
    <View style={{ gap: 26 }}>
      <Section title="Profile" aside={noteView} footer="Private to your account. Used to fill in game setup faster; you always confirm before playing.">
        <Row icon="user" tint={t.wine} title="Name"
          right={
            <TextInput style={[st.inline, { color: c.ink }]} value={name} onChangeText={setName} maxLength={24} placeholder="Your name"
              placeholderTextColor={c.muted} autoComplete="name" returnKeyType="done" onBlur={saveName} onSubmitEditing={saveName}
              accessibilityLabel="Your name" />
          } />
        <Row icon="spark" tint={t.rose} title="You are"
          below={<Seg<SexOpt> value={p.g ?? ""} onChange={(v) => run(saveProfile({ g: v || null }))} accent={c.rose} options={SEX_OPTS} />} />
        {p.g && (
          <Row icon="heart" tint={t.dusk} title="You're into"
            below={<Seg<Into> value={p.into} onChange={(v) => run(saveProfile({ into: v }))} accent={c.rose} options={INTO_OPTS} />} />
        )}
      </Section>

      <SavedPlayers run={run} />

      <Section title="Game">
        <Row icon="eye" tint={t.plum} title="Show the mood" detail="Off blurs it on the game screens and Home, and hides it from people watching a live game."
          right={<Toggle value={showMood} onChange={(v) => { setShowMood(v); saved(); }} label="Show the mood on the game screens" />} />
        <Row icon="sound" tint={t.brass} title="Sounds"
          right={<Toggle value={sound} onChange={(v) => { setPrefs({ sound: v }); saved(); }} label="Sounds" />} />
        <Row icon="vibrate" tint={t.brass} title="Vibration" detail="Small buzzes on phones when the wheel ticks and cards are picked."
          right={<Toggle value={vibration} onChange={(v) => { setPrefs({ vibration: v }); saved(); }} label="Vibration" />} />
        <Row icon="glass" tint={t.wine} title="Drinks in Misfortune" detail="Adds sip forfeits. Water or juice works just as well."
          right={<Toggle value={drinks} onChange={(v) => { setPrefs({ drinks: v }); saved(); }} label="Drinks in Wheel of Misfortune" />} />
        <Row icon="rise" tint={t.wine} title="Heat rises over time" detail="Starts where you pick and moves up (Flirty, Steamy, Spicy) as the room warms up. Undo any time."
          right={<Toggle value={heatRise ?? true} onChange={(v) => { setPrefs({ heatRise: v }); saved(); }} label="Heat rises over time" />} />
        <Row icon="flame" tint={t.rose} title="Heat of added sections" detail="When you paste fewer than 6 dares for a wheel, we add some to fill it."
          below={<Seg<"1" | "2" | "3"> value={String(fillHeat ?? 2) as "1" | "2" | "3"} onChange={(v) => { setFillHeat(Number(v) as 1 | 2 | 3); saved(); }} accent={c.rose} options={FILL_HEATS} />} />
      </Section>

      <Section title="Appearance">
        <Row icon="moon" tint={t.plum} title="Theme"
          below={<Seg<Theme> value={p.theme} onChange={(v) => run(saveProfile({ theme: v }))} accent={c.rose} options={[["system", "Match device"], ["light", "Light"], ["dark", "Dark"]]} />} />
      </Section>

      <Section title="Privacy" footer="Game stats are which cards are shown, skipped, done or starred. Never your name, email, gender, the moods you type or messages.">
        <Row icon="shield" tint={t.dusk} title="Anonymous game stats"
          right={<Toggle value={stats} onChange={(v) => { setAnalytics(v); saved(); }} label="Anonymous game stats" />} />
      </Section>
    </View>
  );
}

function SavedPlayers({ run }: { run: (p: Promise<string>) => void }) {
  const c = useColors();
  const saved = useProfile((p) => p.saved);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const tags = (s: SavedPlayer) => [s.g ? SEX_SHORT[s.g] : "", s.g ? INTO_SHORT[s.into] : ""].filter(Boolean).join(" · ");

  return (
    <Section title="Saved players" footer="Only people you add here are remembered. Nobody is saved from games.">
      {saved.map((s) =>
        editing === s.id ? (
          <View key={s.id} style={st.formRow}>
            <PlayerForm initial={s} onCancel={() => setEditing(null)}
              onSave={async (v) => { await updateSavedPlayer(s.id, v); setEditing(null); return ""; }}
              onRemove={() => { removeSavedPlayer(s.id); setEditing(null); }} />
          </View>
        ) : (
          <Row key={s.id} title={s.name} detail={tags(s) || undefined} a11y={`Edit ${s.name}`}
            onPress={() => { setEditing(s.id); setAdding(false); }}
            lead={<View style={[st.avatar, { backgroundColor: c.rose + "26" }]}><Text style={[st.avatarText, { color: c.rose }]}>{s.name.slice(0, 1).toUpperCase()}</Text></View>} />
        ),
      )}
      {adding ? (
        <View style={st.formRow}>
          <PlayerForm onCancel={() => setAdding(false)} onSave={async (v) => { const e = await addSavedPlayer(v); if (!e) setAdding(false); return e; }} />
        </View>
      ) : (
        saved.length < 30 && (
          <Pressable onPress={() => { setAdding(true); setEditing(null); }} accessibilityRole="button"
            style={({ pressed }) => [st.add, pressed ? { backgroundColor: c.line + "66" } : null]}>
            <Text style={[st.addText, { color: c.rose }]}>+  Add a player</Text>
          </Pressable>
        )
      )}
    </Section>
  );
}

function PlayerForm({ initial, onSave, onCancel, onRemove }: {
  initial?: SavedPlayer;
  onSave: (v: Omit<SavedPlayer, "id">) => Promise<string>;
  onCancel: () => void;
  onRemove?: () => void;
}) {
  const c = useColors();
  const [name, setName] = useState(initial?.name ?? "");
  const [g, setG] = useState<Sex>(initial?.g ?? null);
  const [into, setInto] = useState<Into>(initial?.into ?? "opp");
  const [err, setErr] = useState("");
  const save = async () => setErr(await onSave({ name, g, into }));

  return (
    <Animated.View entering={FadeIn.duration(200)} style={st.form}>
      <TextInput value={name} onChangeText={setName} maxLength={24} placeholder="Name" placeholderTextColor={c.muted} autoFocus={!initial}
        returnKeyType="done" onSubmitEditing={save} style={[st.input, { borderColor: c.line, backgroundColor: c.bg, color: c.ink }]} />
      <Seg<SexOpt> value={g ?? ""} onChange={(v) => setG(v || null)} accent={c.rose} options={SEX_OPTS} />
      {g && <Seg<Into> value={into} onChange={setInto} accent={c.rose} options={INTO_OPTS} />}
      {!!err && <Text style={[st.note, { color: c.rose }]}>{err}</Text>}
      <View style={st.formBtns}>
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button">
            <Text style={[st.remove, { color: c.rose }]}>Remove</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button"><Text style={[st.cancel, { color: c.muted }]}>Cancel</Text></Pressable>
        <Pressable onPress={save} style={[st.save, { backgroundColor: c.wine }]} accessibilityRole="button">
          <Text style={[st.saveText, { color: c.onAccent }]}>{initial ? "Save" : "Add"}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  note: { fontFamily: font.semibold, fontSize: 12.5 },
  inline: { fontFamily: font.semibold, fontSize: 16, textAlign: "right", minWidth: 120, maxWidth: 190, paddingVertical: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: font.heavy, fontSize: 14 },
  add: { paddingVertical: 15, paddingHorizontal: 16 },
  addText: { fontFamily: font.semibold, fontSize: 16 },
  formRow: { padding: 14 },
  form: { gap: 10 },
  input: { fontFamily: font.body, fontSize: 17, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderCurve: "continuous", borderWidth: 1.5 },
  formBtns: { flexDirection: "row", alignItems: "center", gap: 16 },
  remove: { fontFamily: font.semibold, fontSize: 14 },
  cancel: { fontFamily: font.semibold, fontSize: 14 },
  save: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  saveText: { fontFamily: font.heavy, fontSize: 14 },
});
