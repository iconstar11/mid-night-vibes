"""Export Midnight Vibes game stats to an Excel workbook for analysis.

    .venv/Scripts/python scripts/export_analytics.py          # real data (needs .env, see below)
    .venv/Scripts/python scripts/export_analytics.py --demo   # made-up data to practise on

Real data needs a git-ignored .env in the repo root with:
    SUPABASE_URL=https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<the secret / service_role key from Supabase → Project Settings → API>
Never commit that key or put it in the app.

Privacy: the events table never holds names, emails, gender, typed moods or card text. On top of that,
user ids are replaced by salted hashes here, so the workbook can't be tied back to an account.

The "Instagram posts" sheet is yours: fill it in by hand. Re-running the export keeps it as it is
and refreshes every other sheet.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import secrets
import subprocess
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TZ = "Africa/Nairobi"
IG_SHEET = "Instagram posts"
IG_COLUMNS = [
    "ref", "date", "url", "format (reel/carousel/story/post)", "angle / hook", "game featured", "caption length",
    "reach", "likes", "comments", "saves", "shares", "profile visits", "link taps", "follows",
]


# ---------- Load ----------

def fetch_events() -> pd.DataFrame:
    load_dotenv(ROOT / ".env")
    url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env (see the top of this file), or use --demo.")
    rows, page = [], 1000
    while True:
        r = requests.get(
            f"{url}/rest/v1/events",
            params={"select": "at,user_id,session_id,name,props", "order": "id", "limit": page, "offset": len(rows)},
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        rows += batch
        if len(batch) < page:
            break
    return pd.DataFrame(rows, columns=["at", "user_id", "session_id", "name", "props"])


def demo_events(n_users: int = 400, seed: int = 7) -> pd.DataFrame:
    """Plausible fake data with real card ids, so every sheet and formula has something to show."""
    rng = np.random.default_rng(seed)
    cards = load_cards()
    tod = cards[cards["game"] == "tod"]
    top = set(top_pick_ids())
    refs = [None] * 6 + ["ig-001", "ig-002", "ig-003", "ig-004", "ig-005"]
    start = pd.Timestamp.now(tz="UTC").normalize() - pd.Timedelta(days=42)
    rows = []
    for u in range(n_users):
        uid = f"demo-user-{u}"
        first = start + pd.Timedelta(hours=float(rng.uniform(0, 42 * 24)))
        signed_up, premium = False, False
        n_sessions = 1 + rng.poisson(0.8 if rng.random() < 0.6 else 2.5)
        for s in range(n_sessions):
            t = first + pd.Timedelta(days=float(s * rng.uniform(1, 6)))
            if t > pd.Timestamp.now(tz="UTC"):
                break
            sid = f"demo-{u}-{s}"
            clock = [t]  # moves forward as the session goes on

            def add(name, props, clock=clock, uid=uid, sid=sid):
                rows.append({"at": clock[0].isoformat(), "user_id": uid, "session_id": sid, "name": name, "props": props})
            add("session_start", {"ref": refs[rng.integers(len(refs))] if s == 0 else None, "platform": "web", "installed": bool(rng.random() < 0.15)})
            if rng.random() < 0.25:
                continue  # bounced
            group = rng.choice(["couple", "friends", "girls", "boys"], p=[0.55, 0.25, 0.12, 0.08])
            heat = int(rng.choice([1, 2, 3], p=[0.45, 0.35, 0.2]))
            game = rng.choice(["tod", "wheel"], p=[0.7, 0.3])
            clock[0] += pd.Timedelta(seconds=20)
            add("game_start", {"game": game, "group": group, "heat": heat, "players_n": 2 if group == "couple" else int(rng.integers(3, 8)), "has_mood": bool(rng.random() < 0.2)})
            pool = tod[(tod["group"] == ("couple" if group == "couple" else "group")) & (tod["heat"] <= heat)]
            turns = int(rng.integers(1, 25)) if (signed_up or s > 0) else int(rng.integers(1, 5))
            for k in range(turns):
                if not signed_up and k >= 3:
                    add("guest_wall", {"reason": "turns", "game": game})
                    if rng.random() < 0.3:
                        signed_up = True
                        add("signup", {"method": rng.choice(["email", "google"], p=[0.4, 0.6]), "from": "turns"})
                    break
                card = pool.sample(1, random_state=int(rng.integers(1e9))).iloc[0]
                is_top = card["id"] in top and k < 3
                clock[0] += pd.Timedelta(seconds=float(rng.uniform(15, 90)))
                add("card_shown", {"game": "tod", "card_id": card["id"], "type": card["type"], "heat": heat, "source": "top" if is_top else "deck", "turn_n": k + 1})
                quality = 0.75 if is_top else 0.55 + (hash(card["id"]) % 30) / 100
                ms = int(rng.uniform(8000, 70000))
                if rng.random() < quality:
                    add("card_done", {"game": "tod", "card_id": card["id"], "type": card["type"], "source": "top" if is_top else "deck", "ms_on_card": ms})
                else:
                    add("card_skip", {"game": "tod", "card_id": card["id"], "type": card["type"], "source": "top" if is_top else "deck", "ms_on_card": ms // 3})
                if rng.random() < quality * 0.18:
                    add("card_star", {"card_id": card["id"], "on": True, "game": "tod", "type": card["type"], "heat": heat, "source": "top" if is_top else "deck"})
            if signed_up and not premium and rng.random() < 0.12:
                add("premium_view", {"plan": "free"})
                if rng.random() < 0.35:
                    add("checkout_start", {"product": rng.choice(["monthly", "yearly", "pass"])})
                    if rng.random() < 0.7:
                        premium = True
                        add("premium_on", {"product": "monthly"})
    return pd.DataFrame(rows)


def load_cards() -> pd.DataFrame:
    subprocess.run(["node", "--no-warnings", "scripts/dump_cards.mts"], cwd=ROOT / "mobile", check=True, capture_output=True)
    return pd.DataFrame(json.loads((DATA / "cards.json").read_text(encoding="utf8"))).drop_duplicates("id")


def top_pick_ids() -> list[str]:
    import re
    return re.findall(r'"(c-[0-9a-z]+)"', (ROOT / "mobile/src/game/topPicks.ts").read_text(encoding="utf8"))


# ---------- Shape ----------

def salt() -> str:
    path = DATA / ".salt"
    if not path.exists():
        DATA.mkdir(exist_ok=True)
        path.write_text(secrets.token_hex(16))
    return path.read_text().strip()


def tidy(raw: pd.DataFrame) -> pd.DataFrame:
    """One row per event, props spread into columns, pseudonymous user ids, local time."""
    df = raw[~raw["session_id"].astype(str).str.startswith("selftest")].copy()
    s = salt()
    df["user"] = df["user_id"].map(lambda u: hashlib.sha256((s + str(u)).encode()).hexdigest()[:12])
    df["at"] = pd.to_datetime(df["at"], utc=True).dt.tz_convert(TZ)
    props = pd.json_normalize(df["props"].map(lambda p: p if isinstance(p, dict) else {})).set_index(df.index)
    df = pd.concat([df.drop(columns=["user_id", "props"]), props], axis=1)
    df["date"] = df["at"].dt.date
    df["at"] = df["at"].dt.tz_localize(None)  # Excel can't store time zones
    first = ["at", "date", "user", "session_id", "name"]
    return df[first + [c for c in df.columns if c not in first]].sort_values("at").reset_index(drop=True)


def sessions(ev: pd.DataFrame) -> pd.DataFrame:
    g = ev.groupby("session_id")
    out = pd.DataFrame({
        "user": g["user"].first(),
        "start": g["at"].min(),
        "minutes": ((g["at"].max() - g["at"].min()).dt.total_seconds() / 60).round(1),
        "ref": g["ref"].first() if "ref" in ev else None,
        "games": g["name"].apply(lambda x: (x == "game_start").sum()),
        "cards": g["name"].apply(lambda x: (x == "card_shown").sum()),
        "skips": g["name"].apply(lambda x: (x == "card_skip").sum()),
        "stars": g["name"].apply(lambda x: (x == "card_star").sum()),
        "hit_guest_wall": g["name"].apply(lambda x: (x == "guest_wall").any()),
        "signed_up": g["name"].apply(lambda x: (x == "signup").any()),
    })
    return out.reset_index().sort_values("start")


def card_stats(ev: pd.DataFrame, cards: pd.DataFrame) -> pd.DataFrame:
    if "card_id" not in ev:
        return pd.DataFrame()
    c = ev[ev["card_id"].notna()]
    count = lambda name: c[c["name"] == name].groupby("card_id").size()
    stars_on = c[(c["name"] == "card_star") & (c["on"] == True)].groupby("card_id").size()  # noqa: E712
    stars_off = c[(c["name"] == "card_star") & (c["on"] == False)].groupby("card_id").size()  # noqa: E712
    t = pd.DataFrame({"shown": count("card_shown"), "done": count("card_done"), "skipped": count("card_skip")})
    t["stars"] = stars_on.sub(stars_off, fill_value=0).clip(lower=0)
    t = t.fillna(0).astype(int)
    t["avg_seconds"] = (c[c["name"].isin(["card_done", "card_skip"])].groupby("card_id")["ms_on_card"].mean() / 1000).round(1)
    t["done_rate"] = (t["done"] / t["shown"].where(t["shown"] > 0)).round(3)
    t["skip_rate"] = (t["skipped"] / t["shown"].where(t["shown"] > 0)).round(3)
    t["star_rate"] = (t["stars"] / t["shown"].where(t["shown"] > 0)).round(3)
    # Smoothed score: star rate pulled towards the average until a card has been shown enough times
    prior_n, prior = 20, (t["stars"].sum() / max(t["shown"].sum(), 1))
    t["score"] = ((t["stars"] + prior * prior_n) / (t["shown"] + prior_n)).round(4)
    info = cards.set_index("id")[["game", "group", "type", "heat", "text"]]
    t = t.join(info, how="left")
    t["text"] = t["text"].fillna("(AI card: text not stored)")
    t["top_pick"] = t.index.isin(top_pick_ids())
    cols = ["game", "group", "type", "heat", "top_pick", "text", "shown", "done", "skipped", "stars", "done_rate", "skip_rate", "star_rate", "score", "avg_seconds"]
    return t[cols].rename_axis("card_id").reset_index().sort_values("score", ascending=False)


def funnel_by_day(ev: pd.DataFrame) -> pd.DataFrame:
    users_with = lambda name: ev[ev["name"] == name].groupby("date")["user"].nunique()
    turns = ev[ev["name"] == "card_shown"].groupby(["date", "user"]).size()
    played3 = (turns >= 3).groupby(level=0).sum()
    first_day = ev.groupby("user")["date"].min()
    returning = ev[ev["date"] > ev["user"].map(first_day)].groupby("date")["user"].nunique()
    f = pd.DataFrame({
        "visitors": users_with("session_start"),
        "started_a_game": users_with("game_start"),
        "played_3_plus": played3,
        "hit_guest_wall": users_with("guest_wall"),
        "signed_up": users_with("signup"),
        "returning_users": returning,
        "premium_started": users_with("premium_on"),
    }).fillna(0).astype(int)
    f["signup_rate"] = (f["signed_up"] / f["visitors"].where(f["visitors"] > 0)).round(3)
    return f.rename_axis("date").reset_index()


def retention(ev: pd.DataFrame) -> pd.DataFrame:
    """Share of each first-week cohort active in week 0, 1, 2, ... after their first visit."""
    week = pd.to_datetime(ev["date"]).dt.to_period("W").dt.start_time
    first = week.groupby(ev["user"]).transform("min")
    offset = ((week - first).dt.days // 7).astype(int)
    active = pd.DataFrame({"cohort": first.dt.date, "week": offset, "user": ev["user"]}).drop_duplicates()
    table = active.pivot_table(index="cohort", columns="week", values="user", aggfunc="nunique").fillna(0)
    sizes = table[0]
    pct = table.div(sizes, axis=0).round(3)
    pct.columns = [f"week {c}" for c in pct.columns]
    pct.insert(0, "users", sizes.astype(int))
    return pct.reset_index()


def by_ref(ev: pd.DataFrame) -> pd.DataFrame:
    if "ref" not in ev:
        return pd.DataFrame(columns=["ref"])
    first_ref = ev[ev["name"] == "session_start"].dropna(subset=["ref"]).groupby("user")["ref"].first()
    e = ev[ev["user"].isin(first_ref.index)].assign(ref=lambda d: d["user"].map(first_ref))
    out = pd.DataFrame({
        "visitors": e.groupby("ref")["user"].nunique(),
        "started_a_game": e[e["name"] == "game_start"].groupby("ref")["user"].nunique(),
        "signed_up": e[e["name"] == "signup"].groupby("ref")["user"].nunique(),
        "premium": e[e["name"] == "premium_on"].groupby("ref")["user"].nunique(),
    }).fillna(0).astype(int)
    out["signup_rate"] = (out["signed_up"] / out["visitors"].where(out["visitors"] > 0)).round(3)
    return out.rename_axis("ref").reset_index().sort_values("visitors", ascending=False)


README = [
    ("What this is", "Anonymous game stats from midnightvibes.online. No names, emails, gender, typed moods or card text are ever collected; user ids are salted hashes."),
    ("Time zone", f"All times are {TZ}."),
    ("Events", "One row per event. name: session_start, game_start, card_shown, card_skip, card_done, card_star, mood_set, guest_wall, signup, signin, room_start, room_join, premium_view, checkout_start, premium_on. Other columns are that event's details."),
    ("Events: source", "top = a top pick, deck = normal built-in card, ai = AI card for the mood, tailored = Premium 'Picked for you'."),
    ("Events: ms_on_card", "Milliseconds between the card appearing and Done/Skip."),
    ("Sessions", "One row per app open: user, start, minutes, ref (Instagram code), games, cards, skips, stars, hit_guest_wall, signed_up."),
    ("Cards", "Per card: shown, done, skipped, stars (net), rates, avg_seconds, and score = star rate smoothed towards the average (Bayesian average, 20 views of prior) so cards with few views don't top the list by luck."),
    ("Funnel by day", "Distinct users per day at each step: visitors → started_a_game → played_3_plus → hit_guest_wall → signed_up → returning_users → premium_started."),
    ("Retention", "Rows: week of first visit (cohort). Columns: share of that cohort active N weeks later."),
    ("By ref", "Users grouped by the ?ref= code of their first visit (e.g. ig-011 from an Instagram post)."),
    ("Instagram posts", "Yours to fill in. Put the same code in ref as in the post's link (midnightvibes.online/?ref=ig-011). The visitors and signed_up columns fill themselves from By ref."),
]


# ---------- Write ----------

def write(path: Path, sheets: dict[str, pd.DataFrame], demo: bool) -> None:
    path.parent.mkdir(exist_ok=True)
    keep_ig = path.exists()
    if keep_ig:
        wb = load_workbook(path)
        for name in wb.sheetnames:
            if name != IG_SHEET:
                del wb[name]
        wb.save(path)
    mode = "a" if keep_ig else "w"
    extra = {"if_sheet_exists": "replace"} if keep_ig else {}
    with pd.ExcelWriter(path, engine="openpyxl", mode=mode, **extra) as xl:
        readme = pd.DataFrame(README, columns=["Sheet / field", "Meaning"])
        if demo:
            readme.loc[-1] = ["DEMO DATA", "Made-up numbers for practice. Run without --demo for real data."]
            readme = readme.sort_index()
        readme.to_excel(xl, sheet_name="README", index=False)
        for name, df in sheets.items():
            df.to_excel(xl, sheet_name=name, index=False)
        if not keep_ig or IG_SHEET not in xl.book.sheetnames:
            pd.DataFrame(columns=IG_COLUMNS).to_excel(xl, sheet_name=IG_SHEET, index=False)

    wb = load_workbook(path)
    header = PatternFill("solid", fgColor="7A1F3D")
    for ws in wb.worksheets:
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = header
        ws.freeze_panes = "A2"
        for col in ws.columns:
            width = max(len(str(c.value or "")) for c in list(col)[:200])
            ws.column_dimensions[col[0].column_letter].width = min(max(10, width + 2), 90)
    # Instagram sheet: lookups into By ref (added once; your own columns are left alone)
    ig = wb[IG_SHEET]
    if ig.cell(1, len(IG_COLUMNS) + 1).value is None:
        for i, title in enumerate(["visitors (from By ref)", "signed_up (from By ref)"]):
            col = len(IG_COLUMNS) + 1 + i
            ig.cell(1, col, title).font = Font(bold=True)
            for row in range(2, 201):
                ref_cell = f"A{row}"
                look = 2 if i == 0 else 4
                ig.cell(row, col, f'=IF({ref_cell}="","",IFERROR(VLOOKUP({ref_cell},\'By ref\'!A:F,{look},FALSE),0))')
    order = ["README", "Funnel by day", "Retention", "Cards", "By ref", IG_SHEET, "Sessions", "Events"]
    wb._sheets = [wb[n] for n in order if n in wb.sheetnames] + [s for s in wb.worksheets if s.title not in order]
    wb.save(path)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--demo", action="store_true", help="use made-up data (no key needed)")
    args = ap.parse_args()

    raw = demo_events() if args.demo else fetch_events()
    if raw.empty:
        raise SystemExit("No events yet. Play a few cards on the site, or try --demo.")
    ev = tidy(raw)
    cards = load_cards()
    sheets = {
        "Funnel by day": funnel_by_day(ev),
        "Retention": retention(ev),
        "Cards": card_stats(ev, cards),
        "By ref": by_ref(ev),
        "Sessions": sessions(ev),
        "Events": ev,
    }
    out = DATA / ("midnight-vibes-analytics-DEMO.xlsx" if args.demo else "midnight-vibes-analytics.xlsx")
    write(out, sheets, args.demo)
    print(f"{len(ev)} events, {ev['user'].nunique()} people, {ev['session_id'].nunique()} sessions -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
