// "Heat rises over time": the warm-up rule, mild-to-bold dealing, and the store's pause / Undo behaviour.
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import { Draw } from "@/game/deck";
import { RISE, comfort, freshRise, shouldRise, turnsNeeded, type Result, type RiseState } from "@/game/heatRise";
import { INTENSITY } from "@/game/intensity";

const MIN = 60_000;
const at = (turns: number, minutes: number, results: Result[], paused = false): RiseState =>
  ({ paused, since: 0, turns, results });
const done = (n: number): Result[] => Array(n).fill("done");

describe("when the heat rises", () => {
  it("waits until everyone has had about two turns", () => {
    expect(turnsNeeded(2)).toBe(6);
    expect(turnsNeeded(6)).toBe(12);
    expect(shouldRise(1, at(5, 20, done(5)), 20 * MIN, 2)).toBe(false);
    expect(shouldRise(1, at(6, 20, done(6)), 20 * MIN, 2)).toBe(true);
    expect(shouldRise(1, at(11, 20, done(11)), 20 * MIN, 6)).toBe(false);
    expect(shouldRise(1, at(12, 20, done(12)), 20 * MIN, 6)).toBe(true);
  });
  it("waits for the minimum time at a level", () => {
    expect(shouldRise(1, at(10, 0, done(10)), (RISE.minMinutes - 1) * MIN, 2)).toBe(false);
    expect(shouldRise(1, at(10, 0, done(10)), RISE.minMinutes * MIN, 2)).toBe(true);
  });
  it("holds while players skip a lot, and the safety cap never fires when most cards are skipped", () => {
    const shaky: Result[] = ["done", "skip", "done", "skip", "done", "done"]; // 4/6 = 67%
    expect(comfort(shaky)).toBeCloseTo(0.667, 2);
    expect(shouldRise(1, at(6, 20, shaky), 20 * MIN, 2)).toBe(false);
    expect(shouldRise(1, at(18, 20, shaky), 20 * MIN, 2)).toBe(true); // 3x the turns, comfort >= 50%
    const nope: Result[] = ["skip", "skip", "done", "skip", "skip", "done"];
    expect(shouldRise(1, at(40, 60, nope), 60 * MIN, 2)).toBe(false);
  });
  it("judges comfort on the last few cards only", () => {
    expect(comfort([...Array(10).fill("skip"), ...done(6)])).toBe(1);
    expect(comfort([])).toBe(1);
  });
  it("never goes past Spicy, and stays put when paused", () => {
    expect(shouldRise(3, at(20, 30, done(20)), 30 * MIN, 2)).toBe(false);
    expect(shouldRise(1, at(20, 30, done(20), true), 30 * MIN, 2)).toBe(false);
    expect(shouldRise(2, at(20, 30, done(20)), 30 * MIN, 2)).toBe(true);
  });
});

describe("mild to bold inside a level", () => {
  const avgFirst = (seed: number, n: number) => {
    let x = seed;
    const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const d = new Draw("couple", 1, rand, new Set());
    const first = Array.from({ length: n }, () => INTENSITY[d.next("dare").id] ?? 3);
    return first.reduce((a, b) => a + b, 0) / n;
  };
  it("deals milder cards first, and the last ones are bolder", () => {
    let x = 7;
    const rand = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const d = new Draw("couple", 1, rand, new Set());
    const all = Array.from({ length: 15 }, () => INTENSITY[d.next("dare").id] ?? 3);
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(avg(all.slice(0, 5))).toBeLessThan(avg(all.slice(-5)));
    expect(avgFirst(7, 5)).toBeLessThan(2.6);
  });
  it("two games don't deal the same order", () => {
    const order = (seed: number) => {
      let x = seed;
      const d = new Draw("couple", 1, () => ((x = (x * 16807) % 2147483647) / 2147483647), new Set());
      return Array.from({ length: 10 }, () => d.next("dare").id).join();
    };
    expect(order(3)).not.toBe(order(11));
  });
});

describe("rising in the store", () => {
  // Loaded here so the AsyncStorage mock is in place first
  const { useGame } = require("@/state/store") as typeof import("@/state/store");
  const { setPrefs } = require("@/lib/prefs") as typeof import("@/lib/prefs");
  const start = () => {
    useGame.getState().startCouple(["Ann", "Ben"]);
    useGame.setState({ heat: 1, rise: { ...freshRise(Date.now() - 30 * MIN) }, riseNote: null });
  };
  beforeEach(() => setPrefs({ heatRise: true }));

  it("moves up after a warm-up and can be undone, which stops rising for the game", () => {
    start();
    for (let i = 0; i < 6; i++) useGame.getState().recordResult("done");
    expect(useGame.getState().heat).toBe(2);
    expect(useGame.getState().riseNote).toMatchObject({ from: 1, to: 2 });
    useGame.getState().undoRise();
    expect(useGame.getState().heat).toBe(1);
    expect(useGame.getState().rise.paused).toBe(true);
    useGame.setState({ rise: { ...useGame.getState().rise, since: Date.now() - 30 * MIN } });
    for (let i = 0; i < 12; i++) useGame.getState().recordResult("done");
    expect(useGame.getState().heat).toBe(1);
  });
  it("a heat picked by hand mid-game stops rising", () => {
    start();
    useGame.getState().recordResult("done");
    useGame.getState().setHeat(2);
    expect(useGame.getState().rise.paused).toBe(true);
  });
  it("the switch in settings turns it off", () => {
    start();
    setPrefs({ heatRise: false });
    for (let i = 0; i < 12; i++) useGame.getState().recordResult("done");
    expect(useGame.getState().heat).toBe(1);
  });
});
