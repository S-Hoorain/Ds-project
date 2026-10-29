"""Sensitivity checks of the fixed numbers and default settings of Milestones 2 and 3.

These checks were run after the M3 submission (2026-10-26) to prepare for the viva. They ask, for each
number we fixed by judgement (the 1% shock threshold, the 1% fuel-revision cut-off, the EDA signal cut-offs,
window lengths, the momentum-item rule, HAC lags, seeds, the bootstrap size) and for two settings we left at
their defaults (Gini impurity, Euclidean distance): would another reasonable value have changed the result?

Everything uses the training period only (weeks up to 2024-12-31) except where a check is about the test
period itself (seeds, bootstrap) or repeats an M2 table on the full sample. The results are not used to change
any submitted choice: picking a definition or a setting because it scores better would be tuning on the
results. Prints only; writes no files.

Run from the project root (about 4 minutes):  python src/models/sensitivity_checks.py
"""

import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats
from sklearn.base import clone
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from models import baseline as B  # noqa: E402

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 30)
warnings.filterwarnings("ignore", message="Only one class is present")   # a fold without shocks at 2%

THRESHOLDS = [0.5, 0.75, 1.0, 1.5, 2.0]   # % weekly SPI rise that defines a shock week


def selected_models():
    """The three M3 pipelines with the settings selected in notebook 03 (section 4), kept fixed."""
    models, _ = B.make_models()
    return {
        "LR": clone(models["Logistic regression"]).set_params(
            model__C=0.0001, model__l1_ratio=0.0, model__class_weight="balanced"),
        "KNN": clone(models["KNN"]).set_params(
            model__n_neighbors=100, model__weights="uniform", scale__cont=StandardScaler()),
        "Tree": clone(models["Decision tree"]).set_params(
            model__max_depth=4, model__min_samples_leaf=40, model__class_weight=None),
    }


def cv_scores(y, p, folds):
    """Pooled out-of-fold AUC and the mean of the per-year AUCs (years with only one class are skipped)."""
    val = np.concatenate([va for _, va in folds])
    per_year = [roc_auc_score(y.iloc[va], p[va]) for _, va in folds if y.iloc[va].nunique() == 2]
    return roc_auc_score(y.iloc[val], p[val]), np.mean(per_year), len(per_year)


def hac_ols(y, X, lags):
    # Same helper as notebooks 02 and 04: OLS with Newey-West (HAC) standard errors.
    X = sm.add_constant(X)
    m = pd.concat([y, X], axis=1).dropna()
    return sm.OLS(m.iloc[:, 0], m.iloc[:, 1:]).fit(cov_type="HAC", cov_kwds={"maxlags": lags})


def main():
    feat = pd.read_csv(ROOT / "data" / "processed" / "master_features.csv", parse_dates=["week_end"])
    week = feat[feat["group"] == "Combined"].set_index("week_end")
    d = B.load_model_data()
    train, test = B.split_train_test(d)
    X, y = train[B.FEATURES], train[B.TARGET]
    folds = B.time_series_folds(train)
    fixed = selected_models()

    # ------------------------------------------------------------ 1. shock threshold (M2 decision F1)
    print("=== 1. Shock threshold")
    x = feat.loc[feat["group"].isin(B.GROUPS), "spi_wow_pct"].dropna()
    print(f"Weekly SPI change, Q1-Q5 rows: median {x.median():.2f}%, mean {x.mean():.2f}%; "
          f"1% is the {100 * (x < 1).mean():.0f}th percentile")
    rows = []
    for thr in THRESHOLDS:
        ytr, yte = train["target_spi_wow_pct_next"] >= thr, test["target_spi_wow_pct_next"] >= thr
        rows.append({"threshold %": thr, "train shock rate %": 100 * ytr.mean(), "train shock rows": int(ytr.sum()),
                     "test shock rows": int(yte.sum()), "test shock weeks": test.loc[yte, "week_end"].nunique(),
                     "shock rate % 2021/22/23/24": [round(100 * ytr[train["week_end"].dt.year == v].mean(), 1)
                                                     for v in B.VAL_YEARS]})
    print(pd.DataFrame(rows).round(2).to_string(index=False))
    # Same features and settings, only the target definition changes (settings were tuned for 1%).
    rows = []
    for thr in THRESHOLDS:
        yt = (train["target_spi_wow_pct_next"] >= thr).astype(int)
        r = {"threshold %": thr}
        for name, est in fixed.items():
            pooled, within, n = cv_scores(yt, B.oof_predict(est, X, yt, folds), folds)
            r[f"{name} pooled"], r[f"{name} within"] = pooled, within
        pooled, within, n = cv_scores(yt, (train["spi_wow_pct"] >= thr).astype(float).to_numpy(), folds)
        r["persistence pooled"], r["years usable"] = pooled, n
        rows.append(r)
    print("CV ROC-AUC, 2021-24 out-of-fold (within = mean of yearly AUCs):")
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    # ------------------------------------------------------------ 2. fuel-revision cut-off (M2 decision D5)
    print("\n=== 2. Fuel-revision cut-off (larger of the petrol and diesel weekly moves)")
    mx = week[["petrol_pct_wow", "diesel_pct_wow"]].abs().max(axis=1).dropna()
    print("  weeks flagged: " + ", ".join(f"> {c}%: {(mx > c).sum()}" for c in [0.25, 0.5, 1, 2, 3]) + f" (of {len(mx)})")
    bins = pd.cut(mx, [0, 0.1, 0.25, 0.5, 1, 2, 5, 100], include_lowest=True).value_counts().sort_index()
    print("  distribution: " + ", ".join(f"{k}: {v}" for k, v in bins.items()))

    # ------------------------------------------------------------ 3. EDA signal cut-offs (M2 Figure E4, Combined rows)
    print("\n=== 3. EDA signal cut-offs (Combined rows, full sample, as in notebook 02, section 3.3)")
    c = feat[(feat["group"] == "Combined") & feat["target_shock_next"].notna()]

    def contrast(mask, label):
        on, off = c.loc[mask, "target_shock_next"], c.loc[~mask, "target_shock_next"]
        p = stats.fisher_exact(pd.crosstab(mask, c["target_shock_next"]))[1]
        print(f"  {label:<36} n = {len(on):>3}: {100 * on.mean():5.1f}% vs {100 * off.mean():5.1f}%, "
              f"difference {100 * (on.mean() - off.mean()):+5.1f} pp, Fisher p = {p:.4f}")

    for cut in [1, 2, 3, 5]:
        contrast(c["fx_chg_8w"] > cut, f"rupee fell > {cut}% in 8 weeks")
    for cut in [1, 2]:
        contrast(c["shocks_last_4w"] >= cut, f">= {cut} shocks in past 4 weeks")
    for cut in [1, 2, 3, 4]:
        contrast(c["momentum_spikes_4w"] >= cut, f">= {cut} momentum spikes in 4 weeks")
    ev = pd.read_csv(ROOT / "data" / "external" / "islamic_events.csv", parse_dates=["date_pakistan"])
    adha = np.sort(ev.loc[ev["event"] == "eid_ul_adha", "date_pakistan"].values)

    def days_to_adha(t):
        later = adha[adha > np.datetime64(t)]
        return (later[0] - np.datetime64(t)).astype("timedelta64[D]").astype(int) if len(later) else 999

    dta = c["week_end"].map(days_to_adha)
    for w in [1, 2, 4, 6, 8]:
        contrast((dta > 0) & (dta <= 7 * w), f"Eid ul-Adha within {w} weeks")

    # ------------------------------------------------------------ 4. window lengths (single-feature AUC)
    print("\n=== 4. Window lengths: ROC-AUC of each feature on its own (training-period quintile rows)")
    tr = feat[feat["group"].isin(B.GROUPS) & (feat["week_end"] <= B.TRAIN_END) & feat["target_shock_next"].notna()]
    for cols in [["fx_wow_pct", "fx_chg_4w", "fx_chg_8w", "fx_chg_13w"], ["spi_wow_pct", "spi_chg_4w", "spi_chg_13w"],
                 ["infl_perishables_wow", "infl_perishables_4w"], ["infl_staples_wow", "infl_staples_4w"],
                 ["infl_utilities_wow", "infl_utilities_4w"], ["infl_motor_fuel_wow", "infl_motor_fuel_4w"]]:
        print("  " + " | ".join(f"{col} {roc_auc_score(tr.loc[tr[col].notna(), 'target_shock_next'].astype(int), tr[col].dropna()):.3f}"
                                for col in cols))

    # ------------------------------------------------------------ 5. momentum-item rule (M2 decision F3)
    print("\n=== 5. Momentum items under other cut-offs (training weeks; ours: spike > 5%, follow-through >= 5%)")
    items = pd.read_csv(ROOT / "data" / "processed" / "items_weekly_panel.csv", parse_dates=["week_end"])
    lp = np.log(items[items["week_end"] <= B.TRAIN_END].pivot(index="week_end", columns="item_id", values="price"))
    for spike in [3, 5, 10]:
        for need in [3, 5, 10]:
            chosen = []
            for k in lp.columns:
                r = lp[k].diff() * 100
                idx = [i for i in range(1, len(r) - 8) if r.iloc[i] > spike]
                if len(idx) >= 5 and np.median([(lp[k].iloc[i + 8] - lp[k].iloc[i]) * 100 for i in idx]) >= need:
                    chosen.append(k)
            print(f"  spike > {spike:>2}%, follow-through >= {need:>2}%: {len(chosen):>2} items {chosen}")

    # ------------------------------------------------------------ 6. HAC lags (notebooks 02 and 04)
    print("\n=== 6. HAC lags")
    wide = lambda col: feat.pivot(index="week_end", columns="group", values=col)
    yq, own = wide("target_spi_chg_next8w"), wide("spi_chg_4w")
    idx = week.index[week.index <= B.TRAIN_END - pd.Timedelta(weeks=8)]
    Xd = pd.concat([week.loc[idx, ["fx_chg_8w", "infl_motor_fuel_4w", "policy_rate"]],
                    (own["Q5"] - own["Q1"]).loc[idx].rename("own_gap_4w")], axis=1)
    for lags in [4, 8, 10, 16]:
        m = hac_ols((yq["Q5"] - yq["Q1"]).loc[idx].rename("d"), Xd, lags)
        print(f"  H2 (8 weeks), {lags:>2} lags: delta {m.params['fx_chg_8w']:.3f}, SE {m.bse['fx_chg_8w']:.3f}, "
              f"one-sided p {stats.norm.sf(m.tvalues['fx_chg_8w']):.3f}")
    w = week[week.index <= B.TRAIN_END].copy()
    w["period_2022_23"] = ((w.index.year >= 2022) & (w.index.year <= 2023)).astype(int)
    w["period_2024_26"] = (w.index.year >= 2024).astype(int)
    Xg = w[["infl_food_wow", "infl_energy_wow", "fx_wow_pct", "fuel_revision_week", "period_2022_23",
            "period_2024_26"]].astype(float)
    for lags in [1, 2, 4, 8, 13]:
        m = hac_ols(w["gap_q1_q5_wow"].rename("gap"), Xg, lags)
        print(f"  H3, {lags:>2} lags: beta_food {m.params['infl_food_wow']:.3f}, one-sided p "
              f"{stats.norm.sf(m.tvalues['infl_food_wow']):.4f}; beta_energy one-sided p (< 0) "
              f"{stats.norm.cdf(m.tvalues['infl_energy_wow']):.3f}")

    # ------------------------------------------------------------ 7. default settings that were not tuned
    print("\n=== 7. Settings left at their defaults (not in the M3 grids)")
    models, grids = B.make_models()
    for crit in ["gini", "entropy"]:
        res, _, _ = B.grid_search_time_cv(models["Decision tree"], {**grids["Decision tree"], "model__criterion": [crit]},
                                          X, y, folds)
        best = res.iloc[0]
        print(f"  tree, {crit:<7}: best pooled {best['pooled CV AUC']:.3f} (depth {best['max_depth']}, leaf "
              f"{best['min_samples_leaf']}), within-year {best['mean fold AUC']:.3f}")
    for p, name in [(2, "Euclidean"), (1, "Manhattan")]:
        res, _, _ = B.grid_search_time_cv(models["KNN"], {"model__n_neighbors": [50, 75, 100, 150, 200],
                                                          "model__weights": ["uniform"], "model__p": [p],
                                                          "scale__cont": [StandardScaler()]}, X, y, folds)
        best = res.iloc[0]
        print(f"  KNN, {name:<9}: best pooled {best['pooled CV AUC']:.3f} (k = {best['n_neighbors']}), "
              f"within-year {best['mean fold AUC']:.3f}")

    # ------------------------------------------------------------ 8. random seed and bootstrap size
    print("\n=== 8. Random seed and bootstrap size")
    Xte, yte = test[B.FEATURES], test[B.TARGET]
    for seed in [42, 0, 1, 7, 2024]:
        out = []
        for name in ["Tree", "LR"]:
            est = clone(fixed[name]).set_params(model__random_state=seed)
            pooled, _, _ = cv_scores(y, B.oof_predict(est, X, y, folds), folds)
            auc = roc_auc_score(yte, clone(est).fit(X, y).predict_proba(Xte)[:, 1])
            out.append(f"{name} CV {pooled:.4f}, test {auc:.4f}")
        print(f"  seed {seed:>4}: " + " | ".join(out))
    pk = clone(fixed["KNN"]).fit(X, y).predict_proba(Xte)[:, 1]
    pl = clone(fixed["LR"]).fit(X, y).predict_proba(Xte)[:, 1]
    for n_boot, seed in [(2000, 42), (2000, 1), (2000, 7), (10000, 42)]:
        bs = B.week_block_bootstrap(yte, {"knn": pk, "lr": pl}, test["week_end"].to_numpy(), n_boot=n_boot, seed=seed)
        dif = bs["knn"] - bs["lr"]
        print(f"  {n_boot:>5} resamples, seed {seed:>2}: KNN test AUC 95% [{bs['knn'].quantile(0.025):.3f}, "
              f"{bs['knn'].quantile(0.975):.3f}]; KNN - LR [{dif.quantile(0.025):+.3f}, {dif.quantile(0.975):+.3f}]")

    # ------------------------------------------------------------ 9. where the train/test boundary falls
    print("\n=== 9. Other train/test boundaries (share of weeks in the test, test shock rate)")
    weeks = d["week_end"].drop_duplicates()
    for end in ["2023-12-31", "2024-06-30", "2024-12-31", "2025-06-30"]:
        later = d["week_end"] > pd.Timestamp(end)
        print(f"  train up to {end}: test {100 * (weeks > pd.Timestamp(end)).mean():.1f}% of weeks, "
              f"test shock rate {100 * d.loc[later, B.TARGET].mean():.1f}%")


if __name__ == "__main__":
    main()
