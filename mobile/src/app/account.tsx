import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AdultOnly } from "@/components/Guard";
import { Btn, Fine, Label, RoundBtn, Screen, Seg } from "@/components/ui";
import { PLAN_NAMES, refreshAccount, signIn, signOut, signUp, useAuth } from "@/lib/auth";
import { ensureSession, supabaseReady } from "@/lib/supabase";
import { font, useColors } from "@/theme/tokens";

export default function Account() {
  return <AdultOnly><AccountScreen /></AdultOnly>;
}

function AccountScreen() {
  const c = useColors();
  const { ready, email, name, plan } = useAuth();

  useEffect(() => {
    ensureSession().catch(() => null).then(refreshAccount);
  }, []);

  return (
    <Screen scroll>
      <View style={st.bar}>
        <RoundBtn label="‹" a11y="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} />
        <Text style={[st.barTitle, { color: c.ink }]}>Account</Text>
        <View style={{ width: 44 }} />
      </View>

      {!supabaseReady ? (
        <Fine>Accounts need the Supabase settings in mobile/.env.local.</Fine>
      ) : !ready ? (
        <ActivityIndicator color={c.rose} style={{ marginTop: 40 }} />
      ) : (
        <Animated.View entering={FadeIn.duration(250)} style={{ gap: 18 }}>
          <Text style={[st.hello, { color: c.ink }]}>
            {email ? <>Hi, <Text style={{ color: c.wine, fontFamily: font.displayItalic }}>{name || email.split("@")[0]}</Text></> : "Playing as a guest"}
          </Text>
          {email && <Fine style={{ textAlign: "left", marginTop: -12 }}>{email}</Fine>}

          <Usage />
          {plan !== "premium" && <Premium />}
          {email ? <Btn kind="quiet" label="Sign out" onPress={signOut} /> : <AuthForm />}
        </Animated.View>
      )}
    </Screen>
  );
}

/** Plan name and today's AI moods as a meter. */
function Usage() {
  const c = useColors();
  const { plan, used, limit } = useAuth();
  const pct = limit ? Math.min(used / limit, 1) : 1;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(pct, { duration: 600 }); }, [pct]); // eslint-disable-line react-hooks/exhaustive-deps
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[st.card, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={st.row}>
        <Text style={[st.cardTitle, { color: c.ink }]}>{PLAN_NAMES[plan]}</Text>
        <View style={[st.badge, { backgroundColor: plan === "premium" ? c.brass : c.rose }]}>
          <Text style={[st.badgeText, { color: c.onAccent }]}>{plan.toUpperCase()}</Text>
        </View>
      </View>
      <View style={st.row}>
        <Text style={[st.meterLabel, { color: c.muted }]}><Text style={{ color: c.brass }}>✦</Text> AI moods today</Text>
        <Text style={[st.meterLabel, { color: c.ink }]}>{Math.min(used, limit)} of {limit}</Text>
      </View>
      <View style={[st.track, { backgroundColor: c.line }]}>
        <Animated.View style={[st.fill, { backgroundColor: pct >= 1 ? c.wine : c.rose }, fill]} />
      </View>
      <Fine style={{ textAlign: "left" }}>
        {plan === "guest" ? "A free account gets more AI moods every day." : "Resets at midnight UTC. The built-in cards are always unlimited."}
      </Fine>
    </View>
  );
}

/** Premium teaser: the place payments will plug into. */
function Premium() {
  const c = useColors();
  const perks = ["100 AI moods a day", "Spicy AI packs and themed wheels", "Bigger live rooms", "No limits on saved groups"];
  return (
    <LinearGradient colors={[c.wine, c.plum]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={st.premium}>
      <Text style={[st.premiumKicker, { color: c.brass }]}>MIDNIGHT VIBES PREMIUM</Text>
      <Text style={[st.premiumTitle, { color: c.onAccent }]}>More moods, more heat.</Text>
      {perks.map((p) => (
        <Text key={p} style={[st.perk, { color: c.onAccent }]}><Text style={{ color: c.brass }}>✦  </Text>{p}</Text>
      ))}
      <View style={[st.soon, { borderColor: c.onAccent + "55" }]}>
        <Text style={[st.soonText, { color: c.onAccent }]}>Coming soon</Text>
      </View>
    </LinearGradient>
  );
}

function AuthForm() {
  const c = useColors();
  const [mode, setMode] = useState<"up" | "in">("up");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const input = [st.input, { borderColor: c.line, backgroundColor: c.surface, color: c.ink }];

  async function submit() {
    if (busy) return;
    setBusy(true); setError("");
    const r = mode === "up" ? await signUp(email, password, name) : await signIn(email, password);
    setBusy(false);
    if (!r.ok) setError(r.error);
    else if (r.confirm) setConfirmSent(true);
  }

  if (confirmSent)
    return (
      <View style={[st.card, { backgroundColor: c.surface, borderColor: c.line }]}>
        <Text style={[st.cardTitle, { color: c.ink }]}>Check your email</Text>
        <Fine style={{ textAlign: "left" }}>We sent a link to {email.trim()}. Open it to finish creating your account, then sign in here.</Fine>
        <Btn label="I've confirmed, sign in" onPress={() => { setConfirmSent(false); setMode("in"); }} />
      </View>
    );

  return (
    <View style={{ gap: 12 }}>
      <Seg<"up" | "in"> value={mode} onChange={(m) => { setMode(m); setError(""); }} accent={c.rose} options={[["up", "Create account"], ["in", "Sign in"]]} />
      {mode === "up" && (
        <View>
          <Label>Your name</Label>
          <TextInput style={input} value={name} onChangeText={setName} placeholder="Optional" placeholderTextColor={c.muted} maxLength={40} autoComplete="name" />
        </View>
      )}
      <View>
        <Label>Email</Label>
        <TextInput style={input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={c.muted}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" />
      </View>
      <View>
        <Label>Password</Label>
        <TextInput style={input} value={password} onChangeText={setPassword} placeholder={mode === "up" ? "At least 8 characters" : "Your password"} placeholderTextColor={c.muted}
          secureTextEntry autoCapitalize="none" autoComplete={mode === "up" ? "new-password" : "current-password"} textContentType={mode === "up" ? "newPassword" : "password"}
          onSubmitEditing={submit} returnKeyType="go" />
      </View>
      {!!error && <Text style={[st.err, { color: c.rose }]}>{error}</Text>}
      <Btn label={busy ? "One moment…" : mode === "up" ? "Create free account" : "Sign in"} onPress={submit} disabled={busy} />
      <Fine>{mode === "up" ? "18+ only. We never post anything or share your email." : "Signing in switches this phone to your account."}</Fine>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  barTitle: { fontFamily: font.display, fontSize: 26 },
  hello: { fontFamily: font.display, fontSize: 38, lineHeight: 40 },
  card: { borderRadius: 22, borderWidth: 1.5, padding: 18, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardTitle: { fontFamily: font.display, fontSize: 26 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1 },
  meterLabel: { fontFamily: font.semibold, fontSize: 15 },
  track: { height: 10, borderRadius: 5, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5 },
  premium: { borderRadius: 26, padding: 22, gap: 8 },
  premiumKicker: { fontFamily: font.heavy, fontSize: 11.5, letterSpacing: 1.6 },
  premiumTitle: { fontFamily: font.display, fontSize: 32, lineHeight: 34, marginBottom: 6 },
  perk: { fontFamily: font.body, fontSize: 16 },
  soon: { marginTop: 10, borderWidth: 1.5, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  soonText: { fontFamily: font.semibold, fontSize: 15, opacity: 0.85 },
  input: { fontFamily: font.body, fontSize: 17, paddingVertical: 15, paddingHorizontal: 18, borderRadius: 16, borderWidth: 1.5 },
  err: { fontFamily: font.semibold, fontSize: 15 },
});
