"""Build the early-warning feature set used in EDA (M2) and modeling (M3-M5).

Input:  data/processed/master_model_ready.csv, data/processed/items_weekly_panel.csv,
        data/external/islamic_events.csv
Output: data/processed/master_features.csv   (master_model_ready + the columns below)
        data/processed/FEATURES_DICTIONARY.md

The forecasting question: standing at the end of week t, will week t+1 be a price-shock week
for this group? Every feature therefore uses only information available at the end of week t,
or calendar facts known in advance (e.g. that a fuel-price review is scheduled next week).

Decisions:
  F1 Shock = weekly SPI rise of at least 1.0% (13-17% of weeks depending on the group).
  F2 Fuel-review calendar: Pakistan reviews petrol/diesel prices fortnightly, effective the 1st
     and 16th of the month. 64% of SPI weeks containing those days had a fuel revision, vs 9% of
     other weeks.
  F3 "Momentum" items (spikes followed by further rises) are chosen from the TRAINING period only
     (weeks up to TRAIN_END), so the choice does not peek at the test years.
  F4 Component inflation (food, energy, ...) is a Combined-weighted average of item price changes.
     It is the same for every group in a week; the groups differ in their exposure to it.

Run:  python src/features/build_features.py
"""

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
PROC = ROOT / "data" / "processed"
TRAIN_END = pd.Timestamp("2024-12-31")
SHOCK_THRESHOLD = 1.0          # % weekly rise
SPIKE = 5.0                    # % weekly rise that counts as an item spike
MOMENTUM_MIN = 5.0             # median % rise over the next 8 weeks needed to call an item "momentum"
PERISHABLES = ["tomatoes", "onions", "potatoes", "chicken", "eggs", "bananas", "garlic"]


def component(item_id, category):
    if item_id in ("electricity_q1", "gas_q1"):
        return "utilities"
    if item_id in ("petrol", "diesel"):
        return "motor_fuel"
    if item_id in ("lpg", "firewood"):
        return "market_energy"
    if item_id in PERISHABLES:
        return "perishables"
    return "staples" if category == "food" else "nonfood"


def days_of_week_ending(t):
    # An SPI week runs Friday..Thursday and ends on t.
    return pd.date_range(t - pd.Timedelta(days=6), t)


def momentum_items(items):
    """Items whose >5% weekly spikes were, in the training period, followed by a median
    rise of at least 5% over the next 8 weeks."""
    lp = np.log(items[items["week_end"] <= TRAIN_END]
                .pivot(index="week_end", columns="item_id", values="price"))
    chosen = {}
    for k in lp.columns:
        r = lp[k].diff() * 100
        idx = [i for i in range(1, len(r) - 8) if r.iloc[i] > SPIKE]
        if len(idx) >= 5:
            after = np.median([(lp[k].iloc[i + 8] - lp[k].iloc[i]) * 100 for i in idx])
            if after >= MOMENTUM_MIN:
                chosen[k] = round(after, 1)
    return chosen


def main():
    df = pd.read_csv(PROC / "master_model_ready.csv", parse_dates=["week_end"])
    items = pd.read_csv(PROC / "items_weekly_panel.csv", parse_dates=["week_end"])
    ev = pd.read_csv(ROOT / "data" / "external" / "islamic_events.csv", parse_dates=["date_pakistan", "date_end"])
    weeks = pd.DataFrame({"week_end": sorted(df["week_end"].unique())})

    # ---------------------------------------------------------------- week-level features
    nxt = weeks["week_end"] + pd.Timedelta(days=7)   # end of next week
    weeks["fuel_review_next_week"] = [int(any(x.day in (1, 16) for x in days_of_week_ending(t))) for t in nxt]
    weeks["fy_start_next_week"] = [int(any(x.month == 7 and x.day == 1 for x in days_of_week_ending(t)))
                                   for t in nxt]
    adha = ev.loc[ev["event"] == "eid_ul_adha", "date_pakistan"].sort_values().values
    days_to_adha = np.array([((adha[adha > np.datetime64(t)][0] - np.datetime64(t)).astype("timedelta64[D]")
                              .astype(int)) if (adha > np.datetime64(t)).any() else 999
                             for t in weeks["week_end"]])
    weeks["pre_eid_adha_4w"] = ((days_to_adha > 0) & (days_to_adha <= 28)).astype(int)
    ram = ev.loc[ev["event"] == "ramadan_start", ["date_pakistan", "date_end"]]
    ram_days = set()
    for start, end in ram.itertuples(index=False):
        ram_days.update(pd.date_range(start, end))
    weeks["ramadan_next_week"] = [int(any(x in ram_days for x in days_of_week_ending(t))) for t in nxt]

    # Exchange-rate change over the past k weeks (log %), from the weekly average rate.
    fx = df[df["group"] == "Combined"].set_index("week_end")["fx_pkr_usd_wavg"]
    for k in (4, 8, 13):
        weeks[f"fx_chg_{k}w"] = (np.log(fx).diff(k) * 100).values

    # Component inflation (Combined-weighted average item price change), this week and past 4 weeks.
    items["component"] = [component(i, c) for i, c in zip(items["item_id"], items["category"])]
    items["wr"] = items["weight_combined"] * items["price_wow_pct"]
    comp = (items.groupby(["week_end", "component"])["wr"].sum()
            / items.groupby(["week_end", "component"])["weight_combined"].sum()).unstack()
    comp["food"] = (items[items["category"] == "food"].groupby("week_end")["wr"].sum()
                    / items[items["category"] == "food"].groupby("week_end")["weight_combined"].sum())
    comp["energy"] = (items[items["category"] == "energy"].groupby("week_end")["wr"].sum()
                      / items[items["category"] == "energy"].groupby("week_end")["weight_combined"].sum())
    comp = comp.add_prefix("infl_").add_suffix("_wow")
    comp4 = comp.rolling(4).sum().rename(columns=lambda c: c.replace("_wow", "_4w"))
    weeks = weeks.merge(comp.reset_index(), on="week_end", how="left")
    weeks = weeks.merge(comp4.reset_index(), on="week_end", how="left")

    # Momentum items (chosen on training data only): spikes in the last 4 weeks, and their price change.
    mom = momentum_items(items)
    pi = items.pivot(index="week_end", columns="item_id", values="price")
    r = np.log(pi[list(mom)]).diff() * 100
    spikes = (r > SPIKE).sum(axis=1)
    weeks["momentum_spikes_4w"] = spikes.rolling(4).sum().values
    w = items.drop_duplicates("item_id").set_index("item_id").loc[list(mom), "weight_combined"]
    weeks["momentum_basket_chg_4w"] = ((r * w).sum(axis=1, min_count=1) / w.sum()).rolling(4).sum().values

    # Gap between the poorest and richest quintile this week (for the rotating-burden hypothesis).
    wide = df.pivot(index="week_end", columns="group", values="spi_wow_pct")
    weeks["gap_q1_q5_wow"] = (wide["Q1"] - wide["Q5"]).values

    # ---------------------------------------------------------------- group-level features
    out = df.merge(weeks, on="week_end", how="left", validate="many_to_one")
    out = out.sort_values(["group", "week_end"]).reset_index(drop=True)
    g = out.groupby("group")
    out["shock_now"] = (out["spi_wow_pct"] >= SHOCK_THRESHOLD).astype("Int64").where(out["spi_wow_pct"].notna())
    out["target_shock_next"] = (out["target_spi_wow_pct_next"] >= SHOCK_THRESHOLD).astype("Int64") \
        .where(out["target_spi_wow_pct_next"].notna())
    out["shocks_last_4w"] = g["shock_now"].transform(lambda s: s.astype(float).rolling(4).sum())
    out["spi_chg_4w"] = g["log_spi"].diff(4) * 100
    out["spi_chg_13w"] = g["log_spi"].diff(13) * 100
    # Forward-looking cumulative changes, used as targets in the pass-through analysis (H2).
    for k in (4, 8, 13):
        out[f"target_spi_chg_next{k}w"] = (g["log_spi"].shift(-k) - out["log_spi"]) * 100
    out["policy_rate_chg_13w"] = g["policy_rate"].diff(13)

    out = out.sort_values(["week_end", "group"]).reset_index(drop=True)
    out.to_csv(PROC / "master_features.csv", index=False, date_format="%Y-%m-%d")

    desc = {
        "fuel_review_next_week": "1 if next SPI week contains the 1st or 16th (scheduled fortnightly fuel-price review)",
        "fy_start_next_week": "1 if next SPI week contains 1 July (fiscal-year start: budget, taxes, fuel levy)",
        "pre_eid_adha_4w": "1 if Eid ul-Adha falls within the next 4 weeks",
        "ramadan_next_week": "1 if next SPI week includes Ramadan days",
        "fx_chg_4w": "% change (log) in weekly average PKR/USD over the past 4 weeks",
        "fx_chg_8w": "% change (log) in weekly average PKR/USD over the past 8 weeks",
        "fx_chg_13w": "% change (log) in weekly average PKR/USD over the past 13 weeks",
        "momentum_spikes_4w": f"Number of >5% weekly spikes in momentum items over the past 4 weeks ({', '.join(mom)})",
        "momentum_basket_chg_4w": "Combined-weighted % price change of the momentum items over the past 4 weeks",
        "gap_q1_q5_wow": "Q1 weekly % change minus Q5 weekly % change (same for all rows of a week)",
        "shock_now": "1 if this week's SPI rose by >= 1% (shock week)",
        "target_shock_next": "TARGET (classification): 1 if NEXT week's SPI rises by >= 1% for this group",
        "shocks_last_4w": "Number of shock weeks for this group in the past 4 weeks",
        "spi_chg_4w": "% change (log) in this group's SPI over the past 4 weeks",
        "spi_chg_13w": "% change (log) in this group's SPI over the past 13 weeks",
        "target_spi_chg_next4w": "TARGET (pass-through): % change (log) in SPI over the next 4 weeks",
        "target_spi_chg_next8w": "TARGET (pass-through): % change (log) in SPI over the next 8 weeks",
        "target_spi_chg_next13w": "TARGET (pass-through): % change (log) in SPI over the next 13 weeks",
        "policy_rate_chg_13w": "Change in the SBP policy rate over the past 13 weeks (percentage points)",
    }
    for c in comp.columns:
        name = c.replace("infl_", "").replace("_wow", "")
        desc[c] = f"Combined-weighted average weekly % price change of {name} items this week"
        desc[c.replace("_wow", "_4w")] = f"Sum of the last 4 weekly values of {c}"
    new_cols = [c for c in out.columns if c not in df.columns]
    lines = ["# Feature dictionary: master_features.csv (columns added to master_model_ready.csv)", "",
             f"Built by `src/features/build_features.py`. Momentum items chosen on weeks up to "
             f"{TRAIN_END:%Y-%m-%d}: {mom} (median % rise over 8 weeks after a spike).", "",
             "| Column | % missing | Description |", "|---|---|---|"]
    lines += [f"| `{c}` | {100 * out[c].isna().mean():.1f} | {desc[c]} |" for c in new_cols]
    (PROC / "FEATURES_DICTIONARY.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"master_features.csv: {out.shape[0]:,} rows x {out.shape[1]} columns ({len(new_cols)} new)")
    print(f"momentum items (training period): {mom}")


if __name__ == "__main__":
    main()
