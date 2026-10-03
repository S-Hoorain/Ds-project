"""Build a table of State Bank of Pakistan (SBP) monetary policy decisions.

Why: H1 includes calendar events such as Monetary Policy Committee (MPC) meetings,
and no ready-made dataset of MPC dates and decisions exists. The SBP website was
redesigned and its old statement archive (sbp.org.pk/m_policy/YYYY/MPS-Mon-YYYY-Eng.pdf)
now returns an HTML page instead of the PDFs. We therefore list the statements via
the Wayback Machine CDX index and download the archived copies.

Each statement's first page gives the date and the decision, e.g.
  "...the Monetary Policy Committee (MPC) decided to maintain the policy rate at 22 percent".

Run:  python src/scraping/sbp_mps.py
Output: data/raw/sbp_mps/*.pdf (gitignored) and data/external/sbp_mpc_decisions.csv
Decisions newer than the archive's coverage are added by hand in
data/external/sbp_mpc_decisions_manual.csv (with their press-release URL as source).
"""

import re
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import pdfplumber
import requests

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw" / "sbp_mps"
OUT = ROOT / "data" / "external" / "sbp_mpc_decisions.csv"
MANUAL = ROOT / "data" / "external" / "sbp_mpc_decisions_manual.csv"
CDX = "https://web.archive.org/cdx/search/cdx"
HEADERS = {"User-Agent": "Mozilla/5.0 (academic research; DS4SG course project)"}
FIRST_YEAR = 2018  # one year before the SPI sample starts (Sep 2019), for lag features

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
DATE_RE = re.compile(rf"({MONTHS})\s+(\d{{1,2}}),?\s+(20\d\d)", re.I)
DATE_RE_DMY = re.compile(rf"(\d{{1,2}})(?:st|nd|rd|th)?\s+({MONTHS}),?\s+(20\d\d)", re.I)
DECISION_RE = re.compile(
    r"(rais|increas|hik|cut|reduc|lower|maintain|keep|kept|leav|left)\w*"
    r"(?:\s+\w+){0,3}?\s+(?:the\s+)?policy\s+rate"
    r"(?:\s+(?:by|of)\s+(\d+)\s*(?:bps|basis\s+points))?"
    r"(?:\s+\w+){0,6}?\s+(?:to|at)\s+(\d+(?:\.\d+)?)\s*(?:percent|%)",
    re.I | re.S)


def list_statements():
    params = {"url": "sbp.org.pk/m_policy/*", "collapse": "urlkey",
              "fl": "timestamp,original", "filter": "statuscode:200"}
    text = requests.get(CDX, params=params, headers=HEADERS, timeout=180).text
    rows = []
    for line in text.splitlines():
        ts, url = line.split(" ", 1)
        name = url.rsplit("/", 1)[-1].split("?")[0]
        m = re.match(r"MPS-([A-Za-z]+)-(?:[\d-]+-)?(20\d\d)-Eng(?:-\d)?\.pdf$", name, re.I)
        if m and int(m.group(2)) >= FIRST_YEAR:
            rows.append({"name": name, "ts": ts, "url": url})
    df = pd.DataFrame(rows).drop_duplicates("name")
    return df.sort_values("name").to_dict("records")


def parse_statement(path):
    with pdfplumber.open(path) as pdf:
        text = " ".join((p.extract_text() or "") for p in pdf.pages[:2])
    text = re.sub(r"\s+", " ", text)
    date = None
    for rx, order in ((DATE_RE, "mdy"), (DATE_RE_DMY, "dmy")):
        m = rx.search(text[:1500])
        if m:
            g = m.groups()
            mon, day, yr = (g[0], g[1], g[2]) if order == "mdy" else (g[1], g[0], g[2])
            date = datetime.strptime(f"{mon} {day} {yr}", "%B %d %Y").date()
            break
    m = DECISION_RE.search(text)
    if not m:
        return date, None, None, None, text[:300]
    verb = m.group(1).lower()
    action = ("hike" if verb.startswith(("rais", "increas", "hik"))
              else "cut" if verb.startswith(("cut", "reduc", "lower")) else "hold")
    bps = int(m.group(2)) if m.group(2) else (0 if action == "hold" else None)
    return date, action, bps, float(m.group(3)), m.group(0)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    rows = []
    for st in list_statements():
        dest = RAW / st["name"]
        if not dest.exists():
            try:
                r = requests.get(f"https://web.archive.org/web/{st['ts']}id_/{st['url']}",
                                 headers=HEADERS, timeout=120)
            except requests.RequestException as exc:
                print(f"  failed: {st['name']} ({type(exc).__name__}); re-run later")
                time.sleep(30)
                continue
            time.sleep(5)
            if r.status_code != 200 or not r.content.startswith(b"%PDF"):
                print(f"  failed: {st['name']} (HTTP {r.status_code})")
                continue
            dest.write_bytes(r.content)
        date, action, bps, rate, evidence = parse_statement(dest)
        rows.append({"decision_date": date, "action": action, "change_bps": bps,
                     "policy_rate": rate, "source": st["url"], "evidence": evidence})
        print(f"{st['name']:32s} {date} {action} {bps} -> {rate}")
    df = pd.DataFrame(rows)
    if MANUAL.exists():
        df = pd.concat([df, pd.read_csv(MANUAL)], ignore_index=True)
    df["decision_date"] = pd.to_datetime(df["decision_date"])
    df = df.sort_values("decision_date").drop_duplicates("decision_date", keep="last")
    # Fill in change_bps from consecutive rates where the text did not state it.
    implied = (df["policy_rate"].diff() * 100).round()
    df["change_bps"] = df["change_bps"].fillna(implied)
    df.to_csv(OUT, index=False)
    print(f"\n{len(df)} decisions -> {OUT.relative_to(ROOT)}; "
          f"unparsed: {df['policy_rate'].isna().sum()}")


if __name__ == "__main__":
    main()
