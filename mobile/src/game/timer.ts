// Finds how long a timed dare lasts from its text, so any card (built-in or AI) can show a countdown.
// "Give a 1-minute massage" → 60, "Kiss for 30 seconds" → 30, "one minute" / "ten seconds" → 60 / 10.

const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45, fifty: 50, sixty: 60, ninety: 90,
};

const NUMBER = `(\\d+(?:\\.\\d+)?|${Object.keys(WORDS).sort((x, y) => y.length - x.length).join("|")}|half\\s+an?)`;
const UNIT = "(seconds?|secs?|minutes?|mins?)";
const PATTERN = new RegExp(`\\b${NUMBER}[\\s-]*${UNIT}\\b`, "i");

const MAX_SECONDS = 10 * 60;

/** Seconds the card asks for, or null if it isn't timed. */
export function durationOf(text: string): number | null {
  const m = PATTERN.exec(text);
  if (!m) return null;
  const raw = m[1].toLowerCase().replace(/\s+/g, " ");
  const n = raw.startsWith("half") ? 0.5 : WORDS[raw] ?? parseFloat(raw);
  const seconds = Math.round(n * (m[2].toLowerCase().startsWith("m") ? 60 : 1));
  return seconds >= 3 && seconds <= MAX_SECONDS ? seconds : null;
}

/** 75 → "1:15" */
export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
