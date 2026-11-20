import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { AdultOnly } from "@/components/Guard";
import { Btn, Label, Screen, Seg, Title } from "@/components/ui";
import { PAIRS } from "@/game/content";
import type { PairId } from "@/game/types";
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
        <Label>{PAIRS[pair][0]}</Label>
        <TextInput style={input} value={a} onChangeText={setA} placeholder="Name" placeholderTextColor={c.muted} maxLength={24} autoFocus returnKeyType="next" />
        <Text style={[st.amp, { color: c.rose }]}>&amp;</Text>
        <Label>{PAIRS[pair][1]}</Label>
        <TextInput style={input} value={b} onChangeText={setB} placeholder="Name" placeholderTextColor={c.muted} maxLength={24} returnKeyType="go" onSubmitEditing={go} />
      </View>
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
  amp: { fontFamily: font.displayItalic, fontSize: 30, textAlign: "center", lineHeight: 34 },
});
