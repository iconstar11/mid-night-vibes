// ☆ / ★ on a card or wheel result: "I love this one". Helps find the best cards (and tailors Premium AI picks).
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";

import type { CardSource } from "@/game/cards";
import { useAuth } from "@/lib/auth";
import { buzz, play } from "@/lib/sound";
import { toggleStar, useStars } from "@/lib/stars";
import { useGame } from "@/state/store";
import { useColors } from "@/theme/tokens";

type Props = {
  card: { id?: string; source?: CardSource; type?: string };
  game: "tod" | "wheel";
  heat: number;
  /** Corner of the card (absolute) or inline in a row */
  corner?: boolean;
};

export function StarButton({ card, game, heat, corner }: Props) {
  const c = useColors();
  const on = useStars((s) => !!card.id && s.list.some((x) => x.id === card.id));
  const pop = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  if (!card.id) return null;

  const press = () => {
    toggleStar({ id: card.id!, source: card.source, game, type: card.type, heat, group: useGame.getState().group, guest: !useAuth.getState().email });
    if (!on) play("star");
    buzz("pick");
    pop.value = withSequence(withTiming(1.35, { duration: 120 }), withTiming(1, { duration: 160 }));
  };

  return (
    <Pressable onPress={press} hitSlop={10} accessibilityRole="button" accessibilityState={{ selected: on }}
      accessibilityLabel={on ? "Starred. Tap to remove the star" : "Star this one if you love it"}
      style={[corner ? st.corner : st.inline, { backgroundColor: c.onAccent + (on ? "26" : "14"), borderColor: on ? c.brass : c.onAccent + "40" }]}>
      <Animated.View style={a}>
        <Text style={[st.star, { color: on ? c.brass : c.onAccent }]}>{on ? "★" : "☆"}</Text>
      </Animated.View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  corner: { position: "absolute", top: 14, right: 14, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center", zIndex: 2 },
  inline: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  star: { fontSize: 21, lineHeight: 24 },
});
