"""Download the daily PKR per USD exchange rate (needed for H1).

Source: Yahoo Finance ticker "PKR=X", fetched via the `yfinance` package. It is free,
needs no API key and is complete for our period. It is a *market* quote, not the
official SBP weighted-average interbank rate. The official series is available from
SBP EasyData (easydata.sbp.org.pk), which needs a free API-key registration; if the
team registers, it should replace or cross-check this series.

The script also flags suspicious one-day jumps (>5%). Yahoo FX series occasionally
contain bad ticks; those days are reviewed in the cleaning step, not edited here.

Run:  python src/scraping/fx_rates.py
Output: data/raw/fx/pkr_usd_daily_yahoo.csv
"""

from datetime import date
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "raw" / "fx" / "pkr_usd_daily_yahoo.csv"
START = "2018-06-01"  # a year before the SPI sample, so lags and YoY changes exist


def main():
    raw = yf.download("PKR=X", start=START, end=str(date.today()),
                      progress=False, auto_adjust=False)
    df = pd.DataFrame({
        "date": raw.index,
        "pkr_per_usd": raw["Close"].squeeze().values,
        "high": raw["High"].squeeze().values,
        "low": raw["Low"].squeeze().values,
    })
    df["pct_change_1d"] = df["pkr_per_usd"].pct_change() * 100
    df["flag_jump_gt5pct"] = df["pct_change_1d"].abs() > 5
    OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT, index=False, date_format="%Y-%m-%d")
    print(f"{len(df)} trading days {df.date.min().date()} to {df.date.max().date()} "
          f"-> {OUT.relative_to(ROOT)}")
    jumps = df[df.flag_jump_gt5pct]
    print(f"suspicious one-day jumps (>5%): {len(jumps)}")
    if len(jumps):
        print(jumps[["date", "pkr_per_usd", "pct_change_1d"]].to_string(index=False))


if __name__ == "__main__":
    main()
