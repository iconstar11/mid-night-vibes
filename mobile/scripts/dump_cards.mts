// Writes every built-in card and wedge with its stable id to ../data/cards.json (for the review sheet and stats).
// Run from mobile/: node scripts/dump_cards.mts
import { mkdirSync, writeFileSync } from "node:fs";

import { cardId } from "../src/game/cards.ts";
import { COUPLE, EXTRA, GROUP, WHEELS } from "../src/game/content.ts";

type Row = { id: string; game: "tod" | "wheel"; group: string; type: string; heat: number; label: string; text: string };
const rows: Row[] = [];
const heats = ["Flirty", "Steamy", "Spicy"];

const decks: [string, typeof COUPLE | undefined][] = [["couple", COUPLE], ["group", GROUP], ["girls", EXTRA.girls], ["boys", EXTRA.boys]];
for (const [group, deck] of decks) {
  if (!deck) continue;
  for (const type of ["truth", "dare"] as const) {
    deck[type].forEach((level, i) => level.forEach((text) => rows.push({ id: cardId(text), game: "tod", group, type, heat: i + 1, label: heats[i], text })));
  }
}
for (const group of ["couple", "group"] as const) {
  for (const [label, texts] of WHEELS[group]) {
    texts.forEach((text, i) => rows.push({ id: cardId(text), game: "wheel", group, type: "wedge", heat: texts.length === 1 ? 0 : i + 1, label, text }));
  }
}

mkdirSync("../data", { recursive: true });
writeFileSync("../data/cards.json", JSON.stringify(rows, null, 1));
const dupes = rows.length - new Set(rows.map((r) => r.id + r.group + r.game)).size;
console.log(`${rows.length} cards written to data/cards.json${dupes ? ` (${dupes} repeated texts share an id)` : ""}`);
