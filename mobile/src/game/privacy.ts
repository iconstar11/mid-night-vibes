// What game stats may contain. Only these property names are kept; everything else is dropped,
// so names, emails, gender/orientation, typed moods and card text can never reach the events table.
export type Value = string | number | boolean | null;

export const ALLOWED_PROPS = new Set([
  "ref", "platform", "installed", "game", "group", "heat", "players_n", "has_mood", "card_id", "type", "source",
  "turn_n", "ms_on_card", "on", "preset", "custom", "reason", "method", "from", "viewers", "product", "plan", "guest", "mode", "found",
  "to", "minutes", "comfort",
]);

/** Keep only allowed, short, plain values. */
export function cleanProps(props: Record<string, unknown>): Record<string, Value> {
  const out: Record<string, Value> = {};
  for (const [k, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(k) || v === undefined) continue;
    if (typeof v === "string") out[k] = v.slice(0, 60);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.round(v * 100) / 100;
    else if (typeof v === "boolean" || v === null) out[k] = v;
  }
  return out;
}
