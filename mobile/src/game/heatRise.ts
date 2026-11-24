// "Heat rises over time": when to move a game up from Flirty to Steamy to Spicy, on its own.
// A warm-up rule that reads the room: everyone has had a couple of turns, some time has passed,
// and players are doing the cards rather than skipping them. Kept free of app state so it can be tested.

export type Result = "done" | "skip";

/** Progress at the current level. `paused`: a hand-picked heat or an Undo turned rising off for this game. */
export type RiseState = { paused: boolean; since: number; turns: number; results: Result[] };

export const RISE = {
  /** At least this many turns at a level… */
  minTurns: 6,
  /** …and at least this many per player, so everyone has had a go. */
  perPlayer: 2,
  /** At least this long at a level, so fast groups don't race to Spicy. */
  minMinutes: 6,
  /** Comfort is judged on the last few cards. */
  window: 6,
  /** Share of those done (not skipped) needed to move up. */
  comfort: 0.7,
  /** Safety cap: after this many times the turns, a lower comfort is enough… */
  capFactor: 3,
  /** …but never while most cards are being skipped. */
  capComfort: 0.5,
};
export type RiseConfig = typeof RISE;

export const freshRise = (now: number): RiseState => ({ paused: false, since: now, turns: 0, results: [] });

export const turnsNeeded = (players: number, cfg: RiseConfig = RISE) => Math.max(cfg.minTurns, cfg.perPlayer * players);

/** Share of the recent cards that were done; 1 when there are none yet. */
export function comfort(results: Result[], cfg: RiseConfig = RISE): number {
  const recent = results.slice(-cfg.window);
  return recent.length ? recent.filter((r) => r === "done").length / recent.length : 1;
}

/** Should the game move up one heat level now? */
export function shouldRise(level: number, s: RiseState, now: number, players: number, cfg: RiseConfig = RISE): boolean {
  if (s.paused || level >= 3) return false;
  const need = turnsNeeded(players, cfg);
  if (s.turns < need || now - s.since < cfg.minMinutes * 60_000) return false;
  const c = comfort(s.results, cfg);
  return c >= cfg.comfort || (s.turns >= need * cfg.capFactor && c >= cfg.capComfort);
}
