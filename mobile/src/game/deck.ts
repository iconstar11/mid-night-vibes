import { COUPLE, EXTRA, GROUP } from "./content";
import type { CardType, GroupId, Heat } from "./types";

export function shuffle<T>(list: readonly T[], rand = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Every built-in prompt of a type for this group, up to and including the heat level. */
export function poolFor(group: GroupId, type: CardType, heat: Heat): string[] {
  const pool: string[] = [];
  for (let l = 0; l < heat; l++) {
    if (group === "couple") pool.push(...COUPLE[type][l]);
    else {
      pool.push(...GROUP[type][l]);
      const extra = EXTRA[group];
      if (extra) pool.push(...extra[type][l]);
    }
  }
  return pool;
}

/**
 * Shuffled draw piles: no prompt repeats until every prompt at the current heat has come up.
 * Create a new one when the group or heat changes.
 */
export class Draw {
  private piles: Partial<Record<CardType, string[]>> = {};
  constructor(private group: GroupId, private heat: Heat, private rand = Math.random) {}

  next(type: CardType): string {
    let pile = this.piles[type];
    if (!pile || !pile.length) pile = this.piles[type] = shuffle(poolFor(this.group, type, this.heat), this.rand);
    return pile.pop()!;
  }
}
