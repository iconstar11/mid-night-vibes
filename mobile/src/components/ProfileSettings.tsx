// Account page, signed in: the user's own name / he-she / into, players they chose to save, and appearance.
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { Into, Sex } from "@/game/types";
import { setPrefs, setShowMood, usePrefs } from "@/lib/prefs";
import { setAnalytics, useAnalytics } from "@/lib/track";
import { addSavedPlayer, removeSavedPlayer, saveProfile, updateSavedPlayer, useProfile, type SavedPlayer, type Theme } from "@/lib/profile";
import { font, useColors } from "@/theme/tokens";
import { Btn, Fine, Label, Seg } from "./ui";

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
  useEffect(() => { setName(p.name); }, [p.name]);
  const input = [st.input, { borderColor: c.line, backgroundColor: c.bg, color: c.ink }];

  return (
    <View style={[st.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={st.head}>
        <Text style={[st.title, { color: c.ink }]}>Profile & settings</Text>
        {!!note && (
          <Animated.Text entering={FadeIn} exiting={FadeOut} style={[st.note, { color: note === "Saved" ? c.muted : c.rose }]}>
            {note === "Saved" ? "✓ Saved" : note}
          </Animated.Text>
        )}
      </View>

      <View>
        <Label>Your name</Label>
        <TextInput style={input} value={name} onChangeText={setName} maxLength={24} placeholder="What players call you" placeholderTextColor={c.muted}
          autoComplete="name" returnKeyType="done"
          onBlur={() => { if (name.trim() !== p.name) run(saveProfile({ name })); }}
          onSubmitEditing={() => { if (name.trim() !== p.name) run(saveProfile({ name })); }} />
      </View>
      <View>
        <Label>You are</Label>
        <Seg<SexOpt> value={p.g ?? ""} onChange={(v) => run(saveProfile({ g: v || null }))} accent={c.rose} options={SEX_OPTS} />
      </View>
      {p.g && (
        <View>
          <Label>You're into</Label>
          <Seg<Into> value={p.into} onChange={(v) => run(saveProfile({ into: v }))} accent={c.rose} options={INTO_OPTS} />
        </View>
      )}
      <Fine style={{ textAlign: "left" }}>Private to your account. Used to fill in game setup faster; you always confirm before playing.</Fine>

      <View style={[st.rule, { backgroundColor: c.line }]} />
      <SavedPlayers run={run} />

      <View style={[st.rule, { backgroundColor: c.line }]} />
      <View>
        <Label>Mood on the game screens</Label>
        <Seg<"hide" | "show"> value={showMood ? "show" : "hide"} onChange={(v) => { setShowMood(v === "show"); run(Promise.resolve("")); }} accent={c.rose} options={[["hide", "Hidden"], ["show", "Visible"]]} />
        <Fine style={{ textAlign: "left", marginTop: 6 }}>Hidden blurs the mood on the game screens and Home (and keeps it from people watching a live game). You still see it while choosing it. Saved on this device.</Fine>
      </View>
      <View>
        <Label>Sounds</Label>
        <Seg<"on" | "off"> value={sound ? "on" : "off"} onChange={(v) => { setPrefs({ sound: v === "on" }); run(Promise.resolve("")); }} accent={c.rose} options={[["on", "On"], ["off", "Off"]]} />
      </View>
      <View>
        <Label>Vibration</Label>
        <Seg<"on" | "off"> value={vibration ? "on" : "off"} onChange={(v) => { setPrefs({ vibration: v === "on" }); run(Promise.resolve("")); }} accent={c.rose} options={[["on", "On"], ["off", "Off"]]} />
        <Fine style={{ textAlign: "left", marginTop: 6 }}>Small buzzes on phones when the wheel ticks and cards are picked.</Fine>
      </View>
      <View>
        <Label>Drinks in Wheel of Misfortune</Label>
        <Seg<"off" | "on"> value={drinks ? "on" : "off"} onChange={(v) => { setPrefs({ drinks: v === "on" }); run(Promise.resolve("")); }} accent={c.rose} options={[["off", "No drinks"], ["on", "Include drinks"]]} />
      </View>
      <View>
        <Label>Anonymous game stats</Label>
        <Seg<"on" | "off"> value={stats ? "on" : "off"} onChange={(v) => { setAnalytics(v === "on"); run(Promise.resolve("")); }} accent={c.rose} options={[["on", "On"], ["off", "Off"]]} />
        <Fine style={{ textAlign: "left", marginTop: 6 }}>Which cards are shown, skipped, done or starred. Never your name, email, gender, moods you type or messages.</Fine>
      </View>
      <View>
        <Label>Appearance</Label>
        <Seg<Theme> value={p.theme} onChange={(v) => run(saveProfile({ theme: v }))} accent={c.rose} options={[["system", "Match device"], ["light", "Light"], ["dark", "Dark"]]} />
      </View>
    </View>
  );
}

function SavedPlayers({ run }: { run: (p: Promise<string>) => void }) {
  const c = useColors();
  const saved = useProfile((p) => p.saved);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <View style={{ gap: 10 }}>
      <Text style={[st.sub, { color: c.ink }]}>Saved players</Text>
      <Fine style={{ textAlign: "left" }}>Only people you add here are remembered. Nobody is saved from games.</Fine>
      {saved.map((s) =>
        editing === s.id ? (
          <PlayerForm key={s.id} initial={s} onCancel={() => setEditing(null)}
            onSave={async (v) => { await updateSavedPlayer(s.id, v); setEditing(null); return ""; }}
            onRemove={() => { removeSavedPlayer(s.id); setEditing(null); }} />
        ) : (
          <Pressable key={s.id} onPress={() => { setEditing(s.id); setAdding(false); }} accessibilityRole="button" accessibilityLabel={`Edit ${s.name}`}
            style={[st.row, { borderColor: c.line, backgroundColor: c.bg }]}>
            <Text style={[st.rowName, { color: c.ink }]}>{s.name}</Text>
            {s.g && <Text style={[st.tag, { color: c.rose }]}>{SEX_SHORT[s.g]}</Text>}
            {s.g && INTO_SHORT[s.into] ? <Text style={[st.tag, { color: c.muted }]}>{INTO_SHORT[s.into]}</Text> : null}
            <Text style={[st.edit, { color: c.muted }]}>Edit</Text>
          </Pressable>
        ),
      )}
      {adding ? (
        <PlayerForm onCancel={() => setAdding(false)} onSave={async (v) => { const e = await addSavedPlayer(v); if (!e) setAdding(false); return e; }} />
      ) : (
        saved.length < 30 && <Btn kind="quiet" label="+ Add a player" onPress={() => { setAdding(true); setEditing(null); }} />
      )}
    </View>
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
    <Animated.View entering={FadeIn.duration(200)} style={[st.form, { borderColor: c.rose, backgroundColor: c.bg }]}>
      <TextInput value={name} onChangeText={setName} maxLength={24} placeholder="Name" placeholderTextColor={c.muted} autoFocus={!initial}
        returnKeyType="done" onSubmitEditing={save} style={[st.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }]} />
      <Seg<SexOpt> value={g ?? ""} onChange={(v) => setG(v || null)} accent={c.rose} options={SEX_OPTS} />
      {g && <Seg<Into> value={into} onChange={setInto} accent={c.rose} options={INTO_OPTS} />}
      {!!err && <Text style={[st.note, { color: c.rose }]}>{err}</Text>}
      <View style={st.formRow}>
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
  card: { borderRadius: 22, borderWidth: 1.5, padding: 18, gap: 14 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontFamily: font.display, fontSize: 26 },
  sub: { fontFamily: font.semibold, fontSize: 16 },
  note: { fontFamily: font.semibold, fontSize: 13.5 },
  input: { fontFamily: font.body, fontSize: 17, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1.5 },
  rule: { height: 1.5, marginVertical: 2 },
  row: { flexDirection: "row", alignItems: "baseline", gap: 6, borderWidth: 1.5, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  rowName: { fontFamily: font.semibold, fontSize: 16 },
  tag: { fontFamily: font.semibold, fontSize: 12.5 },
  edit: { marginLeft: "auto", fontFamily: font.semibold, fontSize: 13 },
  form: { borderWidth: 1.5, borderRadius: 16, padding: 12, gap: 10 },
  formRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  remove: { fontFamily: font.semibold, fontSize: 14 },
  cancel: { fontFamily: font.semibold, fontSize: 14 },
  save: { borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 },
  saveText: { fontFamily: font.heavy, fontSize: 14 },
});
