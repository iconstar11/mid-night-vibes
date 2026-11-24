"""Export Midnight Vibes game stats to an Excel workbook for analysis.

    .venv/Scripts/python scripts/export_analytics.py          # real data (needs .env, see below)
    .venv/Scripts/python scripts/export_analytics.py --demo   # made-up data to practise on

Real data needs a git-ignored .env in the repo root with:
    SUPABASE_URL=https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=<the secret / service_role key from Supabase → Project Settings → API>
Never commit that key or put it in the app.

Privacy: the events table never holds names, emails, gender, typed moods or card text. On top of that,
user ids are replaced by salted hashes here, so the workbook can't be tied back to an account.
AI card text comes from the ai_cards table: as the AI wrote it, with {target} placeholders, no names.

Social media: the "Posts" sheet is yours (one row per post, see scripts/social.py). Put the platform
exports from TikTok Studio, Meta Business Suite and YouTube Studio in data/social/ and re-run: their numbers
are matched to your posts. Re-running keeps Posts as you typed it (a copy of the last workbook is kept as
*.bak.xlsx) and refreshes every other sheet. The export also writes data/card-stats.json, which
cards_to_excel.py uses to suggest top picks and list AI cards you can add to the deck.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill

sys.path.insert(0, str(Path(__file__).resolve().parent))
import social  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
TZ = "Africa/Nairobi"

# Combined score: each play is worth 3 for a star, 1 for Done, -1 for a Skip; averaged per play and pulled
# towards the overall average until a card has PRIOR_PLAYS plays (a Bayesian average), so luck can't win.
STAR_W, DONE_W, SKIP_W, PRIOR_PLAYS = 3, 1, -1, 20
SUGGEST_MIN_PLAYS = 30


# ---------- Load ----------

def supabase_get(table: str, select: str) -> list[dict]:
    load_dotenv(ROOT / ".env")
    url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise SystemExit("Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env (see the top of this file), or use --demo.")
    rows, page = [], 1000
    while True:
        r = requests.get(
            f"{url}/rest/v1/{table}",
            params={"select": select, "order": "created_at" if table == "ai_cards" else "id", "limit": page, "offset": len(rows)},
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=60,
        )
        r.raise_for_status()
        batch = r.json()
        rows += batch
        if len(batch) < page:
            return rows


def fetch() -> tuple[pd.DataFrame, pd.DataFrame]:
    events = pd.DataFrame(supabase_get("events", "at,user_id,session_id,name,props"), columns=["at", "user_id", "session_id", "name", "props"])
    ai = pd.DataFrame(supabase_get("ai_cards", "id,game,type,label,text,heat,audience,provider,tailored,created_at"))
    return events, ai


def load_cards() -> pd.DataFrame:
    """Built-in (and promoted) cards with their ids, from the app's own source via dump_cards.mts."""
    subprocess.run(["node", "--no-warnings", "scripts/dump_cards.mts"], cwd=ROOT / "mobile", check=True, capture_output=True)
    cards = pd.DataFrame(json.loads((DATA / "cards.json").read_text(encoding="utf8")))
    return cards.drop_duplicates(["id", "group", "game"])


def top_pick_ids() -> set[str]:
    return set(re.findall(r'"(c-[0-9a-z]+)"', (ROOT / "mobile/src/game/topPicks.ts").read_text(encoding="utf8")))


def demo_data(n_users: int = 500, seed: int = 7, post_refs: pd.Series | None = None) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Plausible fake data with real card ids (and some fake AI cards), so every sheet has something to show."""
    rng = np.random.default_rng(seed)
    cards = load_cards()
    top = top_pick_ids()
    quality = {cid: float(rng.beta(5, 4)) for cid in cards["id"]}  # hidden "true" appeal of each card
    for cid in top:
        quality[cid] = min(0.95, quality.get(cid, 0.6) + 0.12)

    ai_rows = []
    for i in range(60):
        typ = rng.choice(["truth", "dare", "wedge"], p=[0.4, 0.4, 0.2])
        aud = rng.choice(["couple-mf", "couple-any", "friends", "girls", "boys"], p=[0.45, 0.15, 0.25, 0.1, 0.05])
        ai_rows.append({"id": f"ai-demo{i:03d}", "game": "wheel" if typ == "wedge" else "tod", "type": typ,
                        "label": f"AI wedge {i}" if typ == "wedge" else None,
                        "text": f"(demo AI {typ} #{i}) " + ("Whisper a secret to {target}." if typ != "truth" else "What's your boldest wish tonight?"),
                        "heat": int(rng.integers(1, 4)), "audience": aud, "provider": "demo", "tailored": bool(rng.random() < 0.2),
                        "created_at": pd.Timestamp.now(tz="UTC").isoformat()})
        quality[f"ai-demo{i:03d}"] = float(rng.beta(4, 4))
    ai = pd.DataFrame(ai_rows)

    # Where people came from: about half from a post (more from posts with more views), some from bio links
    if post_refs is not None and len(post_refs):
        ref_names = list(post_refs.index) + ["tt-bio", "ig-bio"]
        w = np.append(post_refs.to_numpy(dtype=float), [post_refs.mean() * 8, post_refs.mean() * 4])
        ref_names, ref_w = [None] + ref_names, np.append([w.sum()], w)
    else:
        ref_names, ref_w = [None, "tt-1", "ig-1"], np.array([6.0, 1, 1])
    ref_w = ref_w / ref_w.sum()
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
            clock = [t]

            def add(name, props, clock=clock, uid=uid, sid=sid):
                rows.append({"at": clock[0].isoformat(), "user_id": uid, "session_id": sid, "name": name, "props": props})

            add("session_start", {"ref": ref_names[rng.choice(len(ref_names), p=ref_w)] if s == 0 else None, "platform": "web", "installed": bool(rng.random() < 0.15)})
            if rng.random() < 0.25:
                continue
            group = str(rng.choice(["couple", "friends", "girls", "boys"], p=[0.55, 0.25, 0.12, 0.08]))
            heat = int(rng.choice([1, 2, 3], p=[0.45, 0.35, 0.2]))
            game = str(rng.choice(["tod", "wheel"], p=[0.7, 0.3]))
            deck = "couple" if group == "couple" else "group"
            mood = signed_up and rng.random() < 0.4
            clock[0] += pd.Timedelta(seconds=20)
            add("game_start", {"game": game, "group": group, "heat": heat, "players_n": 2 if group == "couple" else int(rng.integers(3, 8)), "has_mood": bool(mood)})
            pool = cards[(cards["game"] == game) & (cards["group"] == deck) & (cards["heat"] <= heat)]
            ai_pool = ai[(ai["game"] == game) & (ai["heat"] <= heat)]
            turns = int(rng.integers(3, 25)) if (signed_up or s > 0) else int(rng.integers(1, 5))
            for k in range(turns):
                if not signed_up and k >= 3:
                    add("guest_wall", {"reason": "turns", "game": game})
                    if rng.random() < 0.3:
                        signed_up = True
                        add("signup", {"method": str(rng.choice(["email", "google"], p=[0.4, 0.6])), "from": "turns"})
                        if rng.random() < 0.7:
                            add("found_via", {"found": str(rng.choice(["tiktok", "instagram", "facebook", "youtube", "friend", "search", "other"],
                                                                      p=[0.35, 0.2, 0.1, 0.12, 0.15, 0.05, 0.03]))})
                    break
                if mood and len(ai_pool) and rng.random() < 0.6:
                    card = ai_pool.sample(1, random_state=int(rng.integers(1e9))).iloc[0]
                    source = "tailored" if card["tailored"] else "ai"
                else:
                    card = pool.sample(1, random_state=int(rng.integers(1e9))).iloc[0]
                    source = "top" if card["id"] in top and k < 3 else "deck"
                ctx = {"game": game, "group": group, "heat": heat, "guest": not signed_up, "card_id": card["id"], "type": card["type"], "source": source}
                clock[0] += pd.Timedelta(seconds=float(rng.uniform(15, 90)))
                add("card_shown", {**ctx, "turn_n": k + 1})
                q = quality[card["id"]] - (0.08 if (heat == 3 and group != "couple") else 0)
                ms = int(rng.uniform(8000, 70000))
                add("card_done" if rng.random() < q else "card_skip", {**ctx, "ms_on_card": ms})
                if rng.random() < q * 0.2:
                    add("card_star", {**ctx, "on": True})
            if signed_up and not premium and rng.random() < 0.12:
                add("premium_view", {"plan": "free"})
                if rng.random() < 0.35:
                    add("checkout_start", {"product": str(rng.choice(["monthly", "yearly", "pass"]))})
                    if rng.random() < 0.7:
                        premium = True
                        add("premium_on", {"product": "monthly"})
    return pd.DataFrame(rows), ai


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
    df["at"] = pd.to_datetime(df["at"], utc=True, format="ISO8601").dt.tz_convert(TZ)
    props = pd.json_normalize(df["props"].map(lambda p: p if isinstance(p, dict) else {})).set_index(df.index)
    df = pd.concat([df.drop(columns=["user_id", "props"]), props], axis=1)
    for col in ["card_id", "group", "heat", "guest", "source", "type", "on", "ref", "ms_on_card"]:
        if col not in df:
            df[col] = np.nan
    df["date"] = df["at"].dt.date
    df["week"] = df["at"].dt.tz_localize(None).dt.to_period("W").dt.start_time.dt.date
    df["at"] = df["at"].dt.tz_localize(None)  # Excel can't store time zones
    first = ["at", "date", "week", "user", "session_id", "name"]
    return df[first + [c for c in df.columns if c not in first]].sort_values("at").reset_index(drop=True)


def catalog(cards: pd.DataFrame, ai: pd.DataFrame) -> pd.DataFrame:
    """Every card we know: built-in, promoted AI, and AI-written. One row per card id."""
    deck_of = {"couple-mf": "couple", "couple-ff": "couple", "couple-mm": "couple", "couple-any": "couple", "friends": "group", "girls": "girls", "boys": "boys"}
    built = cards.assign(origin=cards.get("origin", "built-in"), deck=cards["group"], label=cards["label"].where(cards["game"] == "wheel"))
    built = built[["id", "origin", "game", "type", "deck", "heat", "label", "text"]]
    if len(ai):
        a = ai.assign(origin=np.where(ai["tailored"], "AI (picked for you)", "AI"), deck=ai["audience"].map(deck_of).fillna("group"))
        a = a[["id", "origin", "game", "type", "deck", "heat", "label", "text"]]
        built = pd.concat([built, a[~a["id"].isin(built["id"])]], ignore_index=True)
    return built.drop_duplicates("id").set_index("id")


def score_table(c: pd.DataFrame, keys: list[str]) -> pd.DataFrame:
    """Plays, done, skips, stars, rates and the combined score for card events grouped by `keys`."""
    if c.empty:
        return pd.DataFrame(columns=keys + ["shown", "done", "skipped", "stars", "done_rate", "skip_rate", "star_rate", "score", "avg_seconds"])
    g = c.groupby(keys)
    t = pd.DataFrame({
        "shown": g["name"].apply(lambda x: (x == "card_shown").sum()),
        "done": g["name"].apply(lambda x: (x == "card_done").sum()),
        "skipped": g["name"].apply(lambda x: (x == "card_skip").sum()),
        "stars": g.apply(lambda d: max(int(((d["name"] == "card_star") & (d["on"] == True)).sum())  # noqa: E712
                                       - int(((d["name"] == "card_star") & (d["on"] == False)).sum()), 0), include_groups=False),  # noqa: E712
    })
    t["avg_seconds"] = (c[c["name"].isin(["card_done", "card_skip"])].groupby(keys)["ms_on_card"].mean() / 1000).round(1)
    shown = t["shown"].where(t["shown"] > 0)
    t["done_rate"] = (t["done"] / shown).round(3)
    t["skip_rate"] = (t["skipped"] / shown).round(3)
    t["star_rate"] = (t["stars"] / shown).round(3)
    value = STAR_W * t["stars"] + DONE_W * t["done"] + SKIP_W * t["skipped"]
    prior = value.sum() / max(t["shown"].sum(), 1)
    t["score"] = ((value + prior * PRIOR_PLAYS) / (t["shown"] + PRIOR_PLAYS)).round(4)
    return t.reset_index()


def card_events(ev: pd.DataFrame) -> pd.DataFrame:
    c = ev[ev["card_id"].notna() & ev["name"].isin(["card_shown", "card_done", "card_skip", "card_star"])].copy()
    c["player"] = np.where(c["guest"] == True, "guest", np.where(c["guest"] == False, "signed in", "unknown"))  # noqa: E712
    c["heat"] = c["heat"].fillna(0).astype(int)
    c["group"] = c["group"].fillna("unknown")
    return c


def card_sheets(ev: pd.DataFrame, cat: pd.DataFrame) -> tuple[dict[str, pd.DataFrame], pd.DataFrame]:
    c = card_events(ev)
    overall = score_table(c, ["card_id"]).set_index("card_id")
    allc = cat.join(overall, how="left")
    for col in ["shown", "done", "skipped", "stars"]:
        allc[col] = allc[col].fillna(0).astype(int)
    allc["top_pick"] = allc.index.isin(top_pick_ids())
    cols = ["rank", "origin", "deck", "heat", "label", "text", "shown", "done", "skipped", "stars",
            "done_rate", "skip_rate", "star_rate", "score", "avg_seconds", "top_pick"]
    sheets = {}
    for name, mask in [("Truths", allc["type"] == "truth"), ("Dares", allc["type"] == "dare"), ("Spin the Wheel", allc["type"] == "wedge")]:
        t = allc[mask].sort_values(["score", "shown"], ascending=[False, False], na_position="last").copy()
        t["rank"] = range(1, len(t) + 1)
        t.loc[t["shown"] == 0, "rank"] = np.nan  # unplayed cards have no rank yet
        keep = [x for x in cols if x in t and (name == "Spin the Wheel" or x != "label")]
        sheets[name] = t[keep].rename_axis("card_id").reset_index()
    return sheets, allc


def breakdowns(ev: pd.DataFrame, cat: pd.DataFrame) -> dict[str, pd.DataFrame]:
    c = card_events(ev)
    info = cat[["type", "text"]]
    out = {}
    for sheet, key in [("By group", "group"), ("By heat", "heat"), ("Guests vs signed-in", "player"), ("By week", "week")]:
        t = score_table(c, ["card_id", key]).join(info, on="card_id")
        t = t[["card_id", "type", "text", key] + [x for x in t.columns if x not in ("card_id", "type", "text", key)]]
        out[sheet] = t.sort_values(["type", "card_id", key]).reset_index(drop=True)
    return out


def top_cards(ev: pd.DataFrame, cat: pd.DataFrame, n: int = 5) -> pd.DataFrame:
    """Top n cards per type × group played in × heat chosen, by combined score (cards with 5+ plays)."""
    c = card_events(ev)
    t = score_table(c, ["card_id", "group", "heat"]).join(cat[["type", "text", "origin"]], on="card_id")
    t = t[t["shown"] >= 5]
    t = t.sort_values("score", ascending=False).groupby(["type", "group", "heat"], group_keys=False).head(n)
    t = t.sort_values(["type", "group", "heat", "score"], ascending=[True, True, True, False])
    t["place"] = t.groupby(["type", "group", "heat"]).cumcount() + 1
    return t[["type", "group", "heat", "place", "text", "origin", "shown", "stars", "done_rate", "skip_rate", "score", "card_id"]]


def sessions(ev: pd.DataFrame) -> pd.DataFrame:
    g = ev.groupby("session_id")
    count = lambda n: g["name"].apply(lambda x: (x == n).sum())
    out = pd.DataFrame({
        "user": g["user"].first(), "start": g["at"].min(),
        "minutes": ((g["at"].max() - g["at"].min()).dt.total_seconds() / 60).round(1),
        "ref": g["ref"].first(), "games": count("game_start"), "cards": count("card_shown"),
        "skips": count("card_skip"), "stars": count("card_star"),
        "hit_guest_wall": g["name"].apply(lambda x: (x == "guest_wall").any()),
        "signed_up": g["name"].apply(lambda x: (x == "signup").any()),
    })
    return out.reset_index().sort_values("start")


def funnel_by_day(ev: pd.DataFrame) -> pd.DataFrame:
    users_with = lambda name: ev[ev["name"] == name].groupby("date")["user"].nunique()
    turns = ev[ev["name"] == "card_shown"].groupby(["date", "user"]).size()
    first_day = ev.groupby("user")["date"].min()
    f = pd.DataFrame({
        "visitors": users_with("session_start"), "started_a_game": users_with("game_start"),
        "played_3_plus": (turns >= 3).groupby(level=0).sum(), "hit_guest_wall": users_with("guest_wall"),
        "signed_up": users_with("signup"),
        "returning_users": ev[ev["date"] > ev["user"].map(first_day)].groupby("date")["user"].nunique(),
        "premium_started": users_with("premium_on"),
    }).fillna(0).astype(int)
    f["signup_rate"] = (f["signed_up"] / f["visitors"].where(f["visitors"] > 0)).round(3)
    return f.rename_axis("date").reset_index()


def retention(ev: pd.DataFrame) -> pd.DataFrame:
    week = pd.to_datetime(ev["week"])
    first = week.groupby(ev["user"]).transform("min")
    active = pd.DataFrame({"cohort": first.dt.date, "week": ((week - first).dt.days // 7).astype(int), "user": ev["user"]}).drop_duplicates()
    table = active.pivot_table(index="cohort", columns="week", values="user", aggfunc="nunique").fillna(0)
    pct = table.div(table[0], axis=0).round(3)
    pct.columns = [f"week {c}" for c in pct.columns]
    pct.insert(0, "users", table[0].astype(int))
    return pct.reset_index()


def by_ref(ev: pd.DataFrame) -> pd.DataFrame:
    first_ref = ev[ev["name"] == "session_start"].dropna(subset=["ref"]).groupby("user")["ref"].first()
    if first_ref.empty:
        return pd.DataFrame(columns=["ref", "visitors", "started_a_game", "signed_up", "premium", "signup_rate"])
    e = ev[ev["user"].isin(first_ref.index)].assign(ref=lambda d: d["user"].map(first_ref))
    out = pd.DataFrame({
        "visitors": e.groupby("ref")["user"].nunique(),
        "started_a_game": e[e["name"] == "game_start"].groupby("ref")["user"].nunique(),
        "signed_up": e[e["name"] == "signup"].groupby("ref")["user"].nunique(),
        "premium": e[e["name"] == "premium_on"].groupby("ref")["user"].nunique(),
    }).fillna(0).astype(int)
    out["signup_rate"] = (out["signed_up"] / out["visitors"].where(out["visitors"] > 0)).round(3)
    return out.rename_axis("ref").reset_index().sort_values("visitors", ascending=False)


def heat_rises(ev: pd.DataFrame) -> pd.DataFrame:
    """Each automatic heat rise ("heat rises over time"), whether players undid it, and the skip rate in the
    10 finished cards before and after it. Use it to tune the rule in mobile/src/game/heatRise.ts
    (6 turns / 2 per player, 6 minutes, 70% done): many undos or a skip rate that jumps after a rise = rising too early."""
    cols = ["at", "user", "group", "from", "to", "turns_at_level", "minutes", "comfort", "players", "undone", "skip_rate_before", "skip_rate_after"]
    ups = ev[ev["name"] == "heat_up"]
    if ups.empty:
        return pd.DataFrame(columns=cols)
    ends = ev[ev["name"].isin(["card_done", "card_skip"])]
    undos = ev[ev["name"] == "heat_undo"]
    rate = lambda d: round(float((d["name"] == "card_skip").mean()), 2) if len(d) else np.nan
    rows = []
    for _, u in ups.iterrows():
        mine = ends[ends["session_id"] == u["session_id"]]
        undone = undos[(undos["session_id"] == u["session_id"]) & (undos["at"] >= u["at"]) & (undos["at"] <= u["at"] + pd.Timedelta(minutes=2))]
        rows.append({
            "at": u["at"], "user": u["user"], "group": u.get("group"), "from": u.get("from"), "to": u.get("to"),
            "turns_at_level": u.get("turn_n"), "minutes": u.get("minutes"), "comfort": u.get("comfort"), "players": u.get("players_n"),
            "undone": not undone.empty,
            "skip_rate_before": rate(mine[mine["at"] < u["at"]].tail(10)), "skip_rate_after": rate(mine[mine["at"] > u["at"]].head(10)),
        })
    return pd.DataFrame(rows, columns=cols)


def write_card_stats(allc: pd.DataFrame, path: Path) -> None:
    """For cards_to_excel.py: suggested top picks (top 3 per game/deck/heat with enough plays) and AI card stats."""
    played = allc[allc["shown"] >= SUGGEST_MIN_PLAYS].reset_index().rename(columns={"index": "id"})
    suggested = (played[~played["origin"].str.startswith("AI")].sort_values("score", ascending=False)
                 .groupby(["game", "type", "deck", "heat"]).head(3)["id"].tolist())
    ai = allc[allc["origin"].str.startswith("AI")].reset_index().rename(columns={"index": "id"})
    stats = {
        "suggested": suggested,
        "cards": {i: {k: (None if pd.isna(v) else (float(v) if isinstance(v, (np.floating, float)) else (int(v) if isinstance(v, (np.integer,)) else v)))
                      for k, v in r.items()} for i, r in allc[["shown", "stars", "done_rate", "skip_rate", "score"]].iterrows()},
        "ai_cards": ai[["id", "game", "type", "deck", "heat", "label", "text", "origin", "shown", "stars", "done_rate", "skip_rate", "score"]]
                    .replace({np.nan: None}).to_dict("records"),
    }
    path.write_text(json.dumps(stats, default=str), encoding="utf8")


README = [
    ("What this is", "Anonymous game stats from midnightvibes.online. No names, emails, gender, typed moods are ever collected; user ids are salted hashes. AI card text is as the AI wrote it ({target} = a player)."),
    ("Time zone", f"All times are {TZ}. Weeks start on Monday."),
    ("Score", f"Combined score per play: {STAR_W} for a star, {DONE_W} for Done, {SKIP_W} for a Skip, averaged and pulled towards the overall average until a card has {PRIOR_PLAYS} plays (Bayesian average). Higher is better; sort by it."),
    ("Truths / Dares / Spin the Wheel", "Every card we have, built-in, promoted and AI-written, played or not. rank is by score; unplayed cards have no rank yet. top_pick = shown first in every session."),
    ("Top cards", "The top 5 cards for each type × group they were played in × heat chosen (cards with 5+ plays there)."),
    ("By group / By heat / Guests vs signed-in / By week", "Each card's numbers split by that one thing. Filter by card_id or text to compare a card across groups, heats, player types or weeks."),
    ("Funnel by day", "Distinct people per day at each step: visitors → started_a_game → played_3_plus → hit_guest_wall → signed_up → returning_users → premium_started."),
    ("Retention", "Rows: week of first visit (cohort). Columns: share of that cohort active N weeks later."),
    ("By ref", "People grouped by the ref code of their first visit: tt-12 = came from piece 12 on TikTok (short link midnightvibes.online/t/12), ig- Instagram (/i/), fb- Facebook (/f/), yt- YouTube (/y/); tt-bio etc. = the bio link (/tt, /ig, /fb, /yt)."),
    ("Posts", "Yours: one row per post. Type ref (tt-12), and piece/platform fill themselves on the next export. The grey-headed columns are formulas: views to saves from Social raw, visitors to premium from By ref. engagement rate = (likes+comments+shares)/views."),
    ("Social raw", "Every post found in the platform exports in data/social/, matched to a ref by the code in the caption, the same link as in Posts, or the post time (within 2 hours). Empty ref = not matched yet: add the post to Posts."),
    ("Social summary", "Posts, views, engagement rate and sign-ups per 1,000 views by platform, format, time slot, hook, game and how it was posted. Sign-ups per 1k views is the one that matters: it shows which posts bring players."),
    ("By piece", "The same piece side by side on each platform."),
    ("Found via", "Answers to 'Where did you find us?' after sign-up, people per week."),
    ("Sessions / Events", "One row per app open / per event, for your own pivot tables."),
]


# ---------- Write ----------

def write(path: Path, sheets: dict[str, pd.DataFrame], posts: pd.DataFrame, demo: bool) -> None:
    path.parent.mkdir(exist_ok=True)
    if path.exists():
        shutil.copy2(path, path.with_suffix(".bak.xlsx"))  # in case something goes wrong with your Posts rows
    with pd.ExcelWriter(path, engine="openpyxl") as xl:
        readme = pd.DataFrame(README, columns=["Sheet / field", "Meaning"])
        if demo:
            readme = pd.concat([pd.DataFrame([["DEMO DATA", "Made-up numbers for practice. Run without --demo for real data."]], columns=readme.columns), readme])
        readme.to_excel(xl, sheet_name="README", index=False)
        for name, df in sheets.items():
            df.to_excel(xl, sheet_name=name, index=False)
        social.write_posts(xl.book.create_sheet(social.POSTS), posts)

    wb = load_workbook(path)
    header = PatternFill("solid", fgColor="7A1F3D")
    formula = PatternFill("solid", fgColor="8A8A8A")
    gold = PatternFill("solid", fgColor="F6E7C1")
    for ws in wb.worksheets:
        for cell in ws[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = formula if ws.title == social.POSTS and cell.value in social.COMPUTED else header
        ws.freeze_panes = "B2"
        ws.auto_filter.ref = ws.dimensions
        for col in ws.columns:
            width = max([len(str(c.value or "")) for c in list(col)[:300] if not str(c.value or "").startswith("=")] or [9])
            ws.column_dimensions[col[0].column_letter].width = min(max(9, width + 2), 80)
    for name in ["Truths", "Dares", "Spin the Wheel"]:  # gold rows for the top 10
        ws = wb[name]
        for row in ws.iter_rows(min_row=2, max_row=11):
            if row[1].value is not None:
                for cell in row:
                    cell.fill = gold
    order = ["README", "Truths", "Dares", "Spin the Wheel", "Top cards", "By group", "By heat", "Guests vs signed-in", "By week",
             "Funnel by day", "Retention", "By ref", social.POSTS, "Social summary", "By piece", "Social raw", "Found via", "Sessions", "Events"]
    wb._sheets = [wb[n] for n in order if n in wb.sheetnames] + [s for s in wb.worksheets if s.title not in order]
    wb.save(path)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--demo", action="store_true", help="use made-up data (no key needed)")
    args = ap.parse_args()

    out = DATA / ("midnight-vibes-analytics-DEMO.xlsx" if args.demo else "midnight-vibes-analytics.xlsx")
    if args.demo:
        posts, exported = social.demo()
        views = social.match(exported, posts).groupby("ref")["views"].sum()
        raw, ai = demo_data(post_refs=views)
    else:
        posts = social.read_posts(out)
        exported = social.read_exports(DATA / "social")
        raw, ai = fetch()
    if raw.empty:
        raise SystemExit("No events yet. Play a few cards on the site, or try --demo.")
    ev = tidy(raw)
    cat = catalog(load_cards(), ai)
    per_type, allc = card_sheets(ev, cat)
    refs = by_ref(ev)
    social_raw = social.match(exported, posts) if len(exported) else pd.DataFrame(columns=social.RAW_COLS)
    per_post = social.per_post(posts, social_raw, refs)
    sheets = {**per_type, "Top cards": top_cards(ev, cat), **breakdowns(ev, cat),
              "Funnel by day": funnel_by_day(ev), "Retention": retention(ev), "By ref": refs,
              "Social summary": social.summary(per_post), "By piece": social.by_piece(per_post), "Social raw": social_raw,
              "Found via": social.found_via(ev), "Heat rises": heat_rises(ev),
              "Premium interest": ev[ev["name"] == "premium_interest"].groupby("date")["user"].nunique().rename("people").reset_index(), "Sessions": sessions(ev), "Events": ev}
    write(out, sheets, posts, args.demo)
    write_card_stats(allc, DATA / ("card-stats-DEMO.json" if args.demo else "card-stats.json"))
    print(f"{len(ev)} events, {ev['user'].nunique()} people, {len(cat)} cards ({int((allc['shown'] > 0).sum())} played) -> {out.relative_to(ROOT)}")
    print(f"{len(posts)} posts in Posts, {len(social_raw)} exported posts ({int(social_raw['ref'].notna().sum())} matched to a ref)")


if __name__ == "__main__":
    main()
