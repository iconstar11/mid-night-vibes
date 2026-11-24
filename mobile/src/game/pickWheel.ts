// Which wedges a wheel shows (shared by the wheel screen and live rooms). Kept free of app state so it can be tested.
import { misfortuneWheel, spinWheel } from "./content";
import type { CardType, GroupId, Wedge } from "./types";

export type WheelKind = "spin" | "misfortune";

type Inputs = {
  group: GroupId;
  ai: { state: string; tod?: Record<CardType, string[]> | null; wheel: Wedge[] | null };
  edited: Partial<Record<WheelKind, Wedge[] | null>>;
  aiMisfortune: Wedge[] | null;
  /** Picks which built-in wedges this game shows (new each game). */
  wheelSeed?: number;
};

/** The wheel to show: edited by hand > the players' own list > AI for the mood > built-in; plus the thin wedges.
 *  Returns the same array for the same inputs, so it's safe in a selector. */
export function wheelFor(s: Inputs, kind: WheelKind, drinks: boolean): Wedge[] {
  const edited = s.edited[kind];
  if (edited?.length) return edited;
  if (s.ai.state === "own" && s.ai.wheel?.length) return s.ai.wheel;
  const deck = s.group === "couple" ? "couple" : "group";
  return kind === "misfortune" ? misfortuneWheel(deck, drinks, s.aiMisfortune, s.wheelSeed) : spinWheel(deck, s.ai.wheel, s.wheelSeed);
}

