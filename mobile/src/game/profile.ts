// Auto-fill for game setup from what the signed-in user confirmed: their profile and players they saved.
// Never guesses he/she from a name.
import type { Into, PairId, Sex } from "./types";

export type Person = { name: string; g: Sex; into: Into };

/** The couple's "You are" option, only when both genders are known. */
export function pairFrom(a: Sex, b: Sex): PairId | null {
  if (!a || !b) return null;
  if (a !== b) return "mf";
  return a === "f" ? "ff" : "mm";
}

/**
 * Names for the couple screen's two fields (Him / Her order for "mf") and the pair to preselect.
 * `pair` is null when it can't be told from the genders: keep whatever is selected.
 */
export function couplePrefill(me: Person, partner: Person | null, current: PairId): { a: string; b: string; pair: PairId | null } {
  const pair = partner ? pairFrom(me.g, partner.g) : null;
  const mf = (pair ?? current) === "mf";
  const meSecond = mf && me.g === "f"; // "Her" is the second field
  const other = partner?.name ?? "";
  return meSecond ? { a: other, b: me.name, pair } : { a: me.name, b: other, pair };
}
