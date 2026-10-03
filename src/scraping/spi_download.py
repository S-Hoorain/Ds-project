"""Download one weekly SPI report per week, politely and resumably.

Reads data/raw/spi_weekly/catalogue.csv (built by spi_catalogue.py). For each week
it ranks the candidate files and downloads the best one:

    1. live PBS Excel (.xlsx)    exact numbers, no PDF parsing needed
    2. live PBS PDF
    3. Wayback weekly_spi_nb/    the "new base" folder
    4. Wayback weekly_spi/

Within the Wayback sources, filenames containing "nb" (new base) are preferred. In
Sep 2019 PBS published both the old (2007-08) and new (2015-16) base reports.

Every downloaded PDF is checked for the text "2015-16=100". A file on the old base
is marked `base_mismatch` and the next candidate is tried.

Each attempt is logged to data/raw/spi_weekly/manifest.csv (source URL, local path,
size, SHA-256 checksum, base check, timestamp). This is the collection audit trail
that Milestone 2 asks for.

Run:  python src/scraping/spi_download.py                 # summaries from 2019-09-05
      python src/scraping/spi_download.py --kinds summary annex --start 2023-01-01
      python src/scraping/spi_download.py --limit 5         # quick test
Re-running skips weeks already downloaded successfully.
"""

import argparse
import hashlib
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "raw" / "spi_weekly"
CATALOGUE = RAW_DIR / "catalogue.csv"
MANIFEST = RAW_DIR / "manifest.csv"
HEADERS = {"User-Agent": "Mozilla/5.0 (academic research; DS4SG course project)"}

# Seconds to wait between requests. The Internet Archive throttles bursts, so we
# go slowly there; PBS is a government server, so we're gentle with it too.
DELAY = {"wayback": 4.0, "pbs_live": 1.0}
MAX_RETRIES = 4
# Stop the run if this many weeks in a row fail: the server is probably blocking us,
# and hammering it extends the block. Re-run later; finished weeks are skipped.
MAX_CONSECUTIVE_FAILS = 3
# Real files start with these bytes; anything else (e.g. an HTML error page) is rejected.
SIGNATURES = {"pdf": b"%PDF", "xlsx": b"PK", "xls": bytes([0xD0, 0xCF])}

MANIFEST_COLS = ["week_date", "kind", "source", "folder", "url", "fetch_url",
                 "local_path", "status", "bytes", "sha256", "base_check",
                 "downloaded_at", "note"]


def rank(row):
    """Lower = better. See module docstring for the order."""
    name = row["url"].rsplit("/", 1)[-1].lower()
    if row["source"] == "pbs_live":
        return 0 if row["ext"] in ("xlsx", "xls") else 1
    folder_rank = 2 if row["folder"] == "weekly_spi_nb" else 3
    nb_bonus = -0.5 if "nb" in name else 0
    return folder_rank + nb_bonus


def check_base(path):
    """Return '2015-16', '2007-08', or 'unknown' from the first pages of a PDF.
    From Mar 2020 an executive summary comes first and the base-year line is on
    page 2, so we scan up to three pages.
    Excel files only exist for late 2025 onward (all 2015-16 base), so we skip them."""
    if path.suffix.lower() != ".pdf":
        return "not_checked"
    try:
        with pdfplumber.open(path) as pdf:
            text = "".join((p.extract_text() or "") for p in pdf.pages[:3]).replace(" ", "")
    except Exception as exc:  # corrupt or non-PDF bytes (e.g. an HTML error page)
        return f"unreadable: {type(exc).__name__}"
    if "2015-16=100" in text:
        return "2015-16"
    if "2007-08=100" in text:
        return "2007-08"
    return "unknown"


def fetch(session, url, source):
    """GET with retries and exponential backoff on throttling or server errors."""
    for attempt in range(MAX_RETRIES):
        try:
            resp = session.get(url, headers=HEADERS, timeout=120)
            if resp.status_code == 200:
                return resp.content, None
            if resp.status_code in (429, 500, 502, 503, 504):
                wait = DELAY[source] * (2 ** (attempt + 2))
                print(f"    HTTP {resp.status_code}; retrying in {wait:.0f}s")
                time.sleep(wait)
                continue
            return None, f"HTTP {resp.status_code}"
        except requests.RequestException as exc:
            wait = DELAY[source] * (2 ** (attempt + 2))
            print(f"    {type(exc).__name__}; retrying in {wait:.0f}s")
            time.sleep(wait)
    return None, "gave up after retries"


def load_manifest():
    if MANIFEST.exists():
        return pd.read_csv(MANIFEST, dtype=str)
    return pd.DataFrame(columns=MANIFEST_COLS)


def append_manifest(record):
    """Append one row immediately, so progress survives an interrupted run."""
    pd.DataFrame([record], columns=MANIFEST_COLS).to_csv(
        MANIFEST, mode="a", header=not MANIFEST.exists(), index=False)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--start", default="2019-09-05", help="first week (YYYY-MM-DD)")
    ap.add_argument("--end", default=None, help="last week (YYYY-MM-DD)")
    ap.add_argument("--kinds", nargs="+", default=["summary"], choices=["summary", "annex"])
    ap.add_argument("--limit", type=int, default=None, help="max weeks (for testing)")
    args = ap.parse_args()

    cat = pd.read_csv(CATALOGUE, parse_dates=["week_date"])
    cat = cat.dropna(subset=["week_date"])
    cat = cat[cat["kind"].isin(args.kinds) & (cat["week_date"] >= args.start)]
    if args.end:
        cat = cat[cat["week_date"] <= args.end]
    cat = cat.assign(rank=cat.apply(rank, axis=1))

    manifest = load_manifest()
    done = set(zip(manifest.loc[manifest["status"] == "ok", "week_date"],
                   manifest.loc[manifest["status"] == "ok", "kind"]))

    groups = list(cat.groupby(["week_date", "kind"]))
    if args.limit:
        groups = groups[:args.limit]
    session = requests.Session()
    n_ok = n_skip = n_fail = streak = 0

    for (week, kind), cands in groups:
        wk = week.strftime("%Y-%m-%d")
        if (wk, kind) in done:
            n_skip += 1
            continue
        print(f"{wk} {kind}: {len(cands)} candidate(s)")
        success = False
        for _, row in cands.sort_values("rank").iterrows():
            dest_dir = RAW_DIR / row["source"] / kind
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / f"{wk}_{kind}_{row['folder']}.{row['ext']}"
            content, err = fetch(session, row["fetch_url"], row["source"])
            time.sleep(DELAY[row["source"]])
            record = {"week_date": wk, "kind": kind, "source": row["source"],
                      "folder": row["folder"], "url": row["url"],
                      "fetch_url": row["fetch_url"],
                      "downloaded_at": datetime.now().isoformat(timespec="seconds")}
            if content is None:
                append_manifest({**record, "status": "failed", "note": err})
                continue
            if not content.startswith(SIGNATURES.get(row["ext"], b"")):
                append_manifest({**record, "status": "failed",
                                 "note": f"not a real .{row['ext']} file"})
                continue
            dest.write_bytes(content)
            base = check_base(dest)
            status = "base_mismatch" if base in ("2007-08",) else "ok"
            append_manifest({**record,
                             "local_path": dest.relative_to(ROOT).as_posix(),
                             "status": status, "bytes": len(content),
                             "sha256": hashlib.sha256(content).hexdigest(),
                             "base_check": base, "note": ""})
            if status == "ok":
                print(f"    ok  {dest.relative_to(ROOT).as_posix()}  (base {base})")
                success = True
                break
            print(f"    old base ({base}); trying next candidate")
            dest.unlink()  # don't keep old-base files in the new-base folder
        if success:
            n_ok += 1
            streak = 0
        else:
            n_fail += 1
            streak += 1
            print("    !! no usable file for this week")
            if streak >= MAX_CONSECUTIVE_FAILS:
                print(f"\n{streak} weeks failed in a row; the server may be blocking us. "
                      "Stopping. Re-run later to resume.")
                break

    print(f"\nDone. downloaded={n_ok} skipped(already had)={n_skip} failed={n_fail}")


if __name__ == "__main__":
    main()
