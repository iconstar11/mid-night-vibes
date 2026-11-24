// Writes every built-in card and wedge with its stable id to ../data/cards.json (for the review sheet and stats).
// Run from mobile/: node scripts/dump_cards.mts
import { mkdirSync, writeFileSync } from "node:fs";

import { cardId } from "../src/game/cards.ts";
import { COUPLE, EXTRA, GROUP, MISFORTUNE, MISFORTUNE_DRINKS, WHEELS } from "../src/game/content.ts";
import { PROMOTED } from "../src/game/promoted.ts";

type Row = { id: string; game: "tod" | "wheel" | "misfortune"; group: string; type: string; heat: number; label: string; text: string; origin: "built-in" | "promoted AI" };
const rows: Row[] = [];
const heats = ["Flirty", "Steamy", "Spicy"];

const decks: [string, typeof COUPLE | undefined][] = [["couple", COUPLE], ["group", GROUP], ["girls", EXTRA.girls], ["boys", EXTRA.boys]];
for (const [group, deck] of decks) {
  if (!deck) continue;
  for (const type of ["truth", "dare"] as const) {
    deck[type].forEach((level, i) => level.forEach((text) => rows.push({ id: cardId(text), game: "tod", group, type, heat: i + 1, label: heats[i], text, origin: "built-in" })));
  }
}
for (const group of ["couple", "group"] as const) {
  for (const [label, texts] of WHEELS[group]) {
    texts.forEach((text, i) => rows.push({ id: cardId(text), game: "wheel", group, type: "wedge", heat: texts.length === 1 ? 0 : i + 1, label, text, origin: "built-in" }));
  }
}
// Wheel of Misfortune forfeits (and the optional drink wedges), listed as their own game
for (const group of ["couple", "group"] as const) {
  for (const [label, texts] of [...MISFORTUNE[group], ...MISFORTUNE_DRINKS]) {
    texts.forEach((text, i) => rows.push({ id: cardId(text), game: "misfortune", group, type: "wedge", heat: i + 1, label, text, origin: "built-in" }));
  }
}
for (const p of PROMOTED) rows.push({ id: cardId(p.text), game: "tod", group: p.deck, type: p.type, heat: p.heat, label: heats[p.heat - 1], text: p.text, origin: "promoted AI" });

mkdirSync("../data", { recursive: true });
writeFileSync("../data/cards.json", JSON.stringify(rows, null, 1));
// Card text by id for the weekly report (public built-in text only), committed with the functions
const byId: Record<string, { text: string; game: string; group: string; type: string; heat: number }> = {};
for (const r of rows) byId[r.id] ??= { text: r.text, game: r.game, group: r.group, type: r.type, heat: r.heat };
writeFileSync("../supabase/functions/_shared/cards.json", JSON.stringify(byId));
const dupes = rows.length - new Set(rows.map((r) => r.id + r.group + r.game)).size;
console.log(`${rows.length} cards written to data/cards.json${dupes ? ` (${dupes} repeated texts share an id)` : ""}`);
