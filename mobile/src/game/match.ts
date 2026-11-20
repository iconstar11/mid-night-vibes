import type { Player } from "./types";

/** Does player a fancy player b? Unknown sex matches anyone. */
export function into(a: Player, b: Player): boolean {
  if (!a.g || !b.g || a.into === "both") return true;
  return a.into === "same" ? a.g === b.g : a.g !== b.g;
}

/** Players (other than `current`) who are into `current` and whom `current` is into. */
export function matchesFor(current: Player, players: Player[]): Player[] {
  return players.filter((p) => p !== current && into(current, p) && into(p, current));
}

/** Fill {target} with a player both sides would be into; otherwise "a willing player". */
export function fillTarget(text: string, current: Player, players: Player[], rand = Math.random): string {
  if (!text.includes("{target}")) return text;
  const fits = matchesFor(current, players);
  const name = fits.length ? fits[Math.floor(rand() * fits.length)].name : "a willing player";
  return text.replaceAll("{target}", name);
}
