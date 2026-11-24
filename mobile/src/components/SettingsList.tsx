// Grouped settings in the style of a premium app: a small-caps header over a rounded card of rows
// split by hairlines. Each row has a tinted icon tile, a title, an optional one-line detail, and a control
// on the right (a switch, a value, a chevron) or underneath (pill options).
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { font, useColors } from "@/theme/tokens";

export type IconName =
  | "user" | "spark" | "heart" | "eye" | "sound" | "vibrate" | "glass" | "flame" | "moon"
  | "shield" | "chart" | "logout" | "plus" | "chevron" | "card" | "calendar" | "crown" | "check" | "edit"
  | "cards" | "wheel" | "people" | "share" | "download" | "rise";

// 24x24 line icons (stroke, round caps), drawn for this app
const PATHS: Record<IconName, string> = {
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20c0-3.3 3.4-6 7.5-6s7.5 2.7 7.5 6",
  spark: "M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5Z M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  sound: "M4 9.5h3.5L12 5.5v13l-4.5-4H4Z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11",
  vibrate: "M8.5 3.5h7a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z M3.5 9v6 M20.5 9v6",
  glass: "M6 3.5h12l-1.4 7.6a4.7 4.7 0 0 1-9.2 0L6 3.5Z M12 15.8v4.7 M8.5 20.5h7",
  flame: "M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 3-5.6 4-9.3 2.6 1.7 3.4 4 3.2 5.8 1-.6 1.7-1.6 2-2.8 1.9 1.7 3.8 3.9 3.8 6.3 0 3.6-2.6 6.2-6.5 6.2Z",
  moon: "M19.5 14.5A7.8 7.8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10Z",
  shield: "M12 3.5l7.5 2.8v5.6c0 4.3-3.2 7.7-7.5 8.6-4.3-.9-7.5-4.3-7.5-8.6V6.3L12 3.5Z M9 12l2.2 2.2L15.5 10",
  chart: "M4 20.5h16 M6.5 17v-5 M11 17V7 M15.5 17v-7.5",
  logout: "M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3 M10 8l-4 4 4 4 M6 12h10",
  plus: "M12 5.5v13 M5.5 12h13",
  chevron: "M9.5 6l6 6-6 6",
  card: "M3.5 7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v10a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 17V7Z M3.5 10h17 M7 15h3",
  calendar: "M4.5 7A1.5 1.5 0 0 1 6 5.5h12A1.5 1.5 0 0 1 19.5 7v11.5a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V7Z M4.5 10h15 M8.5 3.5v4 M15.5 3.5v4",
  crown: "M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10H4Z M4 20.5h16",
  check: "M5 12.5l4.5 4.5L19 7.5",
  edit: "M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.9 0l.3.3a2 2 0 0 1 0 2.9L8.7 18.5l-4.2 1Z M13.5 7.5l3 3",
  cards: "M8 6.5A1.5 1.5 0 0 1 9.5 5h9A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 8 18.5v-12Z M8 7.5 5.2 8.3a1.5 1.5 0 0 0-1 1.8l2.6 9.4",
  wheel: "M12 20.5a8.5 8.5 0 1 0 0-17 8.5 8.5 0 0 0 0 17Z M12 3.5v17 M3.5 12h17 M6 6l12 12 M18 6 6 18",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20c0-3 2.9-5.5 6.5-5.5s6.5 2.5 6.5 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.8c2 .7 3.5 2.6 3.5 5.2",
  share: "M12 15V4 M8 7.5 12 3.5l4 4 M5.5 12v6.5a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V12",
  download: "M12 4v11 M8 11l4 4 4-4 M5 19.5h14",
  rise: "M3.5 17.5l6-6 4 4 7-7.5 M15 8h5.5v5.5",
};

export function Icon({ name, color, size = 18, width = 1.9 }: { name: IconName; color: string; size?: number; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A titled group of rows. `aside` sits at the right of the title (e.g. a "Saved" note). */
export function Section({ title, aside, footer, children }: { title?: string; aside?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  const c = useColors();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: 8 }}>
      {(title || aside) && (
        <View style={st.headRow}>
          {!!title && <Text style={[st.head, { color: c.muted }]} accessibilityRole="header">{title}</Text>}
          {aside}
        </View>
      )}
      <View style={[st.group, { backgroundColor: c.surface, borderColor: c.line, boxShadow: `0 10px 28px ${c.plum}22` }]}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={[st.rule, { backgroundColor: c.line }]} />}
            {row}
          </Fragment>
        ))}
      </View>
      {!!footer && <Text style={[st.foot, { color: c.muted }]}>{footer}</Text>}
    </View>
  );
}

type RowProps = {
  icon?: IconName;
  /** Instead of an icon tile, e.g. a player's initial. */
  lead?: ReactNode;
  /** Icon tile colour (brand colours); defaults to rose. */
  tint?: string;
  title: string;
  detail?: string;
  /** A control or value on the right. */
  right?: ReactNode;
  /** Pill options or a form under the title. */
  below?: ReactNode;
  onPress?: () => void;
  /** Rose title, e.g. Sign out. */
  danger?: boolean;
  a11y?: string;
};

export function Row({ icon, lead, tint, title, detail, right, below, onPress, danger, a11y }: RowProps) {
  const c = useColors();
  const body = (
    <View style={st.row}>
      <View style={st.rowTop}>
        {lead}
        {!lead && icon && (
          <View style={[st.tile, { backgroundColor: tint ?? c.rose }]}>
            <Icon name={icon} color="#FFF5F3" size={17} width={2} />
          </View>
        )}
        <View style={st.text}>
          <Text style={[st.title, { color: danger ? c.rose : c.ink }]}>{title}</Text>
          {!!detail && <Text style={[st.detail, { color: c.muted }]}>{detail}</Text>}
        </View>
        {right}
        {onPress && !right && !danger && <Icon name="chevron" color={c.muted} size={18} />}
      </View>
      {below && <View style={icon ? st.belowIndent : null}>{below}</View>}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? title}
      style={({ pressed }) => (pressed ? { backgroundColor: c.line + "66" } : null)}>
      {body}
    </Pressable>
  );
}

/** On/off switch in the brand colours. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors();
  return (
    <Switch value={value} onValueChange={onChange} accessibilityLabel={label}
      trackColor={{ false: c.line, true: c.rose }} thumbColor="#FFF5F3" ios_backgroundColor={c.line}
      {...({ activeThumbColor: "#FFF5F3" } as object)} />
  );
}

/** A plain value on the right of a row. */
export function Value({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[st.value, { color: c.muted }]} numberOfLines={1}>{children}</Text>;
}

const st = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, minHeight: 18 },
  head: { fontFamily: font.heavy, fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase" },
  group: { borderRadius: 22, borderCurve: "continuous", borderWidth: 1, overflow: "hidden" },
  rule: { height: 1, marginLeft: 62, opacity: 0.8 },
  row: { paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 34 },
  tile: { width: 32, height: 32, borderRadius: 10, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: font.semibold, fontSize: 16 },
  detail: { fontFamily: font.body, fontSize: 13, lineHeight: 18 },
  belowIndent: { paddingLeft: 46 },
  foot: { fontFamily: font.body, fontSize: 12.5, lineHeight: 18, paddingHorizontal: 6 },
  value: { fontFamily: font.semibold, fontSize: 15, maxWidth: 170 },
});
