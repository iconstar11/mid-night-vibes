// Text that stays hidden unless the player chose to show it: blurred on the web, dots on phones.
// A tap on the eye shows it for a few seconds.
import { useEffect, useState } from "react";
import { Platform, Text, type StyleProp, type TextStyle } from "react-native";

import { usePrefs } from "@/lib/prefs";

const PEEK_MS = 5000;

/** `peekable`: show a small eye that reveals it for a few seconds (off where tapping already opens the mood sheet). */
export function PrivateMood({ text, style, numberOfLines, peekable = true }: { text: string; style?: StyleProp<TextStyle>; numberOfLines?: number; peekable?: boolean }) {
  const show = usePrefs((p) => p.showMood);
  const [peek, setPeek] = useState(false);
  useEffect(() => {
    if (!peek) return;
    const t = setTimeout(() => setPeek(false), PEEK_MS);
    return () => clearTimeout(t);
  }, [peek]);
  if (show || peek) return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  const hidden = Platform.OS === "web"
    ? <Text style={[style, { filter: "blur(6px)", userSelect: "none" } as unknown as TextStyle]} numberOfLines={numberOfLines} aria-hidden>{text}</Text>
    : <Text style={style} numberOfLines={numberOfLines}>{"•".repeat(Math.min(Math.max(text.length, 4), 12))}</Text>;
  if (!peekable) return hidden;
  return (
    <Text numberOfLines={numberOfLines} style={style}>
      {hidden}
      <Text onPress={() => setPeek(true)} accessibilityRole="button" accessibilityLabel="Show the mood for a few seconds" style={{ filter: "none" } as unknown as TextStyle}>{"  👁"}</Text>
    </Text>
  );
}
