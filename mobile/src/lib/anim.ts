import { Easing, withTiming, type SharedValue, type WithTimingConfig } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

/** Animate a shared value and wait for it: `await to(v, 1, { duration: 200 })`. */
export function to(v: SharedValue<number>, value: number, config: WithTimingConfig, reduce = false): Promise<void> {
  if (reduce) { v.value = value; return Promise.resolve(); }
  return new Promise((resolve) => {
    v.value = withTiming(value, config, () => { scheduleOnRN(resolve); });
  });
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const easeIn = Easing.in(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
