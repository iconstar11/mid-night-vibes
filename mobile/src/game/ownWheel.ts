// "Make your own wheel": when the mood box holds a list (one per line, numbered, bulleted, or split by ;),
// each item becomes a wedge exactly as typed. No AI, no limit on the kind of wedge. "Label: text" sets the label.
// A short list (under FILL_TO) is topped up by the store: AI for signed-in players, built-in dares for guests.
import type { Wedge } from "./types";

export const MIN_WEDGES = 2;
export const MAX_WEDGES = 16;
/** Short lists are filled up to this many wedges. */
export const FILL_TO = 6;

const BULLET = /^\s*(?:[-*•·–]|\(?\d{1,2}[.):]|\d{1,2}\s*-)\s*/;

/** The items of a list, or null when the text isn't a list: 2 or more lines or ;-separated items,
 *  or even one item when it starts with a bullet or a number ("1. Kiss my neck"). One plain sentence is a mood. */
export function listItems(text: string): string[] | null {
  const clean = (a: string[]) => a.map((x) => x.replace(BULLET, "").trim()).filter(Boolean);
  let items = clean(text.split(/\r?\n/));
  if (items.length < 2) items = clean(text.split(";"));
  if (items.length < 2) {
    const numbered = text.split(/(?:^|\s)\d{1,2}[.)]\s+/).map((x) => x.trim()).filter(Boolean);
    if (numbered.length >= 2) items = numbered;
  }
  if (items.length === 1 && !BULLET.test(text)) return null;
  return items.length ? items.slice(0, MAX_WEDGES) : null;
}

/** A short label from the first words (at most 12 letters). */
export function labelFor(text: string): string {
  const words = text.replace(/[^\p{L}\p{N}'’ -]/gu, " ").split(/\s+/).filter(Boolean);
  let label = "";
  for (const w of words) {
    const next = label ? `${label} ${w}` : w;
    if (next.length > 12) break;
    label = next;
  }
  if (!label) label = (words[0] ?? "Wedge").slice(0, 11) + "…";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function wedgeFrom(item: string): Wedge {
  const m = item.match(/^([^:]{1,16}):\s*(.+)$/);
  const [label, text] = m ? [m[1].trim(), m[2].trim()] : [labelFor(item), item];
  return [label.slice(0, 16), [text.slice(0, 220)], { own: true }];
}

/** The players' own wheel from a list in the mood box, or null. */
export function ownWheel(text: string): Wedge[] | null {
  const items = listItems(text);
  return items ? items.map(wedgeFrom) : null;
}
