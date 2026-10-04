"""Exploratory analysis of the consumption quintiles, used to choose the project's narrative.

Reproduces every number in reports/quintile_insights.md and saves the tables to
reports/tables/insights_*.csv.

Inputs: data/processed/master_model_ready.csv, data/processed/items_weekly_panel.csv
        (both produced by notebooks/01_data_preparation.ipynb)

Run:  python src/analysis/quintile_insights.py
"""

from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

ROOT = Path(__file__).resolve().parents[2]
PROC = ROOT / "data" / "processed"
TABLES = ROOT / "reports" / "tables"
G = ["Q1", "Q2", "Q3", "Q4", "Q5", "Combined"]
PERISHABLES = ["tomatoes", "onions", "potatoes", "chicken", "eggs", "bananas", "garlic"]
COMPONENTS = ["utilities", "motor_fuel", "market_energy", "perishables", "staples", "nonfood"]


def fiscal_year(t):
    # Pakistan's fiscal year runs July-June; FY24 = Jul 2023 - Jun 2024.
    return f"FY{(t.year + 1 if t.month >= 7 else t.year) % 100:02d}"


def component(item_id, category):
    if item_id in ("electricity_q1", "gas_q1"):
        return "utilities"          # administered tariffs (Q1 slab)
    if item_id in ("petrol", "diesel"):
        return "motor_fuel"         # administered, revised fortnightly
    if item_id in ("lpg", "firewood"):
        return "market_energy"
    if item_id in PERISHABLES:
        return "perishables"
    return "staples" if category == "food" else "nonfood"


def save(df, name):
    df.to_csv(TABLES / f"insights_{name}.csv")
    print(f"\n== {name}\n{df.round(3).to_string()}")


def main():
    d = pd.read_csv(PROC / "master_model_ready.csv", parse_dates=["week_end"])
    it = pd.read_csv(PROC / "items_weekly_panel.csv", parse_dates=["week_end"])
    it["component"] = [component(i, c) for i, c in zip(it["item_id"], it["category"])]
    it["FY"] = it["week_end"].map(fiscal_year)
    lvl = d.pivot(index="week_end", columns="group", values="spi")[G]
    yoy = d.pivot(index="week_end", columns="group", values="spi_yoy_pct")[G]
    wow = d.pivot(index="week_end", columns="group", values="spi_wow_pct")[G]

    # 1. Inflation levels: cumulative, by fiscal year, by period.
    cum = pd.DataFrame({"cumulative_inflation_pct": (lvl.iloc[-1] / lvl.iloc[0] - 1) * 100,
                        "peak_yoy_pct": yoy.max(), "peak_week": yoy.idxmax().dt.date})
    save(cum, "1_cumulative")
    fy = yoy.groupby(yoy.index.map(fiscal_year)).mean()
    fy["Q1_minus_Q5"] = fy["Q1"] - fy["Q5"]
    save(fy, "1_yoy_by_fiscal_year")
    periods = {"2019-21": ("2019-09", "2021-12"), "2022-23": ("2022-01", "2023-12"),
               "2024-26": ("2024-01", "2026-12")}
    per = pd.DataFrame({k: (lvl.loc[a:b].iloc[-1] / lvl.loc[a:b].iloc[0] - 1) * 100
                        for k, (a, b) in periods.items()}).T
    save(per, "1_cumulative_by_period")
    rel = (lvl["Q1"] / lvl["Q5"]) / (lvl["Q1"] / lvl["Q5"]).iloc[0]
    save(rel.resample("QE").last().to_frame("Q1_over_Q5_relative_price_level"), "1_relative_level")

    # 2. Drivers: PBS item impacts (Q1 and Combined only) by component.
    w_last = it[it["week_end"] == it["week_end"].max()].groupby("component")[["weight_q1", "weight_combined"]].sum()
    decomp = {}
    for col, lab in (("impact_q1", "Q1"), ("impact_combined", "Combined")):
        c = it.pivot_table(index="week_end", columns="component", values=col, aggfunc="sum")[COMPONENTS].dropna()
        tot = c.sum(axis=1)
        decomp[(lab, "basket_weight_pct")] = w_last[f"weight_{'q1' if lab == 'Q1' else 'combined'}"]
        decomp[(lab, "cumulative_pp")] = c.sum()
        decomp[(lab, "share_of_weekly_variance_pct")] = c.apply(lambda x: np.cov(x, tot)[0, 1]) / tot.var() * 100
    save(pd.DataFrame(decomp).reindex(COMPONENTS), "2_variance_decomposition")
    byfy = it.groupby(["FY", "category"])[["impact_q1", "impact_combined"]].sum().unstack("category")
    save(byfy, "2_contributions_by_fiscal_year")
    item_gap = it.groupby("item_id")[["impact_q1", "impact_combined"]].sum()
    item_gap["q1_minus_combined"] = item_gap["impact_q1"] - item_gap["impact_combined"]
    save(item_gap.sort_values("q1_minus_combined"), "2_item_contribution_gap")

    # 3. Exposure of ALL quintiles: OLS of each group's weekly change on component inflation
    #    (Combined-weighted average price change within each component).
    it["wr"] = it["weight_combined"] * it["price_wow_pct"]
    X = (it.groupby(["week_end", "component"])["wr"].sum()
         / it.groupby(["week_end", "component"])["weight_combined"].sum()).unstack()[COMPONENTS]
    M = X.join(wow).dropna()
    expo = {}
    for g in G:
        A = np.column_stack([M[COMPONENTS].values, np.ones(len(M))])
        b = np.linalg.lstsq(A, M[g].values, rcond=None)[0]
        r2 = 1 - ((M[g] - A @ b) ** 2).sum() / ((M[g] - M[g].mean()) ** 2).sum()
        expo[g] = {**dict(zip(COMPONENTS, b[:-1] * 100)), "R2": r2}
    save(pd.DataFrame(expo).T, "3_implied_exposure")

    # 4. Volatility and predictability.
    w = wow.dropna()
    vol = pd.DataFrame({"mean": w.mean(), "sd": w.std(), "median": w.median(),
                        "iqr": w.quantile(.75) - w.quantile(.25), "share_abs_gt_1pct": (w.abs() > 1).mean() * 100,
                        "min": w.min(), "max": w.max(), "acf_lag1": [w[g].autocorr(1) for g in G]})
    save(vol, "4_volatility")
    train = w.index <= "2024-12-31"
    fc = {}
    for g in G:
        y, ylag = w[g], w[g].shift(1)
        x_tr = ylag[train].dropna()
        b = np.polyfit(x_tr, y[train].loc[x_tr.index], 1)
        ar = (y - (b[1] + b[0] * ylag)).abs()
        fc[g] = {"mae_ar1_train": ar[train].mean(), "mae_ar1_test": ar[~train].mean(),
                 "mae_no_change_test": y[~train].abs().mean(), "ar1_slope": b[0]}
    save(pd.DataFrame(fc).T, "4_baseline_forecasts")

    # 5. Calendar: Ramadan and Eid ul-Adha windows.
    ev = pd.read_csv(ROOT / "data" / "external" / "islamic_events.csv", parse_dates=["date_pakistan"])

    def window(event):
        starts = ev.loc[ev["event"] == event, "date_pakistan"].values
        rel_w = np.array([-(pd.to_datetime(starts) - t).days[np.argmin(np.abs((pd.to_datetime(starts) - t).days))] / 7
                          for t in w.index]).round()
        return pd.Series(np.select([(rel_w >= -4) & (rel_w <= -1), (rel_w >= 0) & (rel_w <= 3)],
                                   ["4 weeks before", "first 4 weeks"], "other"), index=w.index)

    for event in ("ramadan_start", "eid_ul_adha"):
        win = window(event)
        t = w.groupby(win).mean()
        t["n_weeks"] = w.groupby(win).size()
        a, b_ = w.loc[win == "4 weeks before", "Q1"], w.loc[win == "other", "Q1"]
        t.loc["Q1 pre vs other: Mann-Whitney p", "Q1"] = stats.mannwhitneyu(a, b_).pvalue
        save(t, f"5_calendar_{event}")

    # 6. Exchange-rate pass-through: cumulative SPI change over next k weeks per 1% FX change.
    fx = d[d["group"] == "Combined"].set_index("week_end")["fx_wow_pct"]
    pt = {}
    for k in (1, 4, 8, 13):
        pt[f"k={k}"] = {g: np.polyfit(*pd.concat([fx, wow[g].rolling(k).sum().shift(-k + 1)], axis=1)
                                      .dropna().values.T, 1)[0] for g in G}
    save(pd.DataFrame(pt).T, "6_fx_passthrough")

    # 7. Spike persistence: median change in the 8 weeks after a >5% weekly price rise.
    lp = np.log(it.pivot(index="week_end", columns="item_id", values="price"))
    cat = it.drop_duplicates("item_id").set_index("item_id")["category"]
    rows = []
    for k in lp.columns:
        r = lp[k].diff() * 100
        idx = [i for i in range(1, len(r) - 8) if r.iloc[i] > 5]
        if len(idx) >= 5:
            rows.append({"item": k, "category": cat[k], "n_spikes": len(idx),
                         "median_spike_pct": np.median([r.iloc[i] for i in idx]),
                         "median_change_next_8wks_pct": np.median([(lp[k].iloc[i + 8] - lp[k].iloc[i]) * 100
                                                                   for i in idx])})
    save(pd.DataFrame(rows).set_index("item").sort_values("median_change_next_8wks_pct"), "7_spike_persistence")


if __name__ == "__main__":
    main()
