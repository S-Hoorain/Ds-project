"""Parse downloaded weekly SPI reports into two tidy tables.

Input:  files listed as status=ok in data/raw/spi_weekly/manifest.csv
Output: data/interim/spi_quintile_weekly.csv   1 row = 1 week x 1 group (Q1-Q5, Combined)
        data/interim/spi_items_weekly.csv      1 row = 1 week x 1 item (51 items)
        data/interim/spi_parse_log.csv         one row per file: what parsed, what didn't

What each report contains (both PDF and Excel formats):
  * Quintile table: SPI level for the current week, the previous week and the same
    week last year, for Q1-Q5 and Combined, plus % changes.
  * Item table: national average price of each of the 51 items for the same three
    weeks, % changes, basket weights (lowest quintile, combined) and impacts.

Why the PDF parsing is done in two different ways:
  * Quintile table: PBS stores the row labels and each number column as separate text
    blocks, and rows are sometimes vertically misaligned (e.g. 2024). So we gather the
    decimal numbers in the table region, group them into columns by x-position, and
    read each column top-to-bottom as Q1..Q5, Combined.
  * Item table: each item row is one text run. Reading words in the PDF's own text
    order ("text flow") keeps long item names intact. Plain layout extraction lets them
    overlap the next column, e.g. "...(SN)E, a5cLhitre Tin1139.33".

The parser records whatever it reads and flags problems. It does not fix values;
that happens in the cleaning step, where every decision is documented.

Run:  python src/cleaning/parse_spi.py
"""

import difflib
import re
from pathlib import Path

import openpyxl
import pandas as pd
import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "data" / "raw" / "spi_weekly" / "manifest.csv"
ITEMS = ROOT / "data" / "external" / "spi_items.csv"
OUT = ROOT / "data" / "interim"

GROUPS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Combined"]
NUM = re.compile(r"^-?\d+\.\d+$")
WEEK_RE = re.compile(r"week\s*ended\s*on\s*(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})", re.I)
# Units seen in the item table; longest first so "Per Plate" wins over "Per".
UNITS = ["Per Minute", "Per Plate", "Per Litre", "Per Unit", "Per Cup", "Per Pair",
         "1 Dozen", "1 mtr", "1 Ltr", "20 Kg", "40 Kg", "1 Kg", "MMBTU", "Each", "Pair"]
# \s* (not \s+) before the unit: some PDFs glue it to the name, e.g. "1 kg PouchEach".
UNIT_RE = re.compile(r"^(\d{1,2})\s+(.+?)\s*(" +"|".join(re.escape(u) for u in UNITS) + r")$",
                     re.I)


# --------------------------------------------------------------------------- items

def _norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


# Items whose official name changed over time. Older reports say
# "Electricity Charges upto 50 Units" / "Gas Charges upto 3.3719 MMBTU"; newer ones
# say "... for Q1". The definition may have changed with the name, so the cleaning
# step must check these two series for level breaks.
PREFIX_ALIASES = {"electricitycharges": "electricity_q1", "gascharges": "gas_q1"}


class ItemMatcher:
    """Map raw item names (which vary slightly across years) to canonical item_ids."""

    def __init__(self, items):
        self.by_norm = {_norm(n): i for n, i in zip(items["item_name"], items["item_id"])}
        self.keys = list(self.by_norm)

    def match(self, raw):
        key = _norm(raw)
        if key in self.by_norm:
            return self.by_norm[key], 1.0
        for prefix, item_id in PREFIX_ALIASES.items():
            if key.startswith(prefix):
                return item_id, 1.0
        best = difflib.get_close_matches(key, self.keys, n=1, cutoff=0.0)
        if not best:
            return None, 0.0
        score = difflib.SequenceMatcher(None, key, best[0]).ratio()
        return self.by_norm[best[0]], round(score, 3)


# --------------------------------------------------------------------------- PDF

def _flow_lines(page):
    """Words in PDF text order, grouped into lines by vertical position."""
    words = page.extract_words(use_text_flow=True, x_tolerance=1.5)
    lines, cur, last = [], [], None
    for w in words:
        if last is not None and abs(w["top"] - last) > 3:
            lines.append(" ".join(cur))
            cur = []
        cur.append(w["text"])
        last = w["top"]
    if cur:
        lines.append(" ".join(cur))
    return lines


def _week_date(text):
    m = WEEK_RE.search(text)
    if not m:
        return None
    d, mo, y = (int(g) for g in m.groups())
    y = y + 2000 if y < 100 else y
    try:
        return pd.Timestamp(year=y, month=mo, day=d)
    except ValueError:
        return None


def _quintile_table_pdf(page):
    """Return {group: [cur, prev, year_ago, pct_wow, pct_yoy]} or None.

    The table region runs from the "Q1 (" label down to the "3." trend section."""
    words = page.extract_words(x_tolerance=1.5)
    q1 = [w for w in words if w["text"] == "Q1"]
    if not q1:
        return None
    top = min(w["top"] for w in q1) - 4
    # The next section starts with "3." near the left margin, below Q1.
    nxt = [w for w in words if w["text"] in ("3.", "3") and w["top"] > top + 20 and w["x0"] < 80]
    bottom = min((w["top"] for w in nxt), default=top + 140)
    nums = [w for w in words if top <= w["top"] < bottom and NUM.match(w["text"])]
    if len(nums) < 30:
        return None
    # Cluster numbers into columns by right edge (numbers are right-aligned).
    nums.sort(key=lambda w: w["x1"])
    cols, cur = [], [nums[0]]
    for w in nums[1:]:
        if w["x1"] - cur[-1]["x1"] > 12:
            cols.append(cur)
            cur = []
        cur.append(w)
    cols.append(cur)
    cols = [sorted(c, key=lambda w: w["top"]) for c in cols if len(c) == 6]
    if len(cols) < 3:
        return None
    cols = cols[:5]
    table = {}
    for i, g in enumerate(GROUPS):
        vals = [float(c[i]["text"]) for c in cols]
        table[g] = vals + [None] * (5 - len(vals))
    return table


def _item_rows_from_lines(lines):
    """Item rows end with 9 numbers: price cur/prev/yago, pct wow/yoy, weight q1/comb,
    impact q1/comb. Return list of dicts with the raw name."""
    rows = []
    for line in lines:
        toks = line.split()
        if len(toks) < 12:
            continue
        tail = toks[-9:]
        if not all(NUM.match(t) for t in tail):
            continue
        m = UNIT_RE.match(" ".join(toks[:-9]))
        if not m:
            continue
        vals = [float(t) for t in tail]
        rows.append({"item_name_raw": m.group(2).strip(), "unit": m.group(3),
                     "price": vals[0], "price_prev_week": vals[1], "price_year_ago": vals[2],
                     "pct_wow": vals[3], "pct_yoy": vals[4],
                     "weight_q1": vals[5], "weight_combined": vals[6]})
    return rows


def _base(text):
    t = text.replace(" ", "")
    return "2015-16" if "2015-16=100" in t else "2007-08" if "2007-08=100" in t else None


def parse_pdf(path):
    with pdfplumber.open(path) as pdf:
        week, quint, items, base = None, None, [], None
        for page in pdf.pages:
            text = page.extract_text() or ""
            base = base or _base(text)
            if week is None and "Sensitive Price Indicator" in text:
                week = _week_date(text)
            if quint is None and "Q1" in text and "Combined" in text:
                quint = _quintile_table_pdf(page)
            items.extend(_item_rows_from_lines(_flow_lines(page)))
    return week, quint, items, base


# --------------------------------------------------------------------------- Excel

def parse_xlsx(path):
    wb = openpyxl.load_workbook(path, data_only=True)
    week, quint, items, base = None, {}, [], None
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            vals = [v for v in row if v is not None]
            if not vals:
                continue
            first = str(vals[0]).strip()
            base = base or _base(first)
            if week is None and isinstance(vals[0], str):
                week = _week_date(first)
            label = first.split()[0] if first else ""
            nums = [v for v in vals[1:] if isinstance(v, (int, float))]
            if label in GROUPS and len(nums) >= 5 and label not in quint:
                quint[label] = [float(x) for x in nums[:5]]
            if (len(vals) >= 10 and isinstance(vals[0], (int, float))
                    and isinstance(vals[1], str) and isinstance(vals[2], str)):
                n = [float(x) for x in vals[3:10]]
                items.append({"item_name_raw": vals[1].strip(), "unit": vals[2].strip(),
                              "price": n[0], "price_prev_week": n[1], "price_year_ago": n[2],
                              "pct_wow": n[3], "pct_yoy": n[4],
                              "weight_q1": n[5], "weight_combined": n[6]})
    return week, (quint if len(quint) == 6 else None), items, base


# --------------------------------------------------------------------------- driver

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    man = pd.read_csv(MANIFEST, dtype=str)
    man = man[man["status"] == "ok"].drop_duplicates(["week_date", "kind"], keep="last")
    man = man[man["kind"] == "summary"].sort_values("week_date")
    matcher = ItemMatcher(pd.read_csv(ITEMS))

    q_rows, i_rows, log = [], [], []
    for _, f in man.iterrows():
        path = ROOT / f["local_path"]
        try:
            week, quint, items, base = (parse_xlsx if path.suffix == ".xlsx"
                                        else parse_pdf)(path)
            err = ""
        except Exception as exc:
            week, quint, items, base = None, None, [], None
            err = f"{type(exc).__name__}: {exc}"
        week = week if week is not None else pd.Timestamp(f["week_date"])
        if quint:
            for g in GROUPS:
                cur, prev, yago, p_wow, p_yoy = quint[g]
                q_rows.append({"week_end": week, "group": g, "spi": cur,
                               "spi_prev_week": prev, "spi_year_ago": yago,
                               "pct_wow_reported": p_wow, "pct_yoy_reported": p_yoy,
                               "source_file": f["local_path"]})
        for it in items:
            iid, score = matcher.match(it["item_name_raw"])
            i_rows.append({"week_end": week, "item_id": iid, "match_score": score,
                           **it, "source_file": f["local_path"]})
        log.append({"catalogue_week": f["week_date"], "parsed_week": week.date(),
                    "file": f["local_path"], "base": base, "quintile_ok": bool(quint),
                    "n_items": len(items), "error": err})

    pd.DataFrame(q_rows).to_csv(OUT / "spi_quintile_weekly.csv", index=False)
    pd.DataFrame(i_rows).to_csv(OUT / "spi_items_weekly.csv", index=False)
    log = pd.DataFrame(log)
    log.to_csv(OUT / "spi_parse_log.csv", index=False)
    print(f"files: {len(log)} | quintile table parsed: {log.quintile_ok.sum()} | "
          f"files with 51 items: {(log.n_items == 51).sum()}")
    print(f"base year found: {log.base.value_counts(dropna=False).to_dict()}")
    bad = log[~log.quintile_ok | (log.n_items != 51) | (log.error != "")
              | (log.base != "2015-16")]
    if len(bad):
        print(f"\n{len(bad)} file(s) need attention:")
        print(bad.to_string(index=False))


if __name__ == "__main__":
    main()
