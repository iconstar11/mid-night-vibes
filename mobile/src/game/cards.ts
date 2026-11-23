// Stable ids for cards and wedges, so stars and stats stick to a card across shuffles and releases.
// The id comes from the text (before {target} is filled in): the same card gets the same id everywhere.
// No path aliases or app imports here: scripts/dump_cards.mts runs this file directly with Node.

/** FNV-1a 32-bit, as base 36. Small, fast and stable across platforms. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const normalize = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");

/** Built-in card or wedge text → "c-1x2y3z". */
export const cardId = (text: string) => "c-" + fnv1a(normalize(text));

/** AI-written card → "ai-…" (tracked separately from the built-in cards). */
export const aiCardId = (text: string) => "ai-" + fnv1a(normalize(text));

export type CardSource = "top" | "deck" | "ai" | "tailored";
