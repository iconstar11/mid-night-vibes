import { router } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from "react-native";
import Animated, { FadeIn, FadeInDown, LinearTransition } from "react-native-reanimated";

import { AdultOnly } from "@/components/Guard";
import { Btn, Chip, Label, Screen, Seg, Title } from "@/components/ui";
import { GROUPS } from "@/game/content";
import type { Into, Player, Sex } from "@/game/types";
import { useAuth } from "@/lib/auth";
import { useProfile } from "@/lib/profile";
import { useGame } from "@/state/store";
import { font, useColors } from "@/theme/tokens";

const SEX_LABEL = { m: "he", f: "she" } as const;
const INTO_LABEL: Record<Into, string> = { opp: "", same: "into same sex", both: "into both" };
type SexOpt = "m" | "f" | "";

export default function Players() {
  return <AdultOnly><Roster /></AdultOnly>;
}

function Roster() {
  const c = useColors();
  const group = useGame((g) => g.group);
  const roster = useGame((g) => g.roster);
  const setRoster = useGame((g) => g.setRoster);
  const start = useGame((g) => g.startGroup);
  const mixed = group === "friends";
  const fixed: Sex = group === "girls" ? "f" : group === "boys" ? "m" : null;

  const [name, setName] = useState("");
  const [sex, setSex] = useState<SexOpt>("m");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const add = () => {
    const n = name.trim();
    if (!n) return false;
    if (roster.length >= 12) { setErr("12 players is the maximum."); return false; }
    setRoster([...roster, { name: n, g: mixed ? (sex || null) : fixed, into: "opp" }]);
    setName(""); setErr("");
    inputRef.current?.focus();
    return true;
  };
  // Signed in: add themselves or players they saved with one tap (nothing is added without a tap)
  const signedIn = !!useAuth((s) => s.email);
  const profile = useProfile();
  const [showSaved, setShowSaved] = useState(false);
  const inRoster = (n: string) => roster.some((p) => p.name.trim().toLowerCase() === n.trim().toLowerCase());
  const addPerson = (p: Player) => {
    if (inRoster(p.name)) return;
    if (roster.length >= 12) { setErr("12 players is the maximum."); return; }
    // Girls' and boys' nights: everyone's sex is the group's
    setRoster([...roster, { name: p.name.trim(), g: mixed ? p.g : fixed, into: p.into }]);
    setErr("");
  };
  const me = profile.name.trim();
  const savedLeft = profile.saved.filter((p) => !inRoster(p.name));
  const update = (i: number, p: Partial<Player>) => setRoster(roster.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const remove = (i: number) => { setRoster(roster.filter((_, j) => j !== i)); if (editing === i) setEditing(null); };
  const go = () => {
    const extra = name.trim() ? 1 : 0;
    if (extra) add();
    if (roster.length + extra < 2) { setErr("Add at least 2 players to start."); return; }
    start();
    router.replace("/home");
  };
  const ed = editing !== null ? roster[editing] : null;

  return (
    <Screen scroll>
      <Title>{GROUPS[group].name}: who's in?</Title>
      <View>
        <Label>Add players</Label>
        <View style={st.addRow}>
          <TextInput ref={inputRef} value={name} onChangeText={setName} onSubmitEditing={add} submitBehavior="submit" placeholder="Name"
            placeholderTextColor={c.muted} maxLength={24} autoFocus returnKeyType="done"
            style={[st.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }]} />
          <Pressable onPress={add} style={[st.add, { borderColor: c.line, backgroundColor: c.surface }]} accessibilityRole="button">
            <Text style={[st.addText, { color: c.ink }]}>Add</Text>
          </Pressable>
        </View>
        {mixed && (
          <View style={{ marginTop: 10 }}>
            <Seg<SexOpt> value={sex} onChange={setSex} accent={c.rose} options={[["m", "He"], ["f", "She"], ["", "Rather not say"]]} />
          </View>
        )}
      </View>

      {signedIn && ((me && !inRoster(me)) || profile.saved.length > 0) && (
        <View style={st.quick}>
          {me && !inRoster(me) && (
            <Chip label={`+ Add me (${me}${mixed && profile.g ? (profile.g === "m" ? " · he" : " · she") : ""})`}
              onPress={() => addPerson({ name: me, g: profile.g, into: profile.into })} />
          )}
          {profile.saved.length > 0 && !showSaved && (
            <Pressable onPress={() => setShowSaved(true)} accessibilityRole="button" style={st.savedBtn}>
              <Text style={[st.savedText, { color: c.rose }]}>Saved players ({profile.saved.length})</Text>
            </Pressable>
          )}
          {showSaved && savedLeft.map((p) => (
            <Chip key={p.id} label={"+ " + p.name + (mixed && p.g ? (p.g === "m" ? " · he" : " · she") : "")} onPress={() => addPerson(p)} />
          ))}
        </View>
      )}

      <Animated.View layout={LinearTransition} style={st.chips}>
        {roster.map((p, i) => (
          <Animated.View key={p.name + i} entering={FadeInDown.duration(250)} style={[st.chip, { borderColor: editing === i ? c.rose : c.line, backgroundColor: c.surface }]}>
            <Pressable onPress={() => mixed && setEditing(editing === i ? null : i)} accessibilityLabel={mixed ? "Edit " + p.name : p.name} style={st.chipName}>
              <Text style={[st.chipText, { color: c.ink }]}>{p.name}</Text>
              {mixed && p.g && <Text style={[st.sex, { color: c.rose }]}>{SEX_LABEL[p.g]}</Text>}
              {mixed && p.g && INTO_LABEL[p.into] ? <Text style={[st.into, { color: c.muted }]}>{INTO_LABEL[p.into]}</Text> : null}
            </Pressable>
            <Pressable onPress={() => remove(i)} accessibilityLabel={"Remove " + p.name} hitSlop={8}>
              <Text style={[st.x, { color: c.muted }]}>×</Text>
            </Pressable>
          </Animated.View>
        ))}
      </Animated.View>

      {mixed && roster.length > 0 && !ed && (
        <Text style={[st.hint, { color: c.muted }]}>Flirty dares pair players up with the opposite sex. Tap a name to change who they're into.</Text>
      )}

      {mixed && ed && editing !== null && (
        <Animated.View entering={FadeIn.duration(200)} style={[st.prefs, { borderColor: c.line, backgroundColor: c.surface }]}>
          <Text style={[st.prefTitle, { color: c.ink }]}>{ed.name}</Text>
          <View style={st.prefRow}>
            <Label>Is</Label>
            <Seg<SexOpt> value={ed.g ?? ""} onChange={(v) => update(editing, { g: v || null })} options={[["m", "He"], ["f", "She"], ["", "Rather not say"]]} />
          </View>
          {ed.g && (
            <View style={st.prefRow}>
              <Label>Into</Label>
              <Seg<Into> value={ed.into} onChange={(v) => update(editing, { into: v })} options={[["opp", "Opposite sex"], ["same", "Same sex"], ["both", "Both"]]} />
            </View>
          )}
          <Btn kind="quiet" label="Done" onPress={() => setEditing(null)} />
        </Animated.View>
      )}

      {!!err && <Text style={[st.err, { color: c.rose }]}>{err}</Text>}
      <View style={{ marginTop: "auto", gap: 4 }}>
        <Btn label="Start playing" onPress={go} />
        <Btn kind="quiet" label="Change group" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  addRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, minWidth: 0, fontFamily: font.body, fontSize: 17, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5 },
  add: { borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 18, justifyContent: "center" },
  addText: { fontFamily: font.semibold, fontSize: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  savedBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  savedText: { fontFamily: font.semibold, fontSize: 15 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, borderRadius: 999, borderWidth: 1.5 },
  chipName: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  chipText: { fontFamily: font.body, fontSize: 15 },
  sex: { fontFamily: font.semibold, fontSize: 12 },
  into: { fontFamily: font.body, fontSize: 12 },
  x: { fontSize: 18, lineHeight: 20, paddingHorizontal: 4 },
  hint: { fontFamily: font.body, fontSize: 13.5 },
  prefs: { borderRadius: 20, borderWidth: 1.5, padding: 16, gap: 12 },
  prefTitle: { fontFamily: font.semibold, fontSize: 16 },
  prefRow: { gap: 2 },
  err: { fontFamily: font.semibold, fontSize: 15 },
});
