// Wheel maths, shared by the host and by every viewer in a live room so they all land on the same wedge.
// Angles are radians, clockwise, with 0 pointing right (canvas/SVG convention). The pointer sits at the top.

export const TAU = 2 * Math.PI;

/** Index of the wedge under the top pointer when the disc is rotated by `rot`. */
export function under(rot: number, n: number): number {
  "worklet";
  const a = TAU / n;
  return Math.floor(((((-Math.PI / 2 - rot) % TAU) + TAU) % TAU) / a) % n;
}

export type SpinPlan = {
  win: number; // wedge it lands on
  f: number; // where inside the wedge, 0..1 (kept away from the lines)
  power: number; // 0..1: more turns and a longer spin
  dir: 1 | -1; // 1 clockwise
  windup: boolean; // small pull-back before a tap spin
};

export function planSpin(n: number, power: number, dir: 1 | -1, windup: boolean, rand = Math.random): SpinPlan {
  return { win: Math.floor(rand() * n), f: 0.18 + rand() * 0.64, power: Math.min(Math.max(power, 0), 1), dir, windup };
}

export const WINDUP_RAD = 0.22;
export const WINDUP_MS = 200;

/** Where the disc ends up and how long it takes, starting from `start` (after any wind-up). */
export function spinTarget(start: number, n: number, p: SpinPlan, reduceMotion = false) {
  const a = TAU / n;
  const base = -Math.PI / 2 - (p.win + p.f) * a;
  const turns = reduceMotion ? 0 : Math.round(4 + p.power * 4);
  const dist =
    p.dir > 0
      ? (((base - start) % TAU) + TAU) % TAU + turns * TAU
      : -(((((start - base) % TAU) + TAU) % TAU) + turns * TAU);
  return { end: start + dist, duration: reduceMotion ? 1 : 3800 + p.power * 1600 };
}

/** Quintic ease-out: fast start, long gentle coast into the result. */
export function easeOutQuint(t: number): number {
  "worklet";
  return 1 - Math.pow(1 - t, 5);
}
