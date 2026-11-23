export type GroupId = "couple" | "friends" | "girls" | "boys";
export type PairId = "mf" | "ff" | "mm" | "any";
export type Sex = "m" | "f" | null;
export type Into = "opp" | "same" | "both";
export type Heat = 1 | 2 | 3;
export type CardType = "truth" | "dare";

/** truth and dare prompts, each split into heat levels [Flirty, Steamy, Spicy] */
export type Deck = Record<CardType, [string[], string[], string[]]>;

/** [label, text per heat level]; one text means the same at every level */
export type Wedge = [string, string[]];

export type Player = { name: string; g: Sex; into: Into };

/** `id`: stable card id (see cards.ts). `source`: where it came from, for stats. */
export type Card = { type: CardType; text: string; ai: boolean; id?: string; source?: "top" | "deck" | "ai" | "tailored" };
