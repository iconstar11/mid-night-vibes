import * as Haptics from "expo-haptics";
import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  Easing, cancelAnimation, useAnimatedReaction, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";

import type { Wedge } from "@/game/types";
import { TAU, WINDUP_MS, WINDUP_RAD, easeOutQuint, spinTarget, under, type SpinPlan } from "@/game/wheel";
import { easeIn, to, wait } from "@/lib/anim";
import { font, useColors, type Colors } from "@/theme/tokens";

const SIZE = 760; // drawing units, same as the web canvas
const R = SIZE / 2;
const INNER = R - 34;
const CREAM = "#FFF5F3";
const WEDGE_COLORS = (c: Colors) => [c.wine, c.plum, c.rose, c.plum];

/** The disc: drawn once per wedge set (and highlight), never per frame. */
const Disc = memo(function Disc({ wedges, hi, c }: { wedges: Wedge[]; hi: number; c: Colors }) {
  const n = wedges.length, a = TAU / n;
  const arc = (i: number, r: number) => {
    const a0 = i * a, a1 = (i + 1) * a;
    return `M${R} ${R} L${R + r * Math.cos(a0)} ${R + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${R + r * Math.cos(a1)} ${R + r * Math.sin(a1)} Z`;
  };
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Circle cx={R} cy={R} r={R - 2} fill={c.brass} />
      {wedges.map((w, i) => (
        <G key={i}>
          <Path d={arc(i, INNER)} fill={WEDGE_COLORS(c)[i % 4]} stroke={c.brass} strokeWidth={3} />
          {i === hi && <Path d={arc(i, INNER - 2)} fill="rgba(255,236,200,0.28)" stroke={CREAM} strokeWidth={6} />}
        </G>
      ))}
      {wedges.map((w, i) => {
        const deg = ((i + 0.5) * a * 180) / Math.PI;
        // Shrink long labels (AI wedges) to fit between the hub and the rim
        const room = INNER - 150;
        let size = 44, label = w[0];
        while (label.length * size * 0.43 > room && size > 26) size--;
        while (label.length * size * 0.43 > room && label.length > 3) label = label.slice(0, -2) + "…";
        return (
          <SvgText key={"t" + i} x={INNER - 24} y={0} dy={size * 0.34} fill={CREAM} fontSize={size} fontFamily={font.displayItalic} textAnchor="end"
            transform={`translate(${R} ${R}) rotate(${deg})`}>
            {label}
          </SvgText>
        );
      })}
      {Array.from({ length: n * 2 }, (_, i) => {
        const t = (i * a) / 2;
        return <Circle key={"p" + i} cx={R + Math.cos(t) * (R - 18)} cy={R + Math.sin(t) * (R - 18)} r={6} fill={CREAM} opacity={i % 2 ? 0.55 : 1} />;
      })}
    </Svg>
  );
});

export type WheelHandle = {
  /** Spin to a plan (host or viewer). Resolves with the winning wedge once it has landed and pulsed. */
  spin(plan: SpinPlan): Promise<number>;
  /** Shrink the old disc away and grow the new one in (wedge set changed). */
  swap(apply: () => void): Promise<void>;
};

type Props = {
  wedges: Wedge[];
  hi: number;
  disabled?: boolean;
  /** Tap on Spin, or a flick with enough speed. dir 1 = clockwise. */
  onRequestSpin(power: number, dir: 1 | -1, windup: boolean): void;
};

export const Wheel = forwardRef<WheelHandle, Props>(function Wheel({ wedges, hi, disabled, onRequestSpin }, ref) {
  const c = useColors();
  const reduce = useReducedMotion();
  const n = wedges.length;

  const rot = useSharedValue(0); // radians
  const pulse = useSharedValue(1);
  const swapS = useSharedValue(1);
  const swapO = useSharedValue(1);
  const swapR = useSharedValue(0);
  const pointer = useSharedValue(0);
  const breathe = useSharedValue(0);
  const spinning = useSharedValue(false);
  const dragging = useSharedValue(false);
  const size = useSharedValue(300);
  const prevAngle = useSharedValue(0);
  const lastTick = useRef(0);
  const dirRef = useRef<1 | -1>(1);

  const disc = useAnimatedStyle(() => ({
    opacity: swapO.value,
    transform: [{ rotate: `${rot.value + swapR.value}rad` }, { scale: pulse.value * swapS.value }],
  }));
  const pin = useAnimatedStyle(() => ({ transform: [{ rotate: `${pointer.value}deg` }] }));
  const ring = useAnimatedStyle(() => ({ opacity: breathe.value * 0.9, transform: [{ scale: 1 + breathe.value * 0.18 }] }));

  // Gentle glow around Spin while it's waiting
  useEffect(() => {
    if (!disabled && !reduce) breathe.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true);
    else { cancelAnimation(breathe); breathe.value = withTiming(0); }
  }, [disabled, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pointer ticks as each wedge passes; a soft buzz once it's slowing down
  function tick() {
    const now = Date.now(), gap = now - lastTick.current;
    if (gap < 45) return;
    lastTick.current = now;
    const amp = Math.min(28, 10 + 2600 / Math.max(gap, 60)) * (dirRef.current > 0 ? -1 : 1);
    pointer.value = withSequence(withTiming(amp, { duration: 55 }), withTiming(0, { duration: 110, easing: Easing.out(Easing.quad) }));
    if (gap > 110 && Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  }
  useAnimatedReaction(
    () => under(rot.value, n),
    (i, prev) => { if (prev !== null && i !== prev && (spinning.value || dragging.value)) scheduleOnRN(tick); },
    [n],
  );

  useImperativeHandle(ref, () => ({
    async spin(plan) {
      spinning.value = true;
      dirRef.current = plan.dir;
      if (plan.windup && !reduce) await to(rot, rot.value - plan.dir * WINDUP_RAD, { duration: WINDUP_MS, easing: Easing.out(Easing.quad) });
      const { end, duration } = spinTarget(rot.value, n, plan, reduce);
      await to(rot, end, { duration, easing: easeOutQuint });
      spinning.value = false;
      if (!reduce) { await to(pulse, 1.035, { duration: 190 }); await to(pulse, 1, { duration: 190 }); }
      await wait(reduce ? 0 : 160);
      return plan.win;
    },
    async swap(apply) {
      await Promise.all([to(swapS, 0.6, { duration: 260, easing: easeIn }, reduce), to(swapO, 0, { duration: 260, easing: easeIn }, reduce), to(swapR, -1, { duration: 260, easing: easeIn }, reduce)]);
      apply();
      rot.value = 0; swapR.value = 1.2;
      const back = Easing.bezier(0.2, 0.9, 0.3, 1.15);
      await Promise.all([to(swapS, 1, { duration: 520, easing: back }, reduce), to(swapO, 1, { duration: 520, easing: back }, reduce), to(swapR, 0, { duration: 520, easing: back }, reduce)]);
    },
  }), [n, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flick to spin: the disc follows the finger; a fast release spins it that way
  const pan = usePanGesture({
    enabled: !disabled,
    minDistance: 4,
    onBegin: (e) => {
      "worklet";
      const r = size.value / 2;
      prevAngle.value = Math.atan2(e.y - r, e.x - r);
    },
    onActivate: () => { "worklet"; dragging.value = true; },
    onUpdate: (e) => {
      "worklet";
      const r = size.value / 2;
      const ang = Math.atan2(e.y - r, e.x - r);
      let d = ang - prevAngle.value;
      d = ((d + 3 * Math.PI) % TAU) - Math.PI;
      prevAngle.value = ang;
      rot.value += d;
    },
    onDeactivate: (e) => {
      "worklet";
      dragging.value = false;
      const r = size.value / 2, dx = e.x - r, dy = e.y - r, d2 = Math.max(dx * dx + dy * dy, 400);
      const omega = (dx * e.velocityY - dy * e.velocityX) / d2; // radians per second, clockwise positive
      if (Math.abs(omega) > 3) scheduleOnRN(onRequestSpin, Math.min(Math.abs(omega) / 20, 1), omega > 0 ? 1 : -1, false);
    },
  });

  return (
    <View style={st.wrap}>
      <View style={[st.shadow, { shadowColor: c.plum, backgroundColor: c.plum }]} />
      <GestureDetector gesture={pan}>
        <Animated.View style={[st.disc, disc]} onLayout={(e) => { size.value = e.nativeEvent.layout.width; }}
          accessible accessibilityRole="image" accessibilityLabel={"Wheel: " + wedges.map((w) => w[0]).join(", ")}>
          <Disc wedges={wedges} hi={hi} c={c} />
        </Animated.View>
      </GestureDetector>
      <Animated.View style={[st.pointer, pin]} pointerEvents="none">
        <Svg width={32} height={40} viewBox="0 0 32 40">
          <Path d="M16 39 3 13a13 13 0 1 1 26 0Z" fill={c.ink} />
          <Circle cx={16} cy={12} r={5} fill={c.brass} />
        </Svg>
      </Animated.View>
      <View style={st.hubBox} pointerEvents="box-none">
        <Animated.View style={[st.ring, { backgroundColor: c.brass + "38" }, ring]} pointerEvents="none" />
        <Pressable onPress={() => onRequestSpin(0.5 + Math.random() * 0.3, 1, true)} disabled={disabled} accessibilityRole="button" accessibilityLabel="Spin"
          style={({ pressed }) => [st.hub, { backgroundColor: c.surface, borderColor: c.brass, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
          <Text style={[st.hubText, { color: c.wine }]}>Spin</Text>
        </Pressable>
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  wrap: { width: "100%", maxWidth: 360, aspectRatio: 1, alignSelf: "center" },
  shadow: { position: "absolute", top: "3%", left: "3%", right: "3%", bottom: "3%", borderRadius: 999, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 20 }, elevation: 12 },
  disc: { width: "100%", height: "100%" },
  pointer: { position: "absolute", top: -12, left: "50%", marginLeft: -16, width: 32, height: 40, transformOrigin: ["50%", 12, 0] },
  hubBox: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: "30%", height: "30%", borderRadius: 999 },
  hub: { width: "30%", aspectRatio: 1, borderRadius: 999, borderWidth: 3, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  hubText: { fontFamily: font.displayItalic, fontSize: 30 },
});
