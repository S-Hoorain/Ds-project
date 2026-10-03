"""Build the master analytical dataset: 1 row = 1 SPI week x 1 group (Q1-Q5, Combined).

Inputs (all produced by earlier scripts):
  data/interim/spi_quintile_weekly.csv     parse_spi.py
  data/interim/spi_items_weekly.csv        parse_spi.py (petrol/diesel -> fuel revisions)
  data/raw/fx/pkr_usd_daily_yahoo.csv      fx_rates.py
  data/external/islamic_events.csv         build_event_calendar.py
  data/external/sbp_mpc_decisions.csv      sbp_mps.py (optional until scraped)
Output:
  data/processed/master_weekly_quintile.csv
  data/processed/cleaning_report.txt       counts behind every cleaning decision

Cleaning decisions (each one is reported with counts in cleaning_report.txt):
  D1  Week dates: the date printed inside each report is authoritative. A few releases
      came out on a Wednesday or Saturday (holidays), so every week is aligned to the
      nearest Thursday (`week_end`), the usual SPI week-ending day.
  D2  Missing weeks (no report published, often Eid weeks): every report states the
      *previous* week's official index, so a missing week is filled from the next
      report's `spi_prev_week`. These are official PBS values, not imputations, and are
      flagged `filled_from_next_report`. Any weeks still missing stay NaN at this stage.
  D3  Consistency: where both exist, `spi_prev_week` in week t should equal `spi` in t-1.
      Mismatches (PBS revisions or parse errors) are counted and listed.
  D4  Exchange rate: daily PKR/USD is averaged over the SPI week (Fri-Thu). Known
      bad-tick days (one-day spikes that fully reverse) are dropped before averaging.
  D5  Fuel revisions: petrol and diesel are administered prices that change in discrete
      steps, so a week whose average petrol (or diesel) price moved by more than 1% is
      flagged as a fuel-price revision week.
"""

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
INTERIM = ROOT / "data" / "interim"
EXTERNAL = ROOT / "data" / "external"
PROCESSED = ROOT / "data" / "processed"
FX = ROOT / "data" / "raw" / "fx" / "pkr_usd_daily_yahoo.csv"
GROUPS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Combined"]
FUEL_THRESHOLD_PCT = 1.0
# One-day spikes that fully reverse the next day (checked by eye; see fx_rates.py output).
FX_BAD_TICKS = ["2022-08-01", "2022-09-19"]

report = []


def log(msg):
    report.append(msg)
    print(msg)


def nearest_thursday(d):
    # weekday(): Mon=0 ... Thu=3. Shift by -3..+3 days to the closest Thursday.
    offset = (3 - d.weekday() + 3) % 7 - 3
    return d + pd.Timedelta(days=offset)


def load_spi():
    q = pd.read_csv(INTERIM / "spi_quintile_weekly.csv", parse_dates=["week_end"])
    q["week_end_reported"] = q["week_end"]
    q["week_end"] = q["week_end"].map(nearest_thursday)
    shifted = (q["week_end"] != q["week_end_reported"]).sum() // 6
    log(f"D1  reports dated off-Thursday and aligned to nearest Thursday: {shifted}")
    dups = q.duplicated(["week_end", "group"]).sum()
    if dups:
        log(f"D1  WARNING duplicate week-group rows after alignment: {dups} (keeping last)")
        q = q.drop_duplicates(["week_end", "group"], keep="last")
    return q


def complete_grid(q):
    grid = pd.date_range(q["week_end"].min(), q["week_end"].max(), freq="7D")
    full = pd.MultiIndex.from_product([grid, GROUPS], names=["week_end", "group"])
    q = q.set_index(["week_end", "group"]).reindex(full).reset_index()
    q["filled_from_next_report"] = False
    n_missing = q["spi"].isna().sum() // 6
    log(f"D2  weeks on the Thursday grid: {len(grid)}; without their own report: {n_missing}")

    # D2: fill from the following week's "previous week" column.
    q = q.sort_values(["group", "week_end"])
    nxt_prev = q.groupby("group")["spi_prev_week"].shift(-1)
    fill = q["spi"].isna() & nxt_prev.notna()
    q.loc[fill, "spi"] = nxt_prev[fill]
    q.loc[fill, "filled_from_next_report"] = True
    log(f"D2  weeks filled from next report's previous-week value: {fill.sum() // 6}; "
        f"still missing: {q['spi'].isna().sum() // 6}")

    # D3: consistency of spi_prev_week(t) with spi(t-1).
    prev_spi = q.groupby("group")["spi"].shift(1)
    both = q["spi_prev_week"].notna() & prev_spi.notna() & ~q["filled_from_next_report"]
    diff = (q.loc[both, "spi_prev_week"] - prev_spi[both]).abs()
    bad = diff > 0.011  # allow rounding to 2 decimals
    log(f"D3  week-to-week consistency checks: {both.sum()}; mismatches > 0.01: {bad.sum()}")
    if bad.any():
        cols = ["week_end", "group", "spi_prev_week"]
        mism = q.loc[both].loc[bad, cols].assign(spi_last_week=prev_spi[both][bad])
        log(mism.head(20).to_string(index=False))
    return q


def fx_weekly(weeks):
    fx = pd.read_csv(FX, parse_dates=["date"])
    fx = fx[~fx["date"].isin(pd.to_datetime(FX_BAD_TICKS))]
    log(f"D4  FX bad-tick days dropped: {len(FX_BAD_TICKS)}")
    # Assign each trading day to the SPI week (Fri..Thu) that contains it.
    fx["week_end"] = fx["date"] + pd.to_timedelta((3 - fx["date"].dt.weekday) % 7, "D")
    w = fx.groupby("week_end")["pkr_per_usd"].mean().rename("fx_pkr_usd_wavg")
    w = w.reindex(weeks)
    w.index.name = "week_end"
    return w.reset_index()


def fuel_flags():
    it = pd.read_csv(INTERIM / "spi_items_weekly.csv", parse_dates=["week_end"])
    it["week_end"] = it["week_end"].map(nearest_thursday)
    f = (it[it["item_id"].isin(["petrol", "diesel"])]
         .pivot_table(index="week_end", columns="item_id", values="pct_wow", aggfunc="last"))
    f.columns = [f"{c}_pct_wow" for c in f.columns]
    f["fuel_revision_week"] = (f.abs() > FUEL_THRESHOLD_PCT).any(axis=1)
    log(f"D5  fuel-price revision weeks (|petrol or diesel w/w change| > "
        f"{FUEL_THRESHOLD_PCT}%): {int(f['fuel_revision_week'].sum())} of {len(f)}")
    return f.reset_index()


def event_features(weeks):
    ev = pd.read_csv(EXTERNAL / "islamic_events.csv",
                     parse_dates=["date_pakistan", "date_end"])
    out = pd.DataFrame({"week_end": weeks})
    start = out["week_end"] - pd.Timedelta(days=6)
    for name, col in [("ramadan_start", "ramadan_days_in_week"),
                      ("eid_ul_fitr", "eid_fitr_days_in_week"),
                      ("eid_ul_adha", "eid_adha_days_in_week")]:
        e = ev[ev["event"] == name]
        days = np.zeros(len(out), dtype=int)
        for _, r in e.iterrows():
            lo = np.maximum(start.values, np.datetime64(r["date_pakistan"]))
            hi = np.minimum(out["week_end"].values, np.datetime64(r["date_end"]))
            days += np.clip((hi - lo).astype("timedelta64[D]").astype(int) + 1, 0, None)
        out[col] = days
    # Anticipation: weeks until the next Ramadan starts (traders stock up beforehand).
    starts = ev.loc[ev["event"] == "ramadan_start", "date_pakistan"].sort_values().values
    idx = np.searchsorted(starts, out["week_end"].values)
    nxt = pd.to_datetime(starts[np.minimum(idx, len(starts) - 1)])
    out["weeks_to_ramadan"] = ((nxt - out["week_end"]).dt.days / 7).round(1)
    return out


def policy_features(weeks):
    path = EXTERNAL / "sbp_mpc_decisions.csv"
    out = pd.DataFrame({"week_end": weeks})
    if not path.exists():
        log("    (sbp_mpc_decisions.csv not found yet: policy-rate columns left empty)")
        out["policy_rate"] = np.nan
        out["mpc_decision_in_week"] = np.nan
        return out
    mpc = pd.read_csv(path, parse_dates=["decision_date"]).dropna(subset=["policy_rate"])
    mpc = mpc.sort_values("decision_date")
    # Rate in force at the end of the week (as-of join on the decision date).
    out = pd.merge_asof(out.sort_values("week_end"),
                        mpc[["decision_date", "policy_rate"]],
                        left_on="week_end", right_on="decision_date", direction="backward")
    out["mpc_decision_in_week"] = (
        (out["week_end"] - out["decision_date"]).dt.days.between(0, 6))
    return out.drop(columns="decision_date")


def main():
    PROCESSED.mkdir(parents=True, exist_ok=True)
    q = complete_grid(load_spi())
    weeks = pd.Series(sorted(q["week_end"].unique()))

    df = (q.merge(fx_weekly(weeks), on="week_end", how="left")
           .merge(fuel_flags(), on="week_end", how="left")
           .merge(event_features(weeks), on="week_end", how="left")
           .merge(policy_features(weeks), on="week_end", how="left"))

    df = df.sort_values(["group", "week_end"]).reset_index(drop=True)
    g = df.groupby("group")
    # Derived variables (computed from the cleaned level series, not the reported %s).
    df["log_spi"] = np.log(df["spi"])
    df["spi_wow_pct"] = g["spi"].pct_change(fill_method=None) * 100
    df["spi_yoy_pct"] = (df["spi"] / df["spi_year_ago"] - 1) * 100
    df["fx_wow_pct"] = g["fx_pkr_usd_wavg"].pct_change(fill_method=None) * 100
    for k in (1, 2, 4):
        df[f"spi_wow_pct_lag{k}"] = g["spi_wow_pct"].shift(k)
    df["fx_wow_pct_lag1"] = g["fx_wow_pct"].shift(1)
    # Target for forecasting (H1): next week's % change.
    df["target_spi_wow_pct_next"] = g["spi_wow_pct"].shift(-1)
    # Categorical encoding (rubric 2.4): one Boolean dummy per group.
    df = pd.concat([df, pd.get_dummies(df["group"], prefix="grp", dtype=bool)], axis=1)

    out = PROCESSED / "master_weekly_quintile.csv"
    df.to_csv(out, index=False, date_format="%Y-%m-%d")
    log(f"\nmaster dataset: {df.shape[0]} rows x {df.shape[1]} columns -> "
        f"{out.relative_to(ROOT)}")
    log(f"weeks: {df.week_end.min().date()} to {df.week_end.max().date()}")
    (PROCESSED / "cleaning_report.txt").write_text("\n".join(report), encoding="utf-8")


if __name__ == "__main__":
    main()
