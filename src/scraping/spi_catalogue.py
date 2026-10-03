"""Build a catalogue of every weekly SPI file PBS has published.

PBS has no single historical file for the weekly Sensitive Price Indicator (SPI).
The weekly reports are scattered across two places:

1. The *live* PBS website (https://www.pbs.gov.pk/price-statistics/). The page
   embeds a JavaScript array listing each week's files. Coverage is Jul 2023 to now,
   with Excel files only from late Oct 2025; older weeks are PDF only.
2. PBS's *old* website, which the Internet Archive (Wayback Machine) preserved.
   Two folders matter:
     - weekly_spi_nb/  "new base" (2015-16=100) reports, Sep 2019 to early 2022
     - weekly_spi/     all reports 2013-2025; base 2007-08 until Aug 2019, then 2015-16
   We list these through the Wayback CDX API (a searchable index of archived URLs).

This module produces one row per (file, source) with the week date taken from the
catalogue or filename, the file "kind" (summary report vs. city-level annex) and
the URL to fetch it from. Choosing which file to use for each week is left to
spi_download.py.

Run:  python src/scraping/spi_catalogue.py
Output: data/raw/spi_weekly/catalogue.csv
"""

import re
import urllib.parse
from datetime import date, datetime
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "raw" / "spi_weekly"

LIVE_PAGE = "https://www.pbs.gov.pk/price-statistics/"
LIVE_BASE = "https://www.pbs.gov.pk/"
CDX_API = "https://web.archive.org/cdx/search/cdx"
WAYBACK_FOLDERS = {
    "weekly_spi_nb": "pbs.gov.pk/sites/default/files/price_statistics/weekly_spi_nb/*",
    "weekly_spi": "pbs.gov.pk/sites/default/files/price_statistics/weekly_spi/*",
}
HEADERS = {"User-Agent": "Mozilla/5.0 (academic research; DS4SG course project)"}


# --------------------------------------------------------------------------- helpers

def kind_from_name(filename):
    """Classify a file by its name. We do not trust the catalogue's own labels:
    on the live page the 2023 entries have 'annexure' and 'report' swapped."""
    n = urllib.parse.unquote(filename).lower()
    if any(k in n for k in ("annex", "uscp", "appendix")):
        return "annex"  # city-wise prices (Appendix A) + USC prices
    if any(k in n for k in ("summ", "sumar", "report", "exec")):
        return "summary"  # quintile index table + 51-item national prices
    return "other"


# Filenames use many date styles: 05092019, 050919, 05.09.2019, 05-09-19, "05 09 2019".
# Patterns are tried in order, so 4-digit years win over 2-digit ones.
_DATE_PATTERNS = [
    r"(\d{1,2})[.\-_ ]+(\d{1,2})[.\-_ ]+(\d{4})",
    r"(?<!\d)(\d{2})(\d{2})(\d{4})(?!\d)",
    r"(\d{1,2})[.\-_ ]+(\d{1,2})[.\-_ ]+(\d{2})(?!\d)",
    r"(?<!\d)(\d{2})(\d{2})(\d{2})(?!\d)",
]


def _valid(y, mo, d):
    try:
        parsed = date(y, mo, d)
    except ValueError:
        return None
    return parsed if date(2010, 1, 1) <= parsed <= date.today() else None


def _truncated_year(y):
    """Repair the year in mistyped filenames: "202" -> 2020 (last digit dropped),
    "021" -> 2021 (the "2" dropped), "20200" -> 2020 (extra digit)."""
    if len(y) >= 4 and y.startswith("20"):
        return int(y[:4])
    if y == "202":
        return 2020
    if len(y) == 3 and y.startswith("0"):
        return 2000 + int(y[1:])
    return None


def date_from_name(filename):
    """Pull a day-month-year date out of a filename; None if nothing plausible."""
    n = urllib.parse.unquote(filename)
    for pat in _DATE_PATTERNS:
        for m in re.finditer(pat, n):
            d, mo, y = (int(g) for g in m.groups())
            parsed = _valid(y + 2000 if y < 100 else y, mo, d)
            if parsed:
                return parsed
    # Fallback for mistyped names seen in the archive, e.g. spi_report_0204202,
    # spi_report_0909021, SPI_report_170920200, SPI_..._08.122022.
    for m in re.finditer(r"(?<!\d)(\d{2})[.\-_ ]?(\d{2})(\d{3,5})(?!\d)", n):
        d, mo, y = int(m.group(1)), int(m.group(2)), _truncated_year(m.group(3))
        parsed = _valid(y, mo, d) if y else None
        if parsed:
            return parsed
    return None


def file_ext(url):
    return urllib.parse.urlparse(url).path.rsplit(".", 1)[-1].lower()


# --------------------------------------------------------------------------- sources

def live_catalogue(session):
    """Parse the JavaScript `data = [...]` array embedded in the live price page."""
    html = session.get(LIVE_PAGE, headers=HEADERS, timeout=60).text
    start = html.find("const data = [")
    end = html.find("];", start)
    if start == -1 or end == -1:
        raise RuntimeError("Could not find the SPI data array on the live PBS page; "
                           "the page layout may have changed.")
    rows = []
    for block in re.findall(r"\{(.*?)\}", html[start:end], flags=re.S):
        fields = dict(re.findall(r'(\w+)\s*:\s*"([^"]*)"', block))
        if "date" not in fields:
            continue
        week = datetime.strptime(fields["date"].strip(), "%d-%m-%Y").date()
        for key in ("report", "annexure", "reportExcel", "annexureExcel"):
            path = fields.get(key, "").strip()
            if not path:
                continue
            url = path if path.startswith("http") else LIVE_BASE + path
            name = url.rsplit("/", 1)[-1]
            rows.append({
                "week_date": week,
                "kind": kind_from_name(name),
                "ext": file_ext(url),
                "source": "pbs_live",
                "folder": "live",
                "url": url,
                "fetch_url": url,
                "wayback_ts": None,
            })
    return rows


def wayback_catalogue(session):
    """List archived files in the old site's SPI folders via the Wayback CDX API.
    collapse=urlkey keeps one capture per distinct URL; only HTTP 200 captures."""
    rows = []
    for folder, pattern in WAYBACK_FOLDERS.items():
        params = {
            "url": pattern,
            "collapse": "urlkey",
            "fl": "timestamp,original,mimetype",
            "filter": "statuscode:200",
        }
        resp = session.get(CDX_API, params=params, headers=HEADERS, timeout=180)
        resp.raise_for_status()
        for line in resp.text.splitlines():
            parts = line.split(" ")
            if len(parts) < 3:
                continue
            ts, original, _mime = parts[0], parts[1], parts[2]
            name = original.rsplit("/", 1)[-1]
            week = date_from_name(name)
            rows.append({
                "week_date": week,
                "kind": kind_from_name(name),
                "ext": file_ext(original),
                "source": "wayback",
                "folder": folder,
                "url": original,
                # "id_" asks the Wayback Machine for the original bytes, unmodified.
                "fetch_url": f"https://web.archive.org/web/{ts}id_/{original}",
                "wayback_ts": ts,
            })
    return rows


def build_catalogue():
    session = requests.Session()
    rows = live_catalogue(session) + wayback_catalogue(session)
    cat = pd.DataFrame(rows)
    cat["week_date"] = pd.to_datetime(cat["week_date"])
    cat = cat.sort_values(["week_date", "kind", "source", "folder"]).reset_index(drop=True)
    return cat


if __name__ == "__main__":
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cat = build_catalogue()
    out = OUT_DIR / "catalogue.csv"
    cat.to_csv(out, index=False)
    undated = cat["week_date"].isna().sum()
    print(f"Catalogue: {len(cat)} files -> {out.relative_to(ROOT)}")
    print(f"  undated (filename had no parseable date): {undated}")
    print(cat.groupby(["source", "kind"]).size().to_string())
