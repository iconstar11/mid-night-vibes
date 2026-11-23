"""Write data/card-review.xlsx: every built-in card and wedge, with a top_pick column you can edit.

Run from the repo root:
    .venv/Scripts/python scripts/cards_to_excel.py
Then mark the cards you want shown first with "yes" in top_pick, save, and run import_top_picks.py.
"""
import json
import re
import subprocess
from pathlib import Path

import pandas as pd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
MOBILE = ROOT / "mobile"
OUT = ROOT / "data" / "card-review.xlsx"


def current_top_picks() -> set[str]:
    text = (MOBILE / "src" / "game" / "topPicks.ts").read_text(encoding="utf8")
    return set(re.findall(r'"(c-[0-9a-z]+)"', text))


def main() -> None:
    # Fresh list of cards with their ids (same id code as the app)
    subprocess.run(["node", "--no-warnings", "scripts/dump_cards.mts"], cwd=MOBILE, check=True)
    cards = pd.DataFrame(json.loads((ROOT / "data" / "cards.json").read_text(encoding="utf8")))
    top = current_top_picks()
    cards["top_pick"] = cards["id"].map(lambda i: "yes" if i in top else "")
    cards["game"] = cards["game"].map({"tod": "Truth or Dare", "wheel": "Spin the Wheel"})
    cards = cards.rename(columns={"label": "heat_or_wedge"})
    cards.loc[cards["game"] == "Spin the Wheel", "heat_or_wedge"] = cards["heat_or_wedge"] + cards["heat"].map(
        {0: "", 1: " · Flirty", 2: " · Steamy", 3: " · Spicy"}
    )
    cards = cards[["top_pick", "game", "group", "type", "heat", "heat_or_wedge", "text", "id"]]
    cards = cards.sort_values(["game", "group", "type", "heat"], kind="stable")

    OUT.parent.mkdir(exist_ok=True)
    with pd.ExcelWriter(OUT, engine="openpyxl") as xl:
        cards.to_excel(xl, sheet_name="Cards", index=False)
        ws = xl.sheets["Cards"]
        widths = {"A": 10, "B": 16, "C": 9, "D": 8, "E": 6, "F": 22, "G": 80, "H": 12}
        for col, w in widths.items():
            ws.column_dimensions[col].width = w
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill("solid", fgColor="7A1F3D")
        gold = PatternFill("solid", fgColor="F6E7C1")
        for row in ws.iter_rows(min_row=2):
            row[6].alignment = Alignment(wrap_text=True, vertical="top")
            if row[0].value == "yes":
                for cell in row:
                    cell.fill = gold
        ws.freeze_panes = "B2"
        ws.auto_filter.ref = ws.dimensions
        dv = DataValidation(type="list", formula1='"yes,"', allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f"A2:A{ws.max_row}")

        tips = pd.DataFrame({"How to use": [
            "Type yes in top_pick for the cards to show first (about 3 per heat level per deck, 3 wedges per wheel).",
            "Top picks at the chosen heat come first in every session, so guests' 3 free turns are your best cards.",
            "Don't edit the text or id columns here: change card text in mobile/src/game/content.ts.",
            "Save, then run: .venv/Scripts/python scripts/import_top_picks.py",
        ]})
        tips.to_excel(xl, sheet_name="How to use", index=False)
        xl.sheets["How to use"].column_dimensions["A"].width = 110

    print(f"{len(cards)} cards, {int((cards['top_pick'] == 'yes').sum())} marked as top picks -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
