import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { GateView } from "@/components/Gate";
import { Sheet } from "@/components/Sheet";
import { CardFace, cardLabel, cardTextSize, useCardMotion } from "@/components/TodCard";
import { Wheel, type WheelHandle } from "@/components/Wheel";
import { Btn, Fine, Screen, Title } from "@/components/ui";
import { GROUPS } from "@/game/content";
import { useAuth } from "@/lib/auth";
import { play } from "@/lib/sound";
import { savePending } from "@/lib/pending";
import { track } from "@/lib/track";
import type { Card, Wedge } from "@/game/types";
import { GlossText } from "@/components/GlossText";
import { joinRoom, leaveRoom, onRoomEvent, useRoom, type Result, type RoomEvent, type Snapshot } from "@/lib/room";
import { useGame } from "@/state/store";
import { FLAMES, HEAT_NAMES, font, useColors } from "@/theme/tokens";

/** Live room viewer: midnightvibes.online/r/CODE. Follows the host's game; no controls. */
export default function Viewer() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const adult = useGame((g) => g.adult);
  const [, bump] = useState(0);
  const ready = useAuth((a) => a.ready);
  const email = useAuth((a) => a.email);
  const room = String(code ?? "").toUpperCase();
  const hydrated = useGame((g) => g.hydrated);
  if (!hydrated) return null; // the saved 18+ confirmation is still loading
  if (!adult) return <GateView lead="You've been invited to a live game. Watch along as the host plays." onConfirm={() => bump(1)} />;
  if (!ready) return <Screen><Waiting text="One moment…" /></Screen>;
  if (!email) return <SignInToJoin code={room} />;
  return <Live code={room} />;
}

/** Live games need an account: sign in, then come straight back to this room. */
function SignInToJoin({ code }: { code: string }) {
  return (
    <Screen>
      <Title>Sign in to join this live game.</Title>
      <Fine style={{ textAlign: "left" }}>Live games are for players with a free account. It takes a minute, and you'll come straight back to this room.</Fine>
      <View style={{ marginTop: "auto", gap: 6 }}>
        <Btn label="Sign in or create a free account" onPress={async () => { track("guest_wall", { reason: "room" }); await savePending("room", `/r/${code}`); router.push("/account"); }} />
      </View>
    </Screen>
  );
}

/** Run room events one after another, so a quick sequence of moves still animates in order. */
function useEventQueue(handler: (e: RoomEvent) => Promise<void> | void) {
  const chain = useRef(Promise.resolve());
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => onRoomEvent((e) => {
    chain.current = chain.current.then(() => latest.current(e)).catch(() => {});
  }), []);
}

function Live({ code }: { code: string }) {
  const c = useColors();
  const { width: screenW } = useWindowDimensions();
  const status = useRoom((r) => r.status);
  const error = useRoom((r) => r.error);
  const snap = useRoom((r) => r.snapshot);
  const hostHere = useRoom((r) => r.hostHere);
  const [result, setResult] = useState<Result | null>(null);
  const [hidden, setHidden] = useState(false); // viewer can dismiss the sheet locally
  const showResult = (r: Result | null) => { setResult(r); setHidden(false); };

  useEffect(() => {
    joinRoom(code);
    return () => { leaveRoom(); };
  }, [code]);

  if (status === "closed")
    return (
      <Screen>
        <Title>This room has ended.</Title>
        <Fine style={{ textAlign: "left" }}>The host closed it, or the link is more than 12 hours old.</Fine>
        <View style={{ marginTop: "auto" }}><Btn label="Start your own game" onPress={() => router.replace("/group")} /></View>
      </Screen>
    );
  if (status === "error")
    return (
      <Screen>
        <Title>Couldn't join.</Title>
        <Fine style={{ textAlign: "left" }}>{error}</Fine>
        <View style={{ marginTop: "auto" }}><Btn label="Try again" onPress={() => joinRoom(code)} /></View>
      </Screen>
    );

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={st.bar}>
          <Text style={[st.brand, { color: c.ink }]}>Midnight <Text style={{ color: c.wine, fontFamily: font.displayItalic }}>Vibes</Text></Text>
          <LivePill on={status === "live" && hostHere} />
        </View>
        {!snap ? (
          <Waiting text={status === "connecting" ? "Joining the room…" : "Waiting for the host…"} />
        ) : (
          <>
            <Status snap={snap} hostHere={hostHere} />
            {snap.screen === "tod" ? <ViewTod snap={snap} /> : snap.screen === "wheel" ? <ViewWheel snap={snap} onResult={showResult} /> : <ViewHome snap={snap} />}
          </>
        )}
      </Screen>
      <Sheet open={!!result && !hidden && snap?.screen === "wheel"} onClose={() => setHidden(true)}>
        <Text style={[st.who, { color: c.onAccent }]}>{snap ? whoseTurn(snap) : ""}, this one's yours</Text>
        <Text style={[st.kind, { color: c.brass }]}>{(result?.ai ? "✦ " : "") + (result?.label ?? "")}</Text>
        <GlossText text={result?.text ?? ""} color={c.onAccent} style={[st.text, cardTextSize(result?.text ?? "", screenW, 32), { color: c.onAccent }]} />
        {!!result?.idea && <Text style={[st.note, { color: c.onAccent }]}>{result.idea}</Text>}
        <Text style={[st.note, { color: c.onAccent }]}>The host taps Done when you're finished.</Text>
      </Sheet>
    </View>
  );
}

function LivePill({ on }: { on: boolean }) {
  const c = useColors();
  const v = useSharedValue(1);
  useEffect(() => { v.value = withRepeat(withTiming(0.35, { duration: 900 }), -1, true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const dot = useAnimatedStyle(() => ({ opacity: on ? v.value : 1 }));
  return (
    <View style={[st.pill, { backgroundColor: on ? c.rose : c.surface, borderColor: on ? c.rose : c.line }]}>
      <Animated.View style={[st.pillDot, { backgroundColor: on ? c.onAccent : c.muted }, dot]} />
      <Text style={[st.pillText, { color: on ? c.onAccent : c.muted }]}>{on ? "WATCHING LIVE" : "HOST AWAY"}</Text>
    </View>
  );
}

function Waiting({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={st.waiting}>
      <Text style={[st.moon, { color: c.brass }]}>☾</Text>
      <Text style={[st.waitText, { color: c.muted }]}>{text}</Text>
    </View>
  );
}

const whoseTurn = (s: Snapshot) => s.names[s.turn % Math.max(s.names.length, 1)] ?? "";

/** One line: group · heat · mood, and a note when the host's phone has gone quiet. */
function Status({ snap, hostHere }: { snap: Snapshot; hostHere: boolean }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[st.status, { color: c.muted }]} numberOfLines={1}>
        {GROUPS[snap.group].name} · {HEAT_NAMES[snap.heat - 1]} <Text style={{ color: c.rose }}>{FLAMES[snap.heat - 1]}</Text>
        {snap.mood ? <Text>{"  ·  "}<Text style={{ color: c.brass }}>✦</Text> {snap.mood}</Text> : null}
      </Text>
      {!hostHere && <Text style={[st.status, { color: c.rose }]}>The host's phone went quiet. This picks up again when they're back.</Text>}
    </View>
  );
}

function ViewHome({ snap }: { snap: Snapshot }) {
  const c = useColors();
  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1, gap: 18 }}>
      <Text style={[st.hello, { color: c.ink }]}>
        <Text style={{ color: c.wine, fontFamily: font.displayItalic }}>{snap.names.join(", ")}</Text> are choosing a game.
      </Text>
      <Waiting text="The host's next move shows up here." />
    </Animated.View>
  );
}

function ViewTod({ snap }: { snap: Snapshot }) {
  const motion = useCardMotion();
  const [card, setCard] = useState<Card | null>(snap.card);
  const [shuffleText, setShuffleText] = useState<string | null>(null);
  const me = whoseTurn(snap);

  useEventQueue(async (e) => {
    if (e.t === "tod.card") {
      if (e.random) {
        await motion.shuffle(e.card.type, setShuffleText);
        await new Promise((r) => setTimeout(r, motion.reduce ? 0 : 570)); // the host's pick-tile pulse
      }
      await motion.flip(() => { setShuffleText(null); setCard(e.card); });
    }
    if (e.t === "tod.next") await motion.next(() => setCard(null));
  });

  const who = shuffleText ? `${me}, the deck is choosing` : card ? `${me}, your turn to ${card.type === "truth" ? "tell the truth" : "take the dare"}` : `Round ${snap.turn + 1}`;
  const text = shuffleText ?? card?.text ?? `${me}, truth or dare?`;
  const kind = shuffleText ? "Random" : card ? (card.ai ? "✦ " : "") + cardLabel(card.type) : HEAT_NAMES[snap.heat - 1];
  return (
    <View style={{ flex: 1, paddingBottom: 8 }}>
      <CardFace motion={motion} who={who} text={text} kind={kind} shuffling={!!shuffleText} />
    </View>
  );
}

function ViewWheel({ snap, onResult }: { snap: Snapshot; onResult: (r: Result | null) => void }) {
  const wheel = useRef<WheelHandle>(null);
  const [shown, setShown] = useState<Wedge[]>(snap.wedges);
  const [hi, setHi] = useState(-1);
  const busy = useRef(false);
  useEffect(() => { onResult(snap.result); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The host's wedges changed (AI mood): swap them in when idle
  useEffect(() => {
    if (busy.current || JSON.stringify(snap.wedges) === JSON.stringify(shown)) return;
    wheel.current?.swap(() => { setShown(snap.wedges); setHi(-1); });
  }, [snap.wedges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEventQueue(async (e) => {
    if (e.t === "spin" && wheel.current) {
      busy.current = true;
      onResult(null); setHi(-1);
      const win = await wheel.current.spin(e.plan, e.start);
      setHi(win);
      play(snap.wheelMode === "misfortune" ? "misfortune" : "land");
      busy.current = false;
    }
    if (e.t === "result") { onResult(e.r); if (!e.r) setHi(-1); }
  });

  return (
    <View style={{ flex: 1 }}>
      <View style={st.center}>
        <Wheel ref={wheel} wedges={shown} hi={hi} disabled hubLabel="Live" onRequestSpin={() => {}} theme={snap.wheelMode === "misfortune" ? "misfortune" : "spin"} />
        <Fine>{whoseTurn(snap)}'s turn. The host spins.</Fine>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, gap: 10 },
  brand: { fontFamily: font.display, fontSize: 25 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontFamily: font.heavy, fontSize: 11, letterSpacing: 1 },
  status: { fontFamily: font.semibold, fontSize: 14 },
  hello: { fontFamily: font.display, fontSize: 34, lineHeight: 37 },
  waiting: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  moon: { fontSize: 48 },
  waitText: { fontFamily: font.body, fontSize: 16, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", gap: 16 },
  who: { fontFamily: font.semibold, fontSize: 12.5, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8, textAlign: "center" },
  kind: { fontFamily: font.heavy, fontSize: 12.5, letterSpacing: 1.8, textTransform: "uppercase", textAlign: "center" },
  text: { fontFamily: font.display, fontSize: 32, lineHeight: 36, textAlign: "center", marginVertical: 10 },
  note: { fontFamily: font.body, fontSize: 14, textAlign: "center", opacity: 0.75 },
});
