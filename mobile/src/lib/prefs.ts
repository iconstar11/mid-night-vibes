// Per-device preferences (no account needed): what shows on screen, sounds, and the wheel mode.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

export type WheelMode = "spin" | "misfortune";

type Prefs = {
  /** The chosen mood shows on the game screens (hidden/blurred by default). */
  showMood: boolean;
  /** Game sounds (quiet), on by default. */
  sound: boolean;
  /** Phone vibration on wheel ticks and card picks, on by default. */
  vibration: boolean;
  /** Wheel of Misfortune may include drink forfeits (off by default). */
  drinks: boolean;
  wheelMode: WheelMode;
  /** The "how Misfortune differs" sheet was shown once. */
  misfortuneSeen: boolean;
  /** Heat of the dares added to fill a short pasted list (1 Flirty, 2 Steamy, 3 Spicy). */
  fillHeat: 1 | 2 | 3;
  /** The heat moves up on its own during a game (Flirty → Steamy → Spicy), on by default. */
  heatRise: boolean;
};

const DEFAULTS: Prefs = { showMood: false, sound: true, vibration: true, drinks: false, wheelMode: "spin", misfortuneSeen: false, fillHeat: 2, heatRise: true };
const KEY = "mv.prefs";
const OLD_MOOD_KEY = "mv.showMood"; // earlier versions saved only this

export const usePrefs = create<Prefs>(() => ({ ...DEFAULTS }));

Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(OLD_MOOD_KEY)])
  .then(([raw, oldMood]) => {
    const saved = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    usePrefs.setState({ ...DEFAULTS, ...(oldMood === "1" ? { showMood: true } : {}), ...saved });
  })
  .catch(() => {});

/** Change one or more preferences and save them on the device. */
export function setPrefs(patch: Partial<Prefs>) {
  usePrefs.setState(patch);
  AsyncStorage.setItem(KEY, JSON.stringify(usePrefs.getState())).catch(() => {});
}

export const setShowMood = (showMood: boolean) => setPrefs({ showMood });
