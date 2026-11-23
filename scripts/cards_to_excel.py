"""Write data/card-review.xlsx: every built-in card with a top_pick column you edit, plus AI cards you can add.

Run from the repo root (after export_analytics.py, so the play stats and suggestions are filled in):
    .venv/Scripts/python scripts/cards_to_excel.py          # uses data/card-stats.json (real data)
    .venv/Scripts/python scripts/cards_to_excel.py --demo   # uses the demo stats, writes card-review-DEMO.xlsx

Sheets:
  Cards     type yes in top_pick for cards to show first. "suggested" marks the top 3 per game/deck/heat
            with 30+ plays by combined score; it's only a hint, you decide.
  AI cards  every AI-written truth and dare we've seen, with its stats. Type yes in add_to_deck to make it a
            built-in card (wheel wedges can't be added this way: the wheel has fixed wedges).
Then run: .venv/Scripts/python scripts/import_top_picks.py
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

import pandas as pd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
MOBILE = ROOT / "mobile"
GOLD = PatternFill("solid", fgColor="F6E7C1")
MINT = PatternFill("solid", fgColor="DDF1E4")


def current_top_picks() -> set[str]:
    return set(re.findall(r'"(c-[0-9a-z]+)"', (MOBILE / "src/game/topPicks.ts").read_text(encoding="utf8")))


def promoted_texts() -> set[str]:
    return set(re.findall(r'text: "((?:[^"\\]|\\.)*)"', (MOBILE / "src/game/promoted.ts").read_text(encoding="utf8")))


def style(ws, widths: dict[str, int], yes_col: int, fill_col_is_yes=True) -> None:
    for col, w in widths.items():
        ws.column_dimensions[col].width = w
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="7A1F3D")
    for row in ws.iter_rows(min_row=2):
        for cell in row:
            if isinstance(cell.value, str) and len(cell.value) > 40:
                cell.alignment = Alignment(wrap_text=True, vertical="top")
        if row[yes_col].value == "yes":
            for cell in row:
                cell.fill = GOLD
    ws.freeze_panes = "C2"
    ws.auto_filter.ref = ws.dimensions
    dv = DataValidation(type="list", formula1='"yes,"', allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"{ws.cell(1, yes_col + 1).column_letter}2:{ws.cell(1, yes_col + 1).column_letter}{max(ws.max_row, 2)}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", action="store_true")
    demo = ap.parse_args().demo
    stats_path = ROOT / "data" / ("card-stats-DEMO.json" if demo else "card-stats.json")
    out = ROOT / "data" / ("card-review-DEMO.xlsx" if demo else "card-review.xlsx")
    stats = json.loads(stats_path.read_text(encoding="utf8")) if stats_path.exists() else {"suggested": [], "cards": {}, "ai_cards": []}

    subprocess.run(["node", "--no-warnings", "scripts/dump_cards.mts"], cwd=MOBILE, check=True, capture_output=True)
    cards = pd.DataFrame(json.loads((ROOT / "data" / "cards.json").read_text(encoding="utf8")))
    top, suggested = current_top_picks(), set(stats["suggested"])
    cards["top_pick"] = cards["id"].map(lambda i: "yes" if i in top else "")
    cards["suggested"] = cards["id"].map(lambda i: "suggested" if i in suggested else "")
    for k in ["shown", "stars", "done_rate", "skip_rate", "score"]:
        cards[k] = cards["id"].map(lambda i, k=k: stats["cards"].get(i, {}).get(k))
    cards["game"] = cards["game"].map({"tod": "Truth or Dare", "wheel": "Spin the Wheel"})
    cards = cards.rename(columns={"label": "heat_or_wedge"})
    cards = cards[["top_pick", "suggested", "game", "group", "type", "heat", "heat_or_wedge", "text", "origin",
                   "shown", "stars", "done_rate", "skip_rate", "score", "id"]]
    cards = cards.sort_values(["game", "group", "type", "heat"], kind="stable")

    promoted = promoted_texts()
    ai = pd.DataFrame(stats["ai_cards"], columns=["id", "game", "type", "deck", "heat", "label", "text", "origin", "shown", "stars", "done_rate", "skip_rate", "score"])
    ai = ai[ai["type"].isin(["truth", "dare"])].copy()  # wheel wedges are fixed; they're analysed but not added
    ai.insert(0, "add_to_deck", ai["text"].map(lambda t: "yes" if t in promoted else ""))
    ai = ai.sort_values("score", ascending=False, na_position="last")[
        ["add_to_deck", "type", "deck", "heat", "text", "origin", "shown", "stars", "done_rate", "skip_rate", "score", "id"]]

    out.parent.mkdir(exist_ok=True)
    with pd.ExcelWriter(out, engine="openpyxl") as xl:
        cards.to_excel(xl, sheet_name="Cards", index=False)
        ai.to_excel(xl, sheet_name="AI cards", index=False)
        pd.DataFrame({"How to use": [
            "Run export_analytics.py first, so the play numbers and 'suggested' are up to date.",
            "Cards: type yes in top_pick for cards to show first (about 3 per heat level per deck, 3 wedges per wheel). 'suggested' = top 3 by score with 30+ plays; just a hint.",
            "AI cards: type yes in add_to_deck to turn an AI truth or dare into a built-in card for that deck and heat. Edit the text in the cell first if you want to polish it.",
            "Don't edit id columns. Change built-in card text in mobile/src/game/content.ts.",
            "Save, then run: .venv/Scripts/python scripts/import_top_picks.py (then I'll deploy).",
        ]}).to_excel(xl, sheet_name="How to use", index=False)
        style(xl.sheets["Cards"], {"A": 9, "B": 11, "C": 15, "D": 8, "E": 7, "F": 5, "G": 18, "H": 70, "I": 12, "O": 12}, 0)
        for row in xl.sheets["Cards"].iter_rows(min_row=2):
            if row[1].value == "suggested" and row[0].value != "yes":
                row[1].fill = MINT
        style(xl.sheets["AI cards"], {"A": 12, "B": 7, "C": 8, "D": 5, "E": 70, "F": 18, "L": 12}, 0)
        xl.sheets["How to use"].column_dimensions["A"].width = 120

    print(f"{len(cards)} cards ({int((cards['top_pick'] == 'yes').sum())} top picks, {int((cards['suggested'] != '').sum())} suggested), "
          f"{len(ai)} AI cards -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
