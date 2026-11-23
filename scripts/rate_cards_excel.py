"""Write data/card-ratings.xlsx: every built-in truth, dare and wheel wedge with Claude's rating, for you to rate too.

    .venv/Scripts/python scripts/rate_cards_excel.py

Your columns (your_rating, decision, rewrite, notes) are kept if the file already exists, so you can
re-run it after cards change without losing your work.
"""
import json
import subprocess
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

from claude_ratings import RATINGS

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "card-ratings.xlsx"
HEATS = {0: "Any", 1: "Flirty", 2: "Steamy", 3: "Spicy"}
DECKS = {"couple": "Couple", "group": "Group (all)", "girls": "Girls' night", "boys": "Boys' night"}
YOURS = ["your_rating", "decision", "rewrite", "notes"]


def load_cards() -> pd.DataFrame:
    subprocess.run(["node", "--no-warnings", "scripts/dump_cards.mts"], cwd=ROOT / "mobile", check=True, capture_output=True)
    c = pd.DataFrame(json.loads((ROOT / "data" / "cards.json").read_text(encoding="utf8")))
    return c.drop_duplicates(["id", "game"])  # one row per card per game (a text in both decks and wheel shows in both)


def previous_answers() -> dict[str, dict]:
    if not OUT.exists():
        return {}
    keep = {}
    for sheet in ["Truths", "Dares", "Spin the Wheel"]:
        try:
            df = pd.read_excel(OUT, sheet_name=sheet, dtype=str).fillna("")
        except ValueError:
            continue
        for r in df.to_dict("records"):
            if any(r.get(k) for k in YOURS):
                keep[r["id"]] = {k: r.get(k, "") for k in YOURS}
    return keep


def main() -> None:
    cards = load_cards()
    missing = sorted(set(cards["text"]) - set(RATINGS))
    if missing:
        raise SystemExit("No Claude rating yet for:\n  " + "\n  ".join(missing))
    old = previous_answers()
    cards["deck"] = cards["group"].map(DECKS)
    cards["heat_name"] = cards["heat"].map(HEATS)
    cards["claude_rating"] = cards["text"].map(lambda t: RATINGS[t][0])
    cards["claude_reason"] = cards["text"].map(lambda t: RATINGS[t][1])
    for k in YOURS:
        cards[k] = cards["id"].map(lambda i, k=k: old.get(i, {}).get(k, ""))
    cards["your_rating"] = pd.to_numeric(cards["your_rating"], errors="coerce")

    sheets = {
        "Truths": cards[cards["type"] == "truth"],
        "Dares": cards[cards["type"] == "dare"],
        "Spin the Wheel": cards[cards["type"] == "wedge"],
    }
    OUT.parent.mkdir(exist_ok=True)
    with pd.ExcelWriter(OUT, engine="openpyxl") as xl:
        pd.DataFrame({"How to rate": [
            "Rate each card 1-5 in your_rating (5 = one of our best, 1 = cut it). Claude's rating and reason are there to argue with.",
            "What Claude looked at: fun (reaction or story?), clarity (understood in one read), heat fit (right for Flirty/Steamy/Spicy),",
            "comfort (opt-in, no outsiders dragged in, no exposing private stuff) and freshness (not the same as every party game).",
            "decision: keep / change / remove. If change, put your new wording in rewrite.",
            "difference = your rating minus Claude's. Sort by it to see where you disagree most.",
            "Summary shows averages and counts; it updates as you fill in ratings.",
            "Send the file back (or tell me) and I'll apply your rewrites and removals to the cards and update top picks.",
        ]}).to_excel(xl, sheet_name="How to rate", index=False)
        for name, df in sheets.items():
            cols = ["deck", "heat_name"] + (["label"] if name == "Spin the Wheel" else []) + \
                   ["text", "claude_rating", "claude_reason", "your_rating", "difference", "decision", "rewrite", "notes", "id"]
            order = {"couple": 0, "group": 1, "girls": 2, "boys": 3}
            out = df.assign(_o=df["group"].map(order)).sort_values(["_o", "heat"], kind="stable").drop(columns=["_o", "heat"])
            out = out.assign(difference="").rename(columns={"heat_name": "heat", "label": "wedge"})
            cols = [{"heat_name": "heat", "label": "wedge"}.get(c, c) for c in cols]
            out[cols].to_excel(xl, sheet_name=name, index=False)
        pd.DataFrame().to_excel(xl, sheet_name="Summary", index=False)

    wb = load_workbook(OUT)
    head = PatternFill("solid", fgColor="7A1F3D")
    yours_fill = PatternFill("solid", fgColor="FFF5E0")
    for name in sheets:
        ws = wb[name]
        hdr = {c.value: c.column_letter for c in ws[1]}
        widths = {"deck": 13, "heat": 8, "wedge": 13, "text": 62, "claude_rating": 8, "claude_reason": 40, "your_rating": 8,
                  "difference": 8, "decision": 10, "rewrite": 45, "notes": 30, "id": 12}
        for title, letter in hdr.items():
            ws.column_dimensions[letter].width = widths.get(title, 12)
            cell = ws[f"{letter}1"]
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = head
            cell.alignment = Alignment(wrap_text=True, vertical="center")
        n = ws.max_row
        for r in range(2, n + 1):
            for t in ["text", "claude_reason", "rewrite", "notes"]:
                ws[f"{hdr[t]}{r}"].alignment = Alignment(wrap_text=True, vertical="top")
            for t in ["your_rating", "decision", "rewrite", "notes"]:
                ws[f"{hdr[t]}{r}"].fill = yours_fill
            y, cl = hdr["your_rating"], hdr["claude_rating"]
            ws[f"{hdr['difference']}{r}"] = f'=IF({y}{r}="","",{y}{r}-{cl}{r})'
        rating = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True,
                                showErrorMessage=True, errorTitle="Rating", error="Use a whole number from 1 to 5.")
        decision = DataValidation(type="list", formula1='"keep,change,remove"', allow_blank=True)
        ws.add_data_validation(rating)
        ws.add_data_validation(decision)
        rating.add(f"{hdr['your_rating']}2:{hdr['your_rating']}{n}")
        decision.add(f"{hdr['decision']}2:{hdr['decision']}{n}")
        scale = ColorScaleRule(start_type="num", start_value=1, start_color="F4C7C3", mid_type="num", mid_value=3, mid_color="FFF2CC", end_type="num", end_value=5, end_color="B7E1CD")
        for t in ["claude_rating", "your_rating"]:
            ws.conditional_formatting.add(f"{hdr[t]}2:{hdr[t]}{n}", scale)
        ws.freeze_panes = f"{hdr['text']}2"
        ws.auto_filter.ref = ws.dimensions

    s = wb["Summary"]
    s.append(["Sheet", "Cards", "Claude average", "You rated", "Your average", "Claude 5s", "Claude 1-2s", "You: remove", "You: change"])
    for name in sheets:
        hdr = {c.value: c.column_letter for c in wb[name][1]}
        q = f"'{name}'!"
        s.append([name, f"=COUNTA({q}{hdr['text']}:{hdr['text']})-1",
                  f"=ROUND(AVERAGE({q}{hdr['claude_rating']}:{hdr['claude_rating']}),2)",
                  f"=COUNT({q}{hdr['your_rating']}:{hdr['your_rating']})",
                  f"=IFERROR(ROUND(AVERAGE({q}{hdr['your_rating']}:{hdr['your_rating']}),2),\"\")",
                  f"=COUNTIF({q}{hdr['claude_rating']}:{hdr['claude_rating']},5)",
                  f"=COUNTIF({q}{hdr['claude_rating']}:{hdr['claude_rating']},\"<=2\")",
                  f"=COUNTIF({q}{hdr['decision']}:{hdr['decision']},\"remove\")",
                  f"=COUNTIF({q}{hdr['decision']}:{hdr['decision']},\"change\")"])
    for cell in s[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = head
    for col in "ABCDEFGHI":
        s.column_dimensions[col].width = 15
    wb["How to rate"].column_dimensions["A"].width = 130
    wb._sheets = [wb[n] for n in ["How to rate", "Summary", "Truths", "Dares", "Spin the Wheel"]]
    wb.save(OUT)

    counts = {k: len(v) for k, v in sheets.items()}
    kept = sum(1 for v in old.values() if any(v.values()))
    print(f"{counts} -> {OUT.relative_to(ROOT)}" + (f" (kept your answers on {kept} cards)" if kept else ""))
    print("Claude's ratings:", cards["claude_rating"].value_counts().sort_index().to_dict())


if __name__ == "__main__":
    main()
