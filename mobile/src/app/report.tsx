// The owner's weekly report: last 7 days vs the 7 before. Only for signed-in owners (checked by the server too).
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { Btn, Fine, RoundBtn, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ensureSession, supabase } from "@/lib/supabase";
import { font, useColors } from "@/theme/tokens";

// deno-style loose JSON from the weekly-report function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Period = Record<string, any>;
type CardRow = { card_id: string; text: string; shown: number; stars: number; done: number; skip_rate: number; score: number };
type Report = { generated: string; current: Period; previous: Period };

const TILES: [string, string][] = [
  ["played_5_plus", "Played 5+ cards ★"], ["visitors", "Visitors"], ["new_visitors", "New"], ["returning", "Returning"],
  ["started_a_game", "Started a game"], ["cards_shown", "Cards shown"], ["guest_walls", "Guest wall"], ["signups", "Sign-ups"],
  ["rooms_started", "Live rooms"], ["premium_views", "Saw Premium"], ["checkouts", "Checkouts"], ["premium_started", "New Premium"],
];

const pct = (x: number | null | undefined) => (x == null ? "–" : `${Math.round(x * 100)}%`);

export default function ReportScreen() {
  const c = useColors();
  const { ready, email } = useAuth();
  const [state, setState] = useState<"loading" | "denied" | "error" | "ok">("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !email || !supabase) return;
    (async () => {
      await ensureSession();
      const { data: owner } = await supabase.rpc("is_owner");
      if (!owner) { setState("denied"); return; }
      const { data, error: err } = await supabase.functions.invoke<Report>("weekly-report", { method: "GET" });
      if (err || !data) { setError("Couldn't load the report. Try again in a moment."); setState("error"); return; }
      setReport(data); setState("ok");
    })().catch(() => { setError("Couldn't load the report."); setState("error"); });
  }, [ready, email]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/account"));
  const bar = (
    <View style={st.bar}>
      <RoundBtn label="‹" a11y="Back" onPress={back} />
      <Text style={[st.barTitle, { color: c.ink }]}>Weekly report</Text>
      <View style={{ width: 44 }} />
    </View>
  );

  if (ready && !email)
    return (
      <Screen>
        {bar}
        <Fine style={{ textAlign: "left" }}>Sign in with the owner account to see the report.</Fine>
        <View style={{ marginTop: "auto" }}><Btn label="Sign in" onPress={() => router.replace("/account")} /></View>
      </Screen>
    );
  if (state === "denied") return <Screen>{bar}<Fine style={{ textAlign: "left" }}>This account can't see the report.</Fine></Screen>;
  if (state === "error") return <Screen>{bar}<Fine style={{ textAlign: "left" }}>{error}</Fine></Screen>;
  if (!report) return <Screen>{bar}<ActivityIndicator color={c.rose} style={{ marginTop: 40 }} /></Screen>;

  const cur = report.current, prev = report.previous;
  const delta = (k: string) => {
    const a = cur[k] ?? 0, b = prev[k] ?? 0;
    if (!b) return { t: a ? "new" : "–", color: c.muted };
    const d = Math.round(((a - b) / b) * 100);
    return { t: `${d > 0 ? "+" : ""}${d}%`, color: d > 0 ? "#2E9E5B" : d < 0 ? c.rose : c.muted };
  };

  return (
    <Screen scroll>
      {bar}
      <Fine style={{ textAlign: "left", marginTop: -8 }}>
        Last 7 days vs the 7 before · {new Date(report.generated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
      </Fine>

      <View style={st.grid}>
        {TILES.map(([k, label], i) => {
          const d = delta(k);
          return (
            <View key={k} style={[st.tile, { backgroundColor: c.surface, borderColor: i === 0 ? c.brass : c.line }]}>
              <Text style={[st.tileLabel, { color: c.muted }]} numberOfLines={1}>{label}</Text>
              <Text style={[st.tileNum, { color: c.ink }]}>{cur[k] ?? 0}</Text>
              <Text style={[st.tileDelta, { color: d.color }]}>{d.t}</Text>
            </View>
          );
        })}
      </View>

      <Section title="Best cards (5+ plays)"><Cards rows={cur.top_cards} /></Section>
      <Section title="Most skipped"><Cards rows={cur.most_skipped} /></Section>
      <Section title="Where cards came from">
        <Rows empty={!cur.by_source?.length} rows={(cur.by_source ?? []).map((s: Period) => [s.source, `${s.shown} shown · ★ ${pct(s.star_rate)} · done ${pct(s.done_rate)} · skipped ${pct(s.skip_rate)}`])} />
      </Section>
      <Section title="Links (?ref=)">
        <Rows empty={!cur.by_ref?.length} rows={(cur.by_ref ?? []).map((r: Period) => [r.ref, `${r.visitors} visitors · ${r.signups} sign-ups`])} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[st.h, { color: c.muted }]}>{title}</Text>
      <View style={[st.box, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>
    </View>
  );
}

function Cards({ rows }: { rows?: CardRow[] }) {
  const c = useColors();
  if (!rows?.length) return <Fine style={{ textAlign: "left" }}>Not enough plays yet.</Fine>;
  return (
    <>
      {rows.map((r, i) => (
        <View key={r.card_id} style={[st.row, i > 0 && { borderTopWidth: 1, borderColor: c.line }]}>
          <Text style={[st.rowText, { color: c.ink }]}>{r.text}</Text>
          <Text style={[st.rowMeta, { color: c.muted }]}>{r.shown} shown · {r.stars}★ · {r.done} done · {pct(r.skip_rate)} skipped</Text>
        </View>
      ))}
    </>
  );
}

function Rows({ rows, empty }: { rows: [string, string][]; empty: boolean }) {
  const c = useColors();
  if (empty) return <Fine style={{ textAlign: "left" }}>Nothing yet.</Fine>;
  return (
    <>
      {rows.map(([a, b], i) => (
        <View key={a + i} style={[st.row, i > 0 && { borderTopWidth: 1, borderColor: c.line }]}>
          <Text style={[st.rowText, { color: c.ink }]}>{a}</Text>
          <Text style={[st.rowMeta, { color: c.muted }]}>{b}</Text>
        </View>
      ))}
    </>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
  barTitle: { fontFamily: font.display, fontSize: 26 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "30%", minWidth: 120, borderWidth: 1.5, borderRadius: 16, padding: 12 },
  tileLabel: { fontFamily: font.semibold, fontSize: 12.5 },
  tileNum: { fontFamily: font.heavy, fontSize: 26, fontVariant: ["tabular-nums"] },
  tileDelta: { fontFamily: font.semibold, fontSize: 12.5 },
  h: { fontFamily: font.heavy, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase" },
  box: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 },
  row: { paddingVertical: 10, gap: 2 },
  rowText: { fontFamily: font.body, fontSize: 15 },
  rowMeta: { fontFamily: font.body, fontSize: 13, fontVariant: ["tabular-nums"] },
});
