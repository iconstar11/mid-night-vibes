import { poolFor, shuffle } from "./deck";
import type { CardType, GroupId, Heat } from "./types";

/** Word stems from the mood: "Kissing" -> "kiss". Words under 4 letters are ignored. */
export function moodStems(mood: string): string[] {
  return (mood.toLowerCase().match(/[a-z]{4,}/g) ?? []).map((w) => w.replace(/(ing|es|s)$/, ""));
}

/**
 * Without the AI, pick built-in prompts that mention the mood (e.g. "kissing" finds the kiss dares).
 * Returns null when nothing matches.
 */
export function localMood(mood: string, group: GroupId, heat: Heat): Record<CardType, string[]> | null {
  const stems = moodStems(mood);
  if (!stems.length) return null;
  const pick = (type: CardType) =>
    shuffle(poolFor(group, type, heat).filter((t) => stems.some((s) => t.toLowerCase().includes(s))));
  const out = { truth: pick("truth"), dare: pick("dare") };
  return out.truth.length || out.dare.length ? out : null;
}
