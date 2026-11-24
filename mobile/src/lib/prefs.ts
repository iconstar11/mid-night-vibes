// Small per-device display preferences (no account needed).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

const MOOD_KEY = "mv.showMood"; // "1" when the player chose to show the mood on screen

/** The chosen mood is hidden (blurred) on screen unless the player turns it on. */
export const usePrefs = create<{ showMood: boolean }>(() => ({ showMood: false }));
AsyncStorage.getItem(MOOD_KEY).then((v) => { if (v === "1") usePrefs.setState({ showMood: true }); }).catch(() => {});

export function setShowMood(showMood: boolean) {
  usePrefs.setState({ showMood });
  AsyncStorage.setItem(MOOD_KEY, showMood ? "1" : "0").catch(() => {});
}
