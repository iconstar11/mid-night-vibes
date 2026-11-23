// Free turns for guests: a few cards or spins a day on this device, then they're asked to sign in.
// (The daily reset is deliberately never mentioned to guests.)

export const GUEST_TURNS = 3;

export type TurnCount = { day: string; used: number };

/** Local calendar day, e.g. "2026-11-23". */
export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Try to use one turn. Returns whether it's allowed and the count to store. */
export function takeTurn(stored: TurnCount | null, day: string, limit = GUEST_TURNS): { ok: boolean; next: TurnCount } {
  const used = stored && stored.day === day ? stored.used : 0;
  if (used >= limit) return { ok: false, next: { day, used } };
  return { ok: true, next: { day, used: used + 1 } };
}
