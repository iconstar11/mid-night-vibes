"""Predict the owner's rating for the new cards, learned from their review of the first 261 (data/card-ratings.xlsx).

    .venv/Scripts/python scripts/predict_ratings.py

Model: ridge regression (numpy only) on Claude's rating plus what the owner's notes pointed at: which game,
couple or group, heat, cards that lean on the player's creativity, one-word "Ideas:", physical/intimate dares,
phone/outsider dares, drinks, couple cards that talk about "everyone", and length.
It prints how well it does on cards it didn't see (5-fold cross-validation) against two simple baselines,
and the biggest effects, then writes predicted_rating to data/new-cards.xlsx (your own columns are left alone).
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
OLD = ROOT / "data" / "card-ratings.xlsx"
NEW = ROOT / "data" / "new-cards.xlsx"
SHEETS = ["Truths", "Dares", "Spin the Wheel", "Misfortune"]
KEEP_AT = 3.8  # predicted rating needed to go into the game before the owner's review (holds back the bottom ~8%)

DECKS = {"Couple": "couple", "Group (all)": "group", "Girls' night": "girls", "Boys' night": "boys"}
HEATS = {"Flirty": 1, "Steamy": 2, "Spicy": 3, "Any": 2}
FLAGS = {
    # leans on the player inventing something (owner: "depends on the creativity of the player")
    "vague": r"\b(?:your call|their call|picks? a|chooses? (?:a|your)|make up|whatever|any (?:dare|truth|question)|asks? you|bolder than|creative)\b",
    "ideas": r"ideas:",
    "physical": r"\b(?:kiss|lap|massage|undress|clothing|layer|neck|lips|blindfold|touch|hug|dance|shirt|button|zip|ice)\b",
    "outsider": r"\b(?:text|message|status|post|camera roll|crush|dm|phone|call)\b",
    "drink": r"\b(?:sip|drink|glass|pour)\b",
}


def load(path: Path, rated: bool) -> pd.DataFrame:
    frames = []
    for sheet in SHEETS:
        d = pd.read_excel(path, sheet_name=sheet)
        d["sheet"] = sheet
        frames.append(d)
    d = pd.concat(frames, ignore_index=True)
    d["deck_id"] = d["deck"].map(lambda x: DECKS.get(x, x))
    d["heat_n"] = d["heat"].map(lambda x: HEATS.get(x, 2))
    if rated:
        d = d[d["your_rating"].notna()].copy()
    return d


def features(d: pd.DataFrame) -> pd.DataFrame:
    t = d["text"].astype(str).str.lower()
    X = pd.DataFrame(index=d.index)
    X["claude"] = d["claude_rating"].astype(float)
    for s in SHEETS[1:]:
        X[f"is_{s}"] = (d["sheet"] == s).astype(float)
    X["couple"] = (d["deck_id"] == "couple").astype(float)
    X["girls_boys"] = d["deck_id"].isin(["girls", "boys"]).astype(float)
    X["heat"] = d["heat_n"].astype(float)
    for k, rx in FLAGS.items():
        X[k] = t.str.contains(rx, regex=True).astype(float)
    X["couple_everyone"] = ((d["deck_id"] == "couple") & t.str.contains(r"\b(?:everyone|someone|the group)\b")).astype(float)
    X["couple_physical"] = X["couple"] * X["physical"]
    X["words"] = t.str.split().str.len().astype(float)
    return X


class Ridge:
    def __init__(self, lam: float = 3.0):
        self.lam = lam

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "Ridge":
        self.cols = list(X.columns)
        self.mu, self.sd = X.mean(), X.std().replace(0, 1)
        Z = ((X - self.mu) / self.sd).to_numpy()
        self.b0 = y.mean()
        A = Z.T @ Z + self.lam * np.eye(Z.shape[1])
        self.w = np.linalg.solve(A, Z.T @ (y - self.b0))
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        Z = ((X[self.cols] - self.mu) / self.sd).to_numpy()
        return np.clip(self.b0 + Z @ self.w, 1, 5)


def cross_validate(X: pd.DataFrame, y: np.ndarray, k: int = 5, seed: int = 7) -> dict[str, float]:
    idx = np.random.default_rng(seed).permutation(len(y))
    errs = {"model": [], "claude as is": [], "claude + avg shift": []}
    for f in range(k):
        test = idx[f::k]
        train = np.setdiff1d(idx, test)
        m = Ridge().fit(X.iloc[train], y[train])
        shift = (y[train] - X["claude"].to_numpy()[train]).mean()
        errs["model"].append(np.abs(m.predict(X.iloc[test]) - y[test]))
        errs["claude as is"].append(np.abs(X["claude"].to_numpy()[test] - y[test]))
        errs["claude + avg shift"].append(np.abs(np.clip(X["claude"].to_numpy()[test] + shift, 1, 5) - y[test]))
    return {k: float(np.concatenate(v).mean()) for k, v in errs.items()}


def main() -> None:
    old = load(OLD, rated=True)
    X, y = features(old), old["your_rating"].to_numpy(float)
    cv = cross_validate(X, y)
    print(f"Learned from {len(y)} cards you rated (your average {y.mean():.2f}, mine {X['claude'].mean():.2f}).")
    print("Average error on cards the model didn't see (lower is better):")
    for name, mae in cv.items():
        print(f"  {name:<20} {mae:.2f} stars")
    model = Ridge().fit(X, y)
    effects = sorted(zip(model.cols, model.w), key=lambda p: -abs(p[1]))[:8]
    print("Biggest effects (stars per typical change):", ", ".join(f"{c} {w:+.2f}" for c, w in effects))

    new = load(NEW, rated=False)
    new["predicted_rating"] = np.round(model.predict(features(new)), 2)
    wb = load_workbook(NEW)
    for sheet in SHEETS:
        ws = wb[sheet]
        heads = [c.value for c in ws[1]]
        col = heads.index("predicted_rating") + 1 if "predicted_rating" in heads else ws.max_column + 1
        ws.cell(1, col, "predicted_rating")
        for r, v in enumerate(new.loc[new["sheet"] == sheet, "predicted_rating"], start=2):
            ws.cell(r, col, float(v))
        ws.column_dimensions[ws.cell(1, col).column_letter].width = 16
    wb.save(NEW)
    keep = new["predicted_rating"] >= KEEP_AT
    print(f"Predicted for {len(new)} new cards -> {NEW.relative_to(ROOT)}; {int(keep.sum())} at {KEEP_AT}+ go in now.")
    print(new.assign(keep=keep).groupby("sheet")["keep"].agg(["sum", "count"]).rename(columns={"sum": "in", "count": "of"}).to_string())


if __name__ == "__main__":
    main()
