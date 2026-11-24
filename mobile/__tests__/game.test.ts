/// <reference types="jest" />
import { COUPLE, GROUP, WHEELS } from "@/game/content";
import { cardId } from "@/game/cards";
import { Draw, poolFor } from "@/game/deck";
import { TOP_PICKS } from "@/game/topPicks";
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
    const seen = new Set(Array.from({ length: n }, () => d.next("truth").text));
    expect(seen.size).toBe(n);
    expect(typeof d.next("truth").text).toBe("string"); // reshuffles when empty
  });
  it("draws top picks first: this heat's, then lower heats', then the rest", () => {
    const pool = poolFor("couple", "dare", 2);
    const top = new Set([cardId(COUPLE.dare[1][0]), cardId(COUPLE.dare[1][1]), cardId(COUPLE.dare[0][0])]);
    const d = new Draw("couple", 2, Math.random, top);
    const first = [d.next("dare"), d.next("dare"), d.next("dare")];
    expect(first.slice(0, 2).map((x) => x.text).sort()).toEqual([COUPLE.dare[1][0], COUPLE.dare[1][1]].sort());
    expect(first[2].text).toBe(COUPLE.dare[0][0]);
    expect(first.every((x) => x.top)).toBe(true);
    const rest = Array.from({ length: pool.length - 3 }, () => d.next("dare"));
    expect(rest.some((x) => x.top)).toBe(false);
  });
});

describe("card ids", () => {
  it("are stable and ignore case and spacing", () => {
    expect(cardId("Kiss  your partner. ")).toBe(cardId("kiss your partner."));
    expect(cardId("a")).not.toBe(cardId("b"));
    expect(cardId("Hold eye contact for 30 seconds without laughing.")).toMatch(/^c-[0-9a-z]+$/);
  });
  it("every top pick is a real built-in card", () => {
    const all = new Set<string>();
    for (const d of [COUPLE, GROUP]) for (const t of ["truth", "dare"] as const) d[t].flat().forEach((x) => all.add(cardId(x)));
    for (const g of ["couple", "group"] as const) WHEELS[g].forEach(([, texts]) => texts.forEach((x) => all.add(cardId(x))));
    for (const id of TOP_PICKS) expect(all.has(id)).toBe(true);
  });
});

describe("wheel top picks", () => {
  it("lands on a preferred wedge when given", () => {
    for (let i = 0; i < 50; i++) expect([2, 5]).toContain(planSpin(8, 0.5, 1, false, Math.random, [2, 5]).win);
    expect(planSpin(8, 0.5, 1, false, Math.random, []).win).toBeLessThan(8);
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

import { clock, durationOf } from "@/game/timer";

describe("timer", () => {
  it("reads durations from card text", () => {
    expect(durationOf("Give a 1-minute massage wherever they choose, above the waist.")).toBe(60);
    expect(durationOf("Give your partner a one-minute foot massage.")).toBe(60);
    expect(durationOf("Kiss your partner for 30 seconds without stopping.")).toBe(30);
    expect(durationOf("Kiss your partner's shoulder for ten seconds.")).toBe(10);
    expect(durationOf("Give a 2-minute massage wherever they choose.")).toBe(120);
    expect(durationOf("Dance for half a minute.")).toBe(30);
    expect(durationOf("Massage them for a minute.")).toBe(60);
    expect(durationOf("Do a 90 sec plank.")).toBe(90);
  });
  it("ignores cards without a usable time", () => {
    expect(durationOf("What's your biggest turn-on?")).toBeNull();
    expect(durationOf("Wait one second.")).toBeNull(); // too short to time
    expect(durationOf("Stay like this for 30 minutes.")).toBeNull(); // over the 10-minute cap
    expect(durationOf("Do five push-ups.")).toBeNull();
  });
  it("formats the clock", () => {
    expect(clock(60)).toBe("1:00");
    expect(clock(75)).toBe("1:15");
    expect(clock(9)).toBe("0:09");
  });
});

import { couplePrefill, pairFrom } from "@/game/profile";

describe("profile auto-fill", () => {
  const he = { name: "Antony", g: "m" as const, into: "opp" as const };
  const she = { name: "Wanjiru", g: "f" as const, into: "opp" as const };
  it("only picks the couple type when both genders are known", () => {
    expect(pairFrom("m", "f")).toBe("mf");
    expect(pairFrom("f", "m")).toBe("mf");
    expect(pairFrom("f", "f")).toBe("ff");
    expect(pairFrom("m", "m")).toBe("mm");
    expect(pairFrom("m", null)).toBeNull();
    expect(pairFrom(null, null)).toBeNull();
  });
  it("puts each name in the matching field and never fills a partner by itself", () => {
    expect(couplePrefill(he, null, "mf")).toEqual({ a: "Antony", b: "", pair: null });
    expect(couplePrefill(she, null, "mf")).toEqual({ a: "", b: "Wanjiru", pair: null }); // "Her" is the second field
    expect(couplePrefill(she, he, "any")).toEqual({ a: "Antony", b: "Wanjiru", pair: "mf" });
    expect(couplePrefill(he, { ...she, g: null }, "ff")).toEqual({ a: "Antony", b: "Wanjiru", pair: null });
  });
});

import { GUEST_TURNS, takeTurn, today } from "@/game/turns";

describe("guest turns", () => {
  it("allows 3 turns a day, then stops", () => {
    expect(GUEST_TURNS).toBe(3);
    let stored = null;
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) { const r = takeTurn(stored, "2026-11-23"); results.push(r.ok); stored = r.next; }
    expect(results).toEqual([true, true, true, false, false]);
  });
  it("starts again on a new day", () => {
    expect(takeTurn({ day: "2026-11-23", used: 3 }, "2026-11-24")).toEqual({ ok: true, next: { day: "2026-11-24", used: 1 } });
  });
  it("formats the local day", () => {
    expect(today(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

import { cleanProps } from "@/game/privacy";

describe("stats privacy", () => {
  it("drops anything that isn't an allowed, plain value", () => {
    const out = cleanProps({
      card_id: "c-abc", heat: 2, on: true, name: "Antony", email: "a@b.c", gender: "m", mood: "kissing in the shower",
      text: "Kiss Wanjiru", players: ["A", "B"], nested: { a: 1 }, ms_on_card: 1234.5678,
    });
    expect(out).toEqual({ card_id: "c-abc", heat: 2, on: true, ms_on_card: 1234.57 });
  });
  it("cuts long strings", () => {
    expect((cleanProps({ ref: "x".repeat(500) }).ref as string).length).toBe(60);
  });
});

import { MISFORTUNE, MISFORTUNE_DRINKS, misfortuneWheel } from "@/game/content";

describe("wheel of misfortune", () => {
  it("has 8 wedges per deck, each with a short label and 3 heat levels", () => {
    for (const deck of ["couple", "group"] as const) {
      expect(MISFORTUNE[deck]).toHaveLength(8);
      for (const [label, texts] of MISFORTUNE[deck]) {
        expect(label.length).toBeLessThanOrEqual(16);
        expect(texts).toHaveLength(3);
      }
    }
  });
  it("drinks swap two wedges and keep 8", () => {
    for (const deck of ["couple", "group"] as const) {
      const w = misfortuneWheel(deck, true);
      expect(w).toHaveLength(8);
      expect(w.slice(-2)).toEqual(MISFORTUNE_DRINKS);
      expect(misfortuneWheel(deck, false)).toBe(MISFORTUNE[deck]);
    }
  });
  it("food and touch forfeits say how to opt out", () => {
    const all = [...MISFORTUNE.couple, ...MISFORTUNE.group];
    for (const [label, texts] of all) {
      if (label === "Chilli") texts.forEach((t) => expect(t).toMatch(/skip if/i));
      if (label === "Spank") texts.slice(1).forEach((t) => expect(t).toMatch(/say stop|up for it/i));
    }
  });
  it("stats may record which wheel", () => {
    expect(cleanProps({ mode: "misfortune" })).toEqual({ mode: "misfortune" });
  });
});

describe("misfortune wheel identity", () => {
  it("gives the same array for the same inputs (the wheel redraws on a new array)", () => {
    expect(misfortuneWheel("couple", true)).toBe(misfortuneWheel("couple", true));
    const ai: [string, string[]][] = Array.from({ length: 8 }, (_, i) => [`AI ${i}`, [`forfeit ${i}`]]);
    expect(misfortuneWheel("couple", true, ai)).toBe(misfortuneWheel("couple", true, ai));
    expect(misfortuneWheel("couple", false, ai)).toBe(ai);
    expect(misfortuneWheel("couple", true, ai).slice(-2)).toEqual(MISFORTUNE_DRINKS);
  });
});
