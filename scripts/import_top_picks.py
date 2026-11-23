"""Read the top_pick column from data/card-review.xlsx and write mobile/src/game/topPicks.ts.

Run from the repo root after editing the sheet:
    .venv/Scripts/python scripts/import_top_picks.py
"""
import json
import subprocess
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "data" / "card-review.xlsx"


def main() -> None:
    cards = pd.read_excel(SHEET, sheet_name="Cards", dtype=str).fillna("")
    picks = cards[cards["top_pick"].str.strip().str.lower().isin(["yes", "y", "x", "1", "true"])]
    summary = picks.groupby(["game", "group", "type"]).size()
    subprocess.run(
        ["node", "--no-warnings", "scripts/write_top_picks.mts"],
        cwd=ROOT / "mobile", input=json.dumps(sorted(set(picks["id"]))), text=True, check=True,
    )
    print(summary.to_string())


if __name__ == "__main__":
    main()
