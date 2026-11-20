/// <reference types="jest" />
import { COUPLE, GROUP, WHEELS } from "@/game/content";
import { Draw, poolFor } from "@/game/deck";
import { fillTarget, into, matchesFor } from "@/game/match";
import { localMood, moodStems } from "@/game/mood";
import type { Player } from "@/game/types";
import { planSpin, spinTarget, under } from "@/game/wheel";

describe("content", () => {
  it("has 15 couple prompts per heat per type and 8 wedges per wheel", () => {
    for (const t of ["truth", "dare"] as const) COUPLE[t].forEach((l) => expect(l).toHaveLength(15));
    expect(WHEELS.couple).toHaveLength(8);
    expect(WHEELS.group).toHaveLength(8);
  });
  it("group dares use {target} for paired dares", () => {
    expect(GROUP.dare.flat().some((d) => d.includes("{target}"))).toBe(true);
  });
});

describe("deck", () => {
  it("each heat level includes the levels below it", () => {
    expect(poolFor("couple", "dare", 2)).toEqual([...COUPLE.dare[0], ...COUPLE.dare[1]]);
    expect(poolFor("girls", "truth", 1).length).toBeGreaterThan(GROUP.truth[0].length);
  });
  it("never repeats until every prompt has come up", () => {
    const d = new Draw("couple", 3);
    const n = poolFor("couple", "truth", 3).length;
    const seen = new Set(Array.from({ length: n }, () => d.next("truth")));
    expect(seen.size).toBe(n);
    expect(typeof d.next("truth")).toBe("string"); // reshuffles when empty
  });
});

describe("matching", () => {
  const P = (name: string, g: Player["g"], i: Player["into"] = "opp"): Player => ({ name, g, into: i });
  const anto = P("Anto", "m"), bea = P("Bea", "f"), cal = P("Cal", "m"), dee = P("Dee", "f", "same"), eli = P("Eli", "m", "both");
  const all = [anto, bea, cal, dee, eli];
  const names = (p: Player) => matchesFor(p, all).map((x) => x.name);

  it("matches the table from the web version", () => {
    expect(names(anto)).toEqual(["Bea"]);
    expect(names(bea)).toEqual(["Anto", "Cal", "Eli"]);
    expect(names(cal)).toEqual(["Bea"]);
    expect(names(dee)).toEqual([]);
    expect(names(eli)).toEqual(["Bea"]);
  });
  it("treats Rather not say as matching anyone", () => {
    const x = P("Sam", null);
    expect(into(anto, x) && into(x, anto)).toBe(true);
  });
  it("fills {target} or falls back to a willing player", () => {
    expect(fillTarget("Kiss {target}.", anto, all)).toBe("Kiss Bea.");
    expect(fillTarget("Kiss {target}.", dee, all)).toBe("Kiss a willing player.");
    expect(fillTarget("No target here.", dee, all)).toBe("No target here.");
  });
});

describe("mood fallback", () => {
  it("stems words and finds matching built-in prompts", () => {
    expect(moodStems("Kissing at a party")).toEqual(["kiss", "party"]);
    const m = localMood("kissing", "couple", 2)!;
    expect(m.dare.length).toBeGreaterThan(0);
    expect(m.dare.every((t) => t.toLowerCase().includes("kiss"))).toBe(true);
  });
  it("returns null when nothing matches", () => {
    expect(localMood("zzzz", "couple", 1)).toBeNull();
  });
});

describe("wheel", () => {
  it("always lands on the planned wedge, in the planned direction", () => {
    let bad = 0;
    for (let k = 0; k < 20000; k++) {
      const n = k % 2 ? 8 : 6;
      const start = (Math.random() - 0.5) * 200;
      const p = planSpin(n, Math.random(), Math.random() < 0.5 ? 1 : -1, false);
      const { end } = spinTarget(start, n, p);
      if (under(end, n) !== p.win || Math.sign(end - start) !== p.dir) bad++;
    }
    expect(bad).toBe(0);
  });
});
