import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AdultOnly } from "@/components/Guard";
import { Btn, Chip, Label, Screen, Seg, Title } from "@/components/ui";
import { PAIRS } from "@/game/content";
import { couplePrefill } from "@/game/profile";
import type { PairId } from "@/game/types";
import { useAuth } from "@/lib/auth";
import { useProfile, type SavedPlayer } from "@/lib/profile";
import { useGame } from "@/state/store";
import { font, useColors } from "@/theme/tokens";

export default function Couple() {
  return <AdultOnly><Names /></AdultOnly>;
}

function Names() {
  const c = useColors();
  const pair = useGame((g) => g.pair);
  const setPair = useGame((g) => g.setPair);
  const start = useGame((g) => g.startCouple);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const input = [st.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }];

  // Signed in: fill in their own name (and partner from saved players on a tap). They confirm with Continue.
  const signedIn = !!useAuth((s) => s.email);
  const profile = useProfile();
  const me = { name: profile.name.trim(), g: profile.g, into: profile.into };
  const [showSaved, setShowSaved] = useState(false);
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!signedIn || !profile.loaded || filled || !me.name || a || b) return;
    const f = couplePrefill(me, null, pair);
    setA(f.a); setB(f.b); setFilled(true);
  }, [signedIn, profile.loaded]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickPartner = (p: SavedPlayer) => {
    const f = couplePrefill(me.name ? me : { ...me, name: a.trim() }, p, pair);
    if (f.pair) setPair(f.pair);
    setA(f.a); setB(f.b); setShowSaved(false);
  };
  const youTag = (v: string) => (signedIn && me.name && v.trim() === me.name ? "  · you" : "");

  const go = () => {
    let n: [string, string] = [a.trim() || PAIRS[pair][0], b.trim() || PAIRS[pair][1]];
    if (n[0] === n[1]) n = [n[0] + " 1", n[1] + " 2"];
    start(n);
    router.replace("/home");
  };

  return (
    <Screen scroll>
      <Title>What should we call you two?</Title>
      <View style={{ gap: 6 }}>
        <Label>{PAIRS[pair][0] + youTag(a)}</Label>
        <TextInput style={input} value={a} onChangeText={setA} placeholder="Name" placeholderTextColor={c.muted} maxLength={24} autoFocus returnKeyType="next" />
        <Text style={[st.amp, { color: c.rose }]}>&amp;</Text>
        <Label>{PAIRS[pair][1] + youTag(b)}</Label>
        <TextInput style={input} value={b} onChangeText={setB} placeholder="Name" placeholderTextColor={c.muted} maxLength={24} returnKeyType="go" onSubmitEditing={go} />
      </View>
      {signedIn && profile.saved.length > 0 && (
        showSaved ? (
          <View style={st.saved}>
            {profile.saved.filter((p) => p.name !== me.name).map((p) => (
              <Chip key={p.id} label={p.name + (p.g ? (p.g === "m" ? " · he" : " · she") : "")} onPress={() => pickPartner(p)} />
            ))}
          </View>
        ) : (
          <Pressable onPress={() => setShowSaved(true)} accessibilityRole="button" style={st.savedBtn}>
            <Text style={[st.savedText, { color: c.rose }]}>Pick from saved players ({profile.saved.length})</Text>
          </Pressable>
        )
      )}
      <View>
        <Label>You are</Label>
        <Seg<PairId> value={pair} onChange={setPair} options={[["mf", "Him & Her"], ["ff", "Her & Her"], ["mm", "Him & Him"], ["any", "Rather not say"]]} />
      </View>
      <View style={{ marginTop: "auto", gap: 4 }}>
        <Btn label="Continue" onPress={go} />
        <Btn kind="quiet" label="Not a couple? Change group" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  input: { fontFamily: font.body, fontSize: 17, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5 },
  saved: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  savedBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  savedText: { fontFamily: font.semibold, fontSize: 15 },
  amp: { fontFamily: font.displayItalic, fontSize: 30, textAlign: "center", lineHeight: 34 },
});
