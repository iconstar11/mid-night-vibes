"""Social media posts for the analytics workbook (used by export_analytics.py).

How it fits together
- "Posts" sheet: one row per post, filled in by you (or later by the API poster). Kept across exports.
  ref is the post's code: tt-12 = piece 12 on TikTok, ig-12 Instagram, fb-12 Facebook, yt-12 YouTube.
  The same code is on the image as a short link: midnightvibes.online/t/12, /i/12, /f/12, /y/12.
- Platform exports: drop the CSV/XLSX files from TikTok Studio, Meta Business Suite and YouTube Studio
  into data/social/ (any file names; newer files win when the same post appears twice).
- "Social raw": every exported post with its numbers, matched to a ref by (1) the code in the caption,
  (2) the same link as in Posts, or (3) the same platform and a post time within 2 hours.
- The numbers in Posts are Excel formulas over Social raw and By ref, so they update when you add rows.
"""
from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

POSTS = "Posts"
OLD_IG = "Instagram posts"
PLATFORMS = {"tt": "TikTok", "ig": "Instagram", "fb": "Facebook", "yt": "YouTube"}
LETTER = {"t": "tt", "i": "ig", "f": "fb", "y": "yt"}
USER_COLS = ["ref", "piece", "platform", "posted via (studio/api/claude)", "date", "time (24h)",
             "format (image/carousel/video)", "hook / angle", "game featured", "url", "notes"]
METRICS = ["views", "likes", "comments", "shares", "saves"]
FROM_REF = ["visitors", "started_a_game", "signed_up", "premium"]  # By ref columns B..E
COMPUTED = METRICS + ["engagement rate", *FROM_REF, "sign-ups per 1k views"]
RAW_COLS = ["platform", "posted_at", "caption", "url", *METRICS, "ref", "matched_by", "file"]

# Export column names differ per platform (and change over time), so columns are found by keyword.
FIELDS = {
    "posted_at": ["publish time", "post time", "video publish time", "date posted", "posted", "publish date", "created", "date", "time"],
    "caption": ["description", "video title", "title", "caption", "post text", "message"],
    "url": ["permalink", "video link", "post link", "link", "url"],
    "id": ["post id", "video id", "content", "id"],
    "views": ["views", "video views", "total views", "plays", "impressions", "reach"],
    "likes": ["likes", "total likes", "reactions"],
    "comments": ["comments", "comments added", "total comments"],
    "shares": ["shares", "total shares"],
    "saves": ["saves", "add to favorites", "favorites", "saved"],
}


# ---------- Reading what you typed ----------

def split_ref(ref: str) -> tuple[str | None, int | None]:
    m = re.fullmatch(r"(tt|ig|fb|yt)-(\d+)", str(ref).strip().lower())
    return (PLATFORMS[m[1]], int(m[2])) if m else (None, None)


def read_posts(path: Path) -> pd.DataFrame:
    """Your Posts rows from the last workbook (or an old 'Instagram posts' sheet, moved across once)."""
    if not path.exists():
        return pd.DataFrame(columns=USER_COLS)
    sheets = pd.ExcelFile(path).sheet_names
    if POSTS in sheets:
        df = pd.read_excel(path, sheet_name=POSTS, dtype=object)
        df = df[[c for c in df.columns if c not in COMPUTED and not str(c).startswith("Unnamed")]]
    elif OLD_IG in sheets:
        old = pd.read_excel(path, sheet_name=OLD_IG, dtype=object)
        df = pd.DataFrame({"ref": old.get("ref"), "platform": "Instagram", "date": old.get("date"), "url": old.get("url"),
                           "format (image/carousel/video)": old.get("format (reel/carousel/story/post)"),
                           "hook / angle": old.get("angle / hook"), "game featured": old.get("game featured")})
    else:
        return pd.DataFrame(columns=USER_COLS)
    df = df.dropna(how="all")
    for c in USER_COLS:
        if c not in df:
            df[c] = None
    return fill_from_ref(df[USER_COLS + [c for c in df.columns if c not in USER_COLS]])


def fill_from_ref(df: pd.DataFrame) -> pd.DataFrame:
    """Blank platform/piece are filled from the ref (tt-12 -> TikTok, 12)."""
    df = df.copy()
    parts = df["ref"].map(split_ref)
    df["platform"] = df["platform"].where(df["platform"].notna(), parts.map(lambda p: p[0]))
    df["piece"] = df["piece"].where(df["piece"].notna(), parts.map(lambda p: p[1]))
    return df


# ---------- Reading platform exports ----------

def _num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s.astype(str).str.replace(r"[,\s]", "", regex=True).replace({"": None, "nan": None, "--": None}), errors="coerce")


def _find(cols: list[str], keys: list[str]) -> str | None:
    low = {c: str(c).strip().lower() for c in cols}
    for k in keys:  # exact name first, then a column that starts with it (never a combined "a, b and c" column)
        for c, l in low.items():
            if l == k:
                return c
    for k in keys:
        for c, l in low.items():
            if l.startswith(k) and "," not in l and " and " not in l:
                return c
    return None


def _platform(file: str, url: str, cols: list[str]) -> str | None:
    hay = f"{file} {url}".lower()
    for word, name in [("tiktok", "TikTok"), ("instagram", "Instagram"), ("facebook", "Facebook"), ("fb.com", "Facebook"),
                       ("youtu", "YouTube")]:
        if word in hay:
            return name
    low = [str(c).lower() for c in cols]
    if "content" in low and any("video title" in c for c in low):
        return "YouTube"
    return None


def read_exports(folder: Path) -> pd.DataFrame:
    rows = []
    files = sorted([p for p in folder.glob("**/*") if p.suffix.lower() in (".csv", ".xlsx")], key=lambda p: p.stat().st_mtime) if folder.exists() else []
    for f in files:
        try:
            df = pd.read_csv(f, dtype=str, encoding="utf-8-sig") if f.suffix.lower() == ".csv" else pd.read_excel(f, dtype=str)
        except Exception as e:  # a file that isn't an export: say so and carry on
            print(f"  skipped {f.name}: {e}")
            continue
        cols = list(df.columns)
        pick = {k: _find(cols, v) for k, v in FIELDS.items()}
        if not pick["views"]:
            print(f"  skipped {f.name}: no views column")
            continue
        out = pd.DataFrame({k: (df[c] if c else None) for k, c in pick.items()})
        if pick["id"] and str(pick["id"]).lower() == "content":  # YouTube: video id, plus a "Total" row
            out = out[out["id"].astype(str).str.lower() != "total"]
            out["url"] = out["url"].where(out["url"].notna(), "https://youtu.be/" + out["id"].astype(str))
        for m in METRICS:
            out[m] = _num(out[m]) if out[m].notna().any() else np.nan
        out["posted_at"] = pd.to_datetime(out["posted_at"], errors="coerce", dayfirst=False)
        out["platform"] = [_platform(f.name, str(u), cols) for u in out["url"].fillna("")]
        out["file"] = f.name
        rows.append(out.dropna(subset=["views"]))
    if not rows:
        return pd.DataFrame(columns=RAW_COLS + ["id"])
    raw = pd.concat(rows, ignore_index=True)
    key = raw["url"].fillna("").map(norm_url)
    key = key.where(key != "", raw["platform"].fillna("") + raw["posted_at"].astype(str) + raw["caption"].fillna("").str[:40])
    return raw.assign(_k=key).drop_duplicates("_k", keep="last").drop(columns="_k").reset_index(drop=True)


def norm_url(u: str) -> str:
    u = str(u or "").strip().lower()
    if not u or u == "nan":
        return ""
    return re.sub(r"^https?://(www\.|m\.)?", "", u.split("?")[0]).rstrip("/")


# ---------- Matching exports to your posts ----------

CODE = re.compile(r"(?:midnightvibes\.online)?/([tify])/(\d{1,4})\b|\b(tt|ig|fb|yt)-(\d{1,4})\b", re.I)


def code_in(text: str) -> str | None:
    m = CODE.search(str(text or ""))
    if not m:
        return None
    return f"{LETTER[m[1].lower()]}-{int(m[2])}" if m[1] else f"{m[3].lower()}-{int(m[4])}"


def post_time(posts: pd.DataFrame) -> pd.Series:
    d = pd.to_datetime(posts["date"], errors="coerce").dt.normalize()
    t = pd.to_timedelta(posts["time (24h)"].astype(str).str.extract(r"(\d{1,2}:\d{2})")[0].fillna("00:00") + ":00", errors="coerce")
    return d + t


def match(raw: pd.DataFrame, posts: pd.DataFrame) -> pd.DataFrame:
    raw = raw.copy()
    raw["ref"], raw["matched_by"] = None, None
    by_url = {norm_url(u): r for u, r in zip(posts["url"], posts["ref"]) if norm_url(u)}
    when = posts.assign(_t=post_time(posts)).dropna(subset=["_t", "ref"])
    for i, row in raw.iterrows():
        ref = code_in(row["caption"])
        if ref:
            raw.loc[i, ["ref", "matched_by"]] = [ref, "code in caption"]
            continue
        u = norm_url(row["url"])
        hit = by_url.get(u) or next((r for k, r in by_url.items() if u and (k in u or u in k)), None)
        if hit:
            raw.loc[i, ["ref", "matched_by"]] = [hit, "same link"]
            continue
        if pd.notna(row["posted_at"]):
            same = when[when["platform"] == row["platform"]]
            gap = (same["_t"] - row["posted_at"]).abs()
            if len(gap) and gap.min() <= pd.Timedelta(hours=2):
                raw.loc[i, ["ref", "matched_by"]] = [same.loc[gap.idxmin(), "ref"], "post time"]
    return raw[RAW_COLS]


# ---------- Tables ----------

def per_post(posts: pd.DataFrame, raw: pd.DataFrame, by_ref: pd.DataFrame) -> pd.DataFrame:
    """Your posts with their numbers (the same sums the Posts formulas make)."""
    m = raw.dropna(subset=["ref"]).groupby("ref")[METRICS].sum()
    br = by_ref.set_index("ref")[FROM_REF] if len(by_ref) else pd.DataFrame(columns=FROM_REF)
    p = posts.dropna(subset=["ref"]).join(m, on="ref").join(br, on="ref")
    p[METRICS + FROM_REF] = p[METRICS + FROM_REF].fillna(0)
    p["interactions"] = p["likes"] + p["comments"] + p["shares"]
    p["slot"] = post_time(p).dt.hour.map(lambda h: np.nan if pd.isna(h) else "morning (5-12)" if 5 <= h < 12 else
                                         "afternoon (12-17)" if 12 <= h < 17 else "evening (17-22)" if 17 <= h < 22 else "night (22-5)")
    return p


def summary(p: pd.DataFrame) -> pd.DataFrame:
    """One long table: each breakdown x value, ready for a pivot or a chart."""
    out = []
    for label, col in [("platform", "platform"), ("format", "format (image/carousel/video)"), ("time slot", "slot"),
                       ("hook / angle", "hook / angle"), ("game featured", "game featured"), ("posted via", "posted via (studio/api/claude)")]:
        g = p.dropna(subset=[col]).groupby(col)
        if not len(g):
            continue
        t = g.agg(posts=("ref", "count"), views=("views", "sum"), interactions=("interactions", "sum"),
                  visitors=("visitors", "sum"), signed_up=("signed_up", "sum"), premium=("premium", "sum"))
        t = t.rename_axis("value").reset_index()
        t.insert(0, "breakdown", label)
        out.append(t)
    if not out:
        return pd.DataFrame(columns=["breakdown", "value", "posts", "views", "interactions", "engagement rate", "visitors", "signed_up",
                                     "premium", "views per post", "sign-ups per 1k views"])
    s = pd.concat(out, ignore_index=True)
    v = s["views"].replace(0, np.nan)
    s["engagement rate"] = (s["interactions"] / v).round(4)
    s["views per post"] = (s["views"] / s["posts"]).round(0)
    s["sign-ups per 1k views"] = (s["signed_up"] / v * 1000).round(2)
    return s


def by_piece(p: pd.DataFrame) -> pd.DataFrame:
    """The same piece side by side on each platform."""
    q = p.dropna(subset=["piece"])
    if q.empty:
        return pd.DataFrame(columns=["piece"])
    q = q.assign(piece=q["piece"].astype(int), eng=(q["interactions"] / q["views"].replace(0, np.nan)).round(4))
    info = q.groupby("piece").agg(**{"hook / angle": ("hook / angle", "first"), "format": ("format (image/carousel/video)", "first"),
                                     "game featured": ("game featured", "first"), "first posted": ("date", "min")})
    wide = q.pivot_table(index="piece", columns="platform", values=["views", "eng", "signed_up"], aggfunc="sum")
    wide.columns = [f"{plat} {dict(eng='engagement', views='views', signed_up='sign-ups')[m]}" for m, plat in wide.columns]
    wide = wide[sorted(wide.columns, key=lambda c: (c.split(" ")[0], c))]
    tot = q.groupby("piece").agg(**{"total views": ("views", "sum"), "total sign-ups": ("signed_up", "sum")})
    return info.join(wide).join(tot).reset_index().sort_values("total views", ascending=False)


def found_via(ev: pd.DataFrame) -> pd.DataFrame:
    f = ev[ev["name"] == "found_via"]
    if f.empty or "found" not in f:
        return pd.DataFrame(columns=["week", "total"])
    t = f.pivot_table(index="week", columns="found", values="user", aggfunc="nunique", fill_value=0)
    t["total"] = t.sum(axis=1)
    return t.reset_index().rename_axis(None, axis=1)


# ---------- Writing the Posts sheet with formulas ----------

def write_posts(ws, posts: pd.DataFrame, extra_rows: int = 300) -> None:
    """Your columns as typed, then formulas: numbers from Social raw, people from By ref."""
    from openpyxl.utils import get_column_letter as L
    cols = list(posts.columns)
    for j, c in enumerate(cols + COMPUTED, 1):
        ws.cell(1, j, c)
    for i, row in enumerate(posts.itertuples(index=False), 2):
        for j, v in enumerate(row, 1):
            ws.cell(i, j, None if (v is None or (isinstance(v, float) and np.isnan(v))) else v)
    first = len(cols) + 1
    col = {name: L(first + k) for k, name in enumerate(COMPUTED)}
    raw_col = {m: L(5 + k) for k, m in enumerate(METRICS)}  # Social raw: E..I, ref in J
    for r in range(2, len(posts) + 2 + extra_rows):
        a = f"$A{r}"
        for m in METRICS:
            ws[f"{col[m]}{r}"] = f"=IF({a}=\"\",\"\",SUMIFS('Social raw'!{raw_col[m]}:{raw_col[m]},'Social raw'!J:J,{a}))"
        v = f"{col['views']}{r}"
        ws[f"{col['engagement rate']}{r}"] = f"=IF(N({v})>0,({col['likes']}{r}+{col['comments']}{r}+{col['shares']}{r})/{v},\"\")"
        ws[f"{col['engagement rate']}{r}"].number_format = "0.0%"
        for k, name in enumerate(FROM_REF, 2):
            ws[f"{col[name]}{r}"] = f"=IF({a}=\"\",\"\",IFERROR(VLOOKUP({a},'By ref'!A:F,{k},FALSE),0))"
        ws[f"{col['sign-ups per 1k views']}{r}"] = f"=IF(N({v})>0,{col['signed_up']}{r}/{v}*1000,\"\")"
        ws[f"{col['sign-ups per 1k views']}{r}"].number_format = "0.00"


# ---------- Demo ----------

def demo(days: int = 14, seed: int = 11) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Made-up posts (3 pieces a day on all 4 platforms) and matching platform exports."""
    rng = np.random.default_rng(seed)
    hooks = ["POV: date night", "Would you answer this?", "Couples try this", "Rate this dare", "Friends night chaos", "Misfortune wheel"]
    games = {"Misfortune wheel": "Wheel of Misfortune", "Friends night chaos": "Spin the Wheel"}
    fmts = ["image", "carousel", "video"]
    reach = {"TikTok": 900, "Instagram": 400, "Facebook": 250, "YouTube": 500}
    start = pd.Timestamp.now().normalize() - pd.Timedelta(days=days)
    posts, raw, n = [], [], 0
    for d in range(days):
        for slot, t in enumerate(["12:00", "18:00", "21:00"]):
            n += 1
            hook, fmt = hooks[rng.integers(len(hooks))], fmts[rng.integers(3)]
            appeal = rng.lognormal(0, 0.6) * (1.5 if fmt == "video" else 1) * (1.3 if slot == 2 else 1)
            for pre, plat in PLATFORMS.items():
                if fmt == "carousel" and plat == "YouTube":
                    continue  # still a test feature on YouTube
                ref = f"{pre}-{n}"
                via = "studio" if plat in ("TikTok", "Instagram") else str(rng.choice(["api", "claude"]))
                when = start + pd.Timedelta(days=d) + pd.Timedelta(t + ":00") + pd.Timedelta(minutes=int(rng.integers(0, 9)))
                posts.append({"ref": ref, "piece": n, "platform": plat, "posted via (studio/api/claude)": via, "date": when.date(),
                              "time (24h)": t, "format (image/carousel/video)": fmt, "hook / angle": hook,
                              "game featured": games.get(hook, "Truth or Dare"), "url": f"https://example.com/{plat.lower()}/{ref}", "notes": None})
                views = int(reach[plat] * appeal * rng.uniform(0.6, 1.6))
                likes = int(views * rng.uniform(0.03, 0.09))
                caption = f"{hook} 🔥 play free at midnightvibes.online/{pre[0]}/{n}" if rng.random() < 0.7 else f"{hook} 🔥 link in bio"
                raw.append({"platform": plat, "posted_at": when, "caption": caption,
                            "url": f"https://example.com/{plat.lower()}/{ref}" if rng.random() < 0.5 else None,
                            "views": views, "likes": likes, "comments": int(likes * rng.uniform(0.05, 0.2)),
                            "shares": int(likes * rng.uniform(0.05, 0.3)), "saves": int(likes * rng.uniform(0.1, 0.4)), "file": f"demo-{plat.lower()}.csv"})
    return pd.DataFrame(posts), pd.DataFrame(raw)
