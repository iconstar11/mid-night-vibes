import { cardId } from "./cards";
import { INTENSITY } from "./intensity";
import { COUPLE, EXTRA, GROUP } from "./content";
import { PROMOTED } from "./promoted";
import { TOP_PICKS } from "./topPicks";
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

/** Same as poolFor, but each prompt with its heat level (1-3). */
function levelledPool(group: GroupId, type: CardType, heat: Heat): { text: string; level: number }[] {
  const out: { text: string; level: number }[] = [];
  for (let l = 0; l < heat; l++) {
    const decks = group === "couple" ? [COUPLE] : [GROUP, EXTRA[group]];
    for (const d of decks) if (d) for (const text of d[type][l]) out.push({ text, level: l + 1 });
  }
  // AI cards you promoted to the deck (girls'/boys' nights also get the shared group ones)
  for (const p of PROMOTED) {
    const fits = group === "couple" ? p.deck === "couple" : p.deck === "group" || p.deck === group;
    if (fits && p.type === type && p.heat <= heat) out.push({ text: p.text, level: p.heat });
  }
  return out;
}

export type Drawn = { text: string; id: string; top: boolean };

/**
 * Draw piles: no prompt repeats until every prompt at the current heat has come up.
 * Top picks come first (those at the chosen heat before lower ones), so the first cards are the best.
 * Then the level's cards go from mild to bold (intensity score plus some randomness), so the game builds up;
 * cards from lower levels turn up at random places in between. Create a new one when the group or heat changes.
 */
export class Draw {
  private piles: Partial<Record<CardType, Drawn[]>> = {};
  constructor(
    private group: GroupId, private heat: Heat, private rand = Math.random, private top: ReadonlySet<string> = TOP_PICKS,
    private intensity: Readonly<Record<string, number>> = INTENSITY,
  ) {}

  next(type: CardType): Drawn {
    let pile = this.piles[type];
    if (!pile || !pile.length) {
      const all = levelledPool(this.group, type, this.heat).map((p) => ({ ...p, id: cardId(p.text) }));
      const rest = all.filter((p) => !this.top.has(p.id));
      const topLower = all.filter((p) => this.top.has(p.id) && p.level < this.heat);
      const topHere = all.filter((p) => this.top.has(p.id) && p.level === this.heat);
      // Mild to bold: this level's cards by intensity ±1.5, lower-level cards anywhere (lowest key is dealt first)
      const keyed = rest.map((p) => ({ p, k: p.level === this.heat ? (this.intensity[p.id] ?? 3) + this.rand() * 3 - 1.5 : 0.5 + this.rand() * 5 }));
      keyed.sort((a, b) => b.k - a.k);
      // pop() takes from the end: top picks at this heat first, then lower-heat top picks, then the rest
      pile = this.piles[type] = [...keyed.map((x) => x.p), ...shuffle(topLower, this.rand), ...shuffle(topHere, this.rand)]
        .map(({ text, id }) => ({ text, id, top: this.top.has(id) }));
    }
    return pile.pop()!;
  }
}
