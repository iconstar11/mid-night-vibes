"""Find cards that say nearly the same thing (in any deck, game or heat).

    .venv/Scripts/python scripts/check_duplicates.py            # built-in cards
    .venv/Scripts/python scripts/check_duplicates.py more.xlsx  # also new cards in a workbook (text column)

Prints pairs that are at least 80% alike (difflib ratio on lower-case words), most alike first.
"""
from __future__ import annotations

import difflib
import json
import re
import subprocess
import sys
from itertools import combinations
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
LIMIT = 0.8


def norm(t: str) -> str:
    return " ".join(re.findall(r"[a-z']+", t.lower().replace("{target}", "x")))


def main() -> None:
    subprocess.run(["node", "--no-warnings", "scripts/dump_cards.mts"], cwd=ROOT / "mobile", check=True, capture_output=True)
    # Heat versions of the same wedge are meant to be alike: they're grouped by game+deck+label and not compared
    cards = [(f'{c["game"]} {c["group"]} h{c["heat"]} {c.get("label") or c["type"]}', c["text"]) for c in json.loads((ROOT / "data/cards.json").read_text(encoding="utf8"))]
    for f in sys.argv[1:]:
        for sheet, d in pd.read_excel(f, sheet_name=None).items():
            if "text" in d:
                cards += [(f"NEW {sheet} {r.get('deck', '')} h{r.get('heat', '')}", str(r["text"])) for _, r in d.dropna(subset=["text"]).iterrows()]
    seen, pairs = {}, []
    for where, text in cards:
        seen.setdefault(norm(text), (where, text))
    uniq = list(seen.values())
    for (w1, a), (w2, b) in combinations(uniq, 2):
        if w1.split(" h")[0] == w2.split(" h")[0] and w1.split(" ", 3)[-1] == w2.split(" ", 3)[-1] and not w1.startswith("tod"):
            continue  # the same wedge at another heat
        r = difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()
        if r >= LIMIT:
            pairs.append((r, w1, a, w2, b))
    exact = len(cards) - len(uniq)
    for r, w1, a, w2, b in sorted(pairs, reverse=True):
        print(f"{r:.0%}  [{w1}] {a}\n      [{w2}] {b}")
    print(f"{len(pairs)} near-duplicate pairs; {exact} exact repeats (same text used in more than one place, e.g. shared by both decks)")


if __name__ == "__main__":
    main()
