import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { AdultOnly } from "@/components/Guard";
import { ProfileSettings } from "@/components/ProfileSettings";
import { Btn, Fine, Label, RoundBtn, Screen, Seg } from "@/components/ui";
import { PLAN_NAMES, aiAllowance, refreshAccount,signIn, signInWithGoogle, signOut, signUp, useAuth } from "@/lib/auth";
import { OFFERS, buy, manageBilling, waitForPremium, type Product } from "@/lib/billing";
import { peekPending, type PendingReason } from "@/lib/pending";
import { useProfile } from "@/lib/profile";
import { ensureSession, supabaseReady } from "@/lib/supabase";
import { font, useColors } from "@/theme/tokens";

export default function Account() {
  return <AdultOnly><AccountScreen /></AdultOnly>;
}

function AccountScreen() {
  const c = useColors();
  const { ready, email, name: signUpName, plan } = useAuth();
  const name = useProfile((p) => p.name) || signUpName;
  const { paid } = useLocalSearchParams<{ paid?: string }>();
  const [paying, setPaying] = useState<"waiting" | "done" | "slow" | null>(paid ? "waiting" : null);
  // Sent here mid-game or from a live room: say why, and that they'll carry on afterwards
  const [why, setWhy] = useState<PendingReason | null>(null);
  useEffect(() => { if (!email) peekPending().then((p) => setWhy(p?.reason ?? null)); }, [email]);

  useEffect(() => {
    ensureSession().catch(() => null).then(refreshAccount);
  }, []);
  // Back from Stripe: the webhook switches Premium on within a few seconds
  useEffect(() => {
    if (paid) waitForPremium().then((ok) => setPaying(ok ? "done" : "slow"));
  }, [paid]);

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
        email ? (
          // Signed in: usage, Premium and sign out (no sign-in form)
          <Animated.View key="in" entering={FadeIn.duration(250)} style={{ gap: 18 }}>
            <Text style={[st.hello, { color: c.ink }]}>
              Hi, <Text style={{ color: c.wine, fontFamily: font.displayItalic }}>{name || email.split("@")[0]}</Text>
            </Text>
            <Fine style={{ textAlign: "left", marginTop: -12 }}>{email}</Fine>
            {paying && <PaidNote state={paying} />}
            <Usage />
            <ProfileSettings />
            {plan === "premium" ? <PremiumActive /> : <Premium />}
            <Btn kind="quiet" label="Sign out" onPress={signOut} />
          </Animated.View>
        ) : (
          // Guest: only signing in or creating an account (no usage, no payments)
          <Animated.View key="out" entering={FadeIn.duration(250)} style={{ gap: 18 }}>
            <Text style={[st.hello, { color: c.ink }]}>Playing as a guest</Text>
            <Text style={[st.intro, { color: c.muted }]}>
              {why ? WHY[why] : <>Sign in or create a free account to customize your games with <Text style={{ color: c.brass }}>✦</Text> AI.</>}
            </Text>
            <AuthForm />
          </Animated.View>
        )
      )}
    </Screen>
  );
}

const WHY: Record<PendingReason, string> = {
  turns: "Sign in or create a free account to keep playing. You'll pick up right where you left off.",
  room: "Sign in or create a free account to join this live game. You'll go straight back to the room.",
  host: "Sign in or create a free account to start a live game. You'll go straight back to sharing it.",
  mood: "Sign in or create a free account to customize with AI. Your mood is saved and will be set for you.",
};

/** Plan name and AI moods used in the plan's window as a meter. */
function Usage() {
  const c = useColors();
  const auth = useAuth();
  const { plan, used, limit } = auth;
  const { left, period, next, unit } = aiAllowance(auth);
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
        <Text style={[st.meterLabel, { color: c.muted }]}><Text style={{ color: c.brass }}>✦</Text> {limit} {unit} {period}</Text>
        <Text style={[st.meterLabel, { color: c.ink }]}>{left} left</Text>
      </View>
      <View style={[st.track, { backgroundColor: c.line }]}>
        <Animated.View style={[st.fill, { backgroundColor: pct >= 1 ? c.wine : c.rose }, fill]} />
      </View>
      <Fine style={{ textAlign: "left" }}>
        {next ? `Your next AI mood is ready on ${next}. ` : ""}
        {plan === "free" ? "Premium gets 100 AI moods a day. " : ""}The built-in cards are always unlimited.
      </Fine>
    </View>
  );
}

function PaidNote({ state }: { state: "waiting" | "done" | "slow" }) {
  const c = useColors();
  const text =
    state === "waiting" ? "Payment received. Switching Premium on…"
    : state === "done" ? "You're on Premium. Enjoy!"
    : "Payment received. Premium can take a minute to switch on: reopen this page shortly.";
  return (
    <View style={[st.card, { backgroundColor: c.surface, borderColor: c.brass }]}>
      <Text style={[st.meterLabel, { color: c.ink }]}><Text style={{ color: c.brass }}>✦</Text> {text}</Text>
    </View>
  );
}

const PERKS = ["100 AI moods a day", "AI cards and wheels for any mood", "Every heat level, every group", "Supports a small indie app"];

/** Premium offers: Stripe Checkout on the web. Only signed-in users see this, so Premium stays with their account. */
function Premium() {
  const c = useColors();
  const [busy, setBusy] = useState<Product | null>(null);
  const [error, setError] = useState("");
  async function pick(p: Product) {
    if (busy) return;
    setBusy(p); setError("");
    try { await buy(p); } catch (e) { setError((e as Error).message); }
    setBusy(null);
  }
  return (
    <LinearGradient colors={[c.wine, c.plum]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={st.premium}>
      <Text style={[st.premiumKicker, { color: c.brass }]}>MIDNIGHT VIBES PREMIUM</Text>
      <Text style={[st.premiumTitle, { color: c.onAccent }]}>More moods, more heat.</Text>
      {PERKS.map((p) => (
        <Text key={p} style={[st.perk, { color: c.onAccent }]}><Text style={{ color: c.brass }}>✦  </Text>{p}</Text>
      ))}
      <View style={{ gap: 10, marginTop: 10 }}>
        {OFFERS.map((o) => {
          const best = o.id === "yearly";
          return (
            <Pressable key={o.id} onPress={() => pick(o.id)} disabled={!!busy} accessibilityRole="button"
              accessibilityLabel={`${o.title}, ${o.price} per ${o.per}`}
              style={({ pressed }) => [st.offer, {
                backgroundColor: best ? c.onAccent : "transparent",
                borderColor: best ? c.onAccent : c.onAccent + "66",
                transform: [{ scale: pressed ? 0.98 : 1 }],
              }]}>
              <View style={{ flex: 1 }}>
                <Text style={[st.offerTitle, { color: best ? c.wine : c.onAccent }]}>{o.title}{best ? "  ·  Best value" : ""}</Text>
                <Text style={[st.offerNote, { color: best ? c.muted : c.onAccent }]}>{o.note}</Text>
              </View>
              <Text style={[st.offerPrice, { color: best ? c.wine : c.onAccent }]}>
                {busy === o.id ? "…" : o.price}<Text style={st.offerPer}> / {o.per}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!!error && <Text style={[st.err, { color: c.onAccent }]}>{error}</Text>}
      <Text style={[st.perk, { color: c.onAccent, fontSize: 12.5, opacity: 0.7 }]}>Secure payment by Stripe. Prices in US dollars.</Text>
    </LinearGradient>
  );
}

function PremiumActive() {
  const c = useColors();
  const { premiumUntil, product, canManage } = useAuth();
  const [error, setError] = useState("");
  const until = premiumUntil ? new Date(premiumUntil).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;
  const label = product === "pass" ? "Party pass" : product === "yearly" ? "Yearly plan" : product === "monthly" ? "Monthly plan" : "Premium";
  return (
    <LinearGradient colors={[c.wine, c.plum]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 1 }} style={st.premium}>
      <Text style={[st.premiumKicker, { color: c.brass }]}>YOU'RE ON PREMIUM</Text>
      <Text style={[st.premiumTitle, { color: c.onAccent }]}>{label}</Text>
      {until && <Text style={[st.perk, { color: c.onAccent }]}>{product === "pass" ? "Ends" : "Renews or ends"} {until}</Text>}
      {canManage && (
        <Pressable onPress={() => manageBilling().catch((e) => setError((e as Error).message))} accessibilityRole="button"
          style={[st.soon, { borderColor: c.onAccent + "55" }]}>
          <Text style={[st.soonText, { color: c.onAccent }]}>Manage billing and receipts</Text>
        </Pressable>
      )}
      {!!error && <Text style={[st.err, { color: c.onAccent }]}>{error}</Text>}
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
      <Pressable onPress={async () => { setError(""); const r = await signInWithGoogle(); if (!r.ok) setError(r.error); }}
        accessibilityRole="button"
        style={({ pressed }) => [st.google, { backgroundColor: c.surface, borderColor: c.line, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <Svg width={20} height={20} viewBox="0 0 48 48">
          <Path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6C12.4 13.4 17.7 9.5 24 9.5z" />
          <Path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <Path fill="#FBBC05" d="M10.5 28.8c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6C1 16.5 0 20.1 0 24s1 7.5 2.7 10.8l7.8-6z" />
          <Path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.8 6C6.6 42.6 14.6 48 24 48z" />
        </Svg>
        <Text style={[st.googleText, { color: c.ink }]}>Continue with Google</Text>
      </Pressable>
      <Text style={[st.or, { color: c.muted }]}>or use email</Text>
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
  intro: { fontFamily: font.body, fontSize: 16, lineHeight: 23, marginTop: -8 },
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
  offer: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 },
  offerTitle: { fontFamily: font.heavy, fontSize: 15.5 },
  offerNote: { fontFamily: font.body, fontSize: 13, opacity: 0.85 },
  offerPrice: { fontFamily: font.display, fontSize: 26 },
  offerPer: { fontFamily: font.body, fontSize: 13 },
  google: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderRadius: 999, paddingVertical: 14 },
  googleText: { fontFamily: font.semibold, fontSize: 16 },
  or: { fontFamily: font.body, fontSize: 13.5, textAlign: "center" },
});
