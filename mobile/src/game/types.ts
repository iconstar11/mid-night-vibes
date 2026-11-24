export type GroupId = "couple" | "friends" | "girls" | "boys";
export type PairId = "mf" | "ff" | "mm" | "any";
export type Sex = "m" | "f" | null;
export type Into = "opp" | "same" | "both";
export type Heat = 1 | 2 | 3;
export type CardType = "truth" | "dare";

/** truth and dare prompts, each split into heat levels [Flirty, Steamy, Spicy] */
export type Deck = Record<CardType, [string[], string[], string[]]>;

/** Extra wedge details. `w`: size (1 = normal; thin wedges like Free pass are rarer to land on).
 *  `kind`: "pass" gives a free pass, "again" spins again, "suggest" shows a suggested truth/dare from the deck.
 *  `ai`: written by the AI. `own`: typed by the players. */
/** `fill`: added to top up a short list the players pasted (built-in or AI). */
export type WedgeMeta = { w?: number; kind?: "pass" | "again" | "suggest"; ai?: boolean; own?: boolean; fill?: boolean };

/** [label, text per heat level, details]; one text means the same at every level */
export type Wedge = [string, string[], WedgeMeta?];

export type Player = { name: string; g: Sex; into: Into };

/** `id`: stable card id (see cards.ts). `source`: where it came from, for stats. */
export type Card = { type: CardType; text: string; ai: boolean; id?: string; source?: "top" | "deck" | "ai" | "tailored" };
