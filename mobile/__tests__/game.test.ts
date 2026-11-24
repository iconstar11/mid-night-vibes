/// <reference types="jest" />
import { COUPLE, EXTRA, GROUP, WHEELS } from "@/game/content";
import { cardId } from "@/game/cards";
import { Draw, poolFor } from "@/game/deck";
import { TOP_PICKS } from "@/game/topPicks";
import { fillTarget, into, matchesFor } from "@/game/match";
import { localMood, moodStems } from "@/game/mood";
import type { Player } from "@/game/types";
import { planSpin, spinTarget, under, wedgeEnds } from "@/game/wheel";

describe("content", () => {
  it("has at least 15 couple prompts per heat per type and 7-8 wedges per wheel", () => {
    for (const t of ["truth", "dare"] as const) COUPLE[t].forEach((l) => expect(l.length).toBeGreaterThanOrEqual(15));
    expect(WHEELS.couple.length).toBeGreaterThanOrEqual(7);
    expect(WHEELS.group.length).toBeGreaterThanOrEqual(7);
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
    for (const d of [COUPLE, GROUP, ...Object.values(EXTRA)]) for (const t of ["truth", "dare"] as const) d[t].flat().forEach((x) => all.add(cardId(x)));
    for (const g of ["couple", "group"] as const) WHEELS[g].forEach(([, texts]) => texts.forEach((x) => all.add(cardId(x))));
    for (const id of TOP_PICKS) expect(all.has(id)).toBe(true);
  });
});

describe("wheel top picks", () => {
  it("lands on a preferred wedge when given", () => {
    for (let i = 0; i < 50; i++) expect([2, 5]).toContain(planSpin(wedgeEnds(8), 0.5, 1, false, Math.random, [2, 5]).win);
    expect(planSpin(wedgeEnds(8), 0.5, 1, false, Math.random, []).win).toBeLessThan(8);
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
      // equal wedges (6, 8, odd 7, 15) and mixed sizes with thin wedges
      const ends = k % 4 === 0 ? wedgeEnds(8) : k % 4 === 1 ? wedgeEnds(7) : k % 4 === 2 ? wedgeEnds(15)
        : wedgeEnds([["a", []], ["b", [], { w: 0.35 }], ["c", []], ["d", []], ["e", [], { w: 0.35 }], ["f", []]] as never);
      const start = (Math.random() - 0.5) * 200;
      const p = planSpin(ends, Math.random(), Math.random() < 0.5 ? 1 : -1, false);
      const { end } = spinTarget(start, ends, p);
      if (under(end, ends) !== p.win || Math.sign(end - start) !== p.dir) bad++;
    }
    expect(bad).toBe(0);
  });
  it("the real thin wedges land about 2-3% of the time each on an 8-wedge wheel", () => {
    const w = spinWheel("couple");
    const ends = wedgeEnds(w);
    const pass = w.findIndex((x) => x[2]?.kind === "pass");
    let hits = 0;
    for (let k = 0; k < 10000; k++) if (planSpin(ends, 0.5, 1, false).win === pass) hits++;
    expect(hits / 10000).toBeGreaterThan(0.015);
    expect(hits / 10000).toBeLessThan(0.035); // 0.2 / 8.4 = 2.4%
  });
  it("thin wedges come up about as often as their size", () => {
    const ends = wedgeEnds([["a", []], ["pass", [], { w: 0.35 }], ["b", []], ["c", []], ["again", [], { w: 0.35 }], ["d", []], ["e", []], ["f", []]] as never);
    const hits = Array(8).fill(0);
    for (let k = 0; k < 20000; k++) hits[planSpin(ends, 0.5, 1, false).win]++;
    const share = (i: number) => hits[i] / 20000;
    expect(share(1)).toBeGreaterThan(0.04); expect(share(1)).toBeLessThan(0.07); // 0.35 / 6.7 = 5.2%
    expect(share(0)).toBeGreaterThan(0.13); expect(share(0)).toBeLessThan(0.17); // 1 / 6.7 = 14.9%
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
  it("drinks swap two wedges, and both thin wedges are added", () => {
    for (const deck of ["couple", "group"] as const) {
      const w = misfortuneWheel(deck, true);
      expect(w).toHaveLength(10);
      for (const d of MISFORTUNE_DRINKS[deck]) expect(w).toContain(d);
      expect(w.filter((x) => x[2]?.kind === "pass")).toHaveLength(1);
      expect(w.filter((x) => x[2]?.kind === "again")).toHaveLength(1);
      expect(misfortuneWheel(deck, false)).toHaveLength(10);
    }
  });
  it("couple drink forfeits never talk about everyone or a group", () => {
    for (const [, texts] of MISFORTUNE_DRINKS.couple) texts.forEach((t) => expect(t).not.toMatch(/everyone|someone|group/i));
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
    expect(cleanProps({ found: "tiktok" })).toEqual({ found: "tiktok" });
  });
});

describe("misfortune wheel identity", () => {
  it("gives the same array for the same inputs (the wheel redraws on a new array)", () => {
    expect(misfortuneWheel("couple", true)).toBe(misfortuneWheel("couple", true));
    const ai: [string, string[]][] = Array.from({ length: 8 }, (_, i) => [`AI ${i}`, [`forfeit ${i}`]]);
    expect(misfortuneWheel("couple", true, ai)).toBe(misfortuneWheel("couple", true, ai));
    expect(misfortuneWheel("couple", false, ai)).toBe(misfortuneWheel("couple", false, ai));
    for (const d of MISFORTUNE_DRINKS.couple) expect(misfortuneWheel("couple", true, ai)).toContain(d);
  });
});

import { glossParts } from "@/game/glossary";
import { listItems, ownWheel } from "@/game/ownWheel";
import { wheelFor } from "@/game/pickWheel";
import { spinWheel } from "@/game/content";

describe("word meanings", () => {
  const words = (t: string) => glossParts(t).filter((p) => typeof p !== "string").map((p) => (p as { word: string }).word);
  it("finds whole words and phrases only", () => {
    expect(words("Give a playful spank on the bum.")).toEqual(["spank", "bum"]);
    expect(words("Say a 'never have I ever'.")).toEqual(["never have I ever"]);
    expect(words("A bumpy ride")).toEqual([]); // not "bum" inside a word
  });
  it("keeps the text the same when put back together", () => {
    const t = "Do your best catwalk, then a cheeky impression of the lads.";
    expect(glossParts(t).map((p) => (typeof p === "string" ? p : p.word)).join("")).toBe(t);
  });
});

describe("own wheel from a list", () => {
  it("reads lines, numbers, bullets and semicolons", () => {
    expect(listItems("Kiss my neck\nDance for me\nSing a song")).toEqual(["Kiss my neck", "Dance for me", "Sing a song"]);
    expect(listItems("1. Kiss\n2) Hug\n3. Dance")).toEqual(["Kiss", "Hug", "Dance"]);
    expect(listItems("- a\n• b\n* c")).toEqual(["a", "b", "c"]);
    expect(listItems("kiss; hug; dance")).toEqual(["kiss", "hug", "dance"]);
    expect(listItems("1. kiss 2. hug 3. dance")).toEqual(["kiss", "hug", "dance"]);
    expect(listItems("kissing and cuddles")).toBeNull();
  });
  it("short lists count too: two lines, two ;-items, or one bulleted item", () => {
    expect(listItems("Kiss my neck\nDance for me")).toEqual(["Kiss my neck", "Dance for me"]);
    expect(listItems("kiss; hug")).toEqual(["kiss", "hug"]);
    expect(listItems("1. Kiss my neck slowly")).toEqual(["Kiss my neck slowly"]);
    expect(listItems("- Lap dance")).toEqual(["Lap dance"]);
    expect(listItems("a romantic night in")).toBeNull(); // one plain sentence is a mood
  });
  it("keeps the players' words, labels them, and allows up to 16", () => {
    const w = ownWheel(Array.from({ length: 20 }, (_, i) => `Dare number ${i + 1} for tonight`).join("\n"))!;
    expect(w).toHaveLength(16);
    expect(w[0][1]).toEqual(["Dare number 1 for tonight"]);
    expect(w[0][0].length).toBeLessThanOrEqual(12);
    expect(ownWheel("Ice: Ice cube down the back\nLemon: Bite a lemon\nSip: Take a sip")![0][0]).toBe("Ice");
  });
});

describe("which wheel shows", () => {
  const base = { group: "couple" as const, aiMisfortune: null, edited: {}, ai: { state: "off" as const, tod: null, wheel: null, note: "", limited: false } };
  it("built-in wheels get the thin Free pass and Spin again wedges", () => {
    const w = wheelFor(base, "spin", false);
    expect(w).toBe(spinWheel("couple"));
    expect(w.filter((x) => x[2]?.kind === "pass" || x[2]?.kind === "again")).toHaveLength(2);
  });
  it("the players' own list is used exactly, with nothing added", () => {
    const own = ownWheel("a dare\nb dare\nc dare")!;
    expect(wheelFor({ ...base, ai: { ...base.ai, state: "own", wheel: own } }, "misfortune", true)).toBe(own);
  });
  it("hand-edited wedges win", () => {
    const edited = ownWheel("x\ny\nz")!;
    expect(wheelFor({ ...base, edited: { spin: edited } }, "spin", false)).toBe(edited);
  });
});


import { WHEEL_SIZE, drawPool, fillWedges } from "@/game/content";

describe("built-in wheel pools", () => {
  const pool = Array.from({ length: 20 }, (_, i): [string, string[]] => [`W${i}`, [`a${i}`, `b${i}`, `c${i}`]]);
  it("draws 8 different wedges, the same for the same seed", () => {
    const a = drawPool(pool, WHEEL_SIZE, 0.42);
    expect(a).toHaveLength(8);
    expect(new Set(a.map((w) => w[0])).size).toBe(8);
    expect(drawPool(pool, WHEEL_SIZE, 0.42)).toEqual(a);
    expect(drawPool(pool, WHEEL_SIZE, 0.77)).not.toEqual(a);
  });
  it("small pools are shown whole", () => {
    expect(drawPool(pool.slice(0, 5), WHEEL_SIZE, 0.3)).toHaveLength(5);
  });
});

describe("filling a short pasted list", () => {
  it("adds plain built-in dares at the chosen heat, never the 'their call' kind or a repeat", () => {
    const add = fillWedges("couple", "spin", 2, 3, 0.5, ["Kiss"]);
    expect(add).toHaveLength(3);
    for (const w of add) {
      expect(w[2]?.fill).toBe(true);
      expect(w[1]).toHaveLength(1);
      expect(w[0]).not.toBe("Kiss");
      const src = WHEELS.couple.find((x) => x[0] === w[0])!;
      expect(src[2]?.kind).toBeUndefined();
      expect(w[1][0]).toBe(src[1][1]); // the Steamy text
    }
    expect(fillWedges("group", "misfortune", 1, 0, 0.5)).toEqual([]);
  });
});
