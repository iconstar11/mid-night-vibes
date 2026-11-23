import { useEffect, useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { router } from "expo-router";

import { useAuth } from "@/lib/auth";
import { savePending } from "@/lib/pending";
import { track } from "@/lib/track";
import { roomLink, startHosting, stopHosting, useRoom } from "@/lib/room";
import { font, useColors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { Btn, Fine } from "./ui";

/** Host: open a live room and show its link + QR code. Everyone who opens it follows the game. */
export function ShareRoom({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useColors();
  const { code, status, error, viewers } = useRoom();
  const [copied, setCopied] = useState(false);
  const email = useAuth((a) => a.email); // live games need an account

  useEffect(() => {
    if (open && !code && email) startHosting().catch(() => {});
  }, [open, email]); // eslint-disable-line react-hooks/exhaustive-deps

  const link = code ? roomLink(code) : "";
  async function share() {
    if (!link) return;
    if (Platform.OS === "web") {
      try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
      return;
    }
    Share.share({ message: `Join our Midnight Vibes game: ${link}` }).catch(() => {});
  }

  return (
    <Sheet open={open} onClose={onClose} tone="light">
      <Text style={[st.h, { color: c.ink }]} accessibilityRole="header">Play together</Text>
      <Fine style={{ textAlign: "left" }}>Friends scan this or open the link to follow your game live on their phones. Only you control it.</Fine>

      {!email && (
        <>
          <Fine style={{ textAlign: "left" }}>Live games need a free account, for you and the people joining. You'll come straight back here after signing in.</Fine>
          <Btn label="Sign in to start a live game" onPress={async () => { track("guest_wall", { reason: "host" }); onClose(); await savePending("host", "/home?share=1"); router.push("/account"); }} />
        </>
      )}

      {status === "connecting" && <Fine>Opening a room…</Fine>}
      {status === "error" && <Text style={[st.err, { color: c.rose }]}>{error}</Text>}
      {code && status === "live" && (
        <>
          <View style={[st.qrBox, { backgroundColor: "#FFF5F3", borderColor: c.line }]}>
            <QRCode value={link} size={176} color="#3B0D1C" backgroundColor="#FFF5F3" />
          </View>
          <Text selectable style={[st.link, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }]} numberOfLines={1}>{link}</Text>
          <View style={st.row}>
            <View style={[st.dot, { backgroundColor: viewers ? "#3BB273" : c.muted }]} />
            <Text style={[st.count, { color: c.muted }]}>{viewers === 1 ? "1 person watching" : `${viewers} people watching`} · code {code}</Text>
          </View>
          <Btn label={Platform.OS === "web" ? (copied ? "Link copied" : "Copy link") : "Share link"} onPress={share} />
          <Btn kind="quiet" label="End the room" onPress={() => { stopHosting(); onClose(); }} />
        </>
      )}
    </Sheet>
  );
}

const st = StyleSheet.create({
  h: { fontFamily: font.display, fontSize: 32, lineHeight: 34 },
  err: { fontFamily: font.semibold, fontSize: 15 },
  qrBox: { alignSelf: "center", padding: 14, borderRadius: 22, borderWidth: 1.5 },
  link: { fontFamily: font.semibold, fontSize: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  count: { fontFamily: font.body, fontSize: 14 },
});
