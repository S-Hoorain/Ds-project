"""Sensitivity checks of the fixed numbers and settings of Milestone 4.

Run on 2026-11-10, after the analysis in notebooks 05 and 06 was final, to prepare for the viva. For each number we
fixed by judgement and did not vary in the notebooks (the 26-week window of the shock rate, 300 trees, the random
seed, the edges of the boosting and KNN grids, the in-processing weight, the equal-opportunity tolerance, the
threshold step, the number of permutation repeats and bootstrap resamples, and Q1 vs Q5 as the compared groups),
it asks: would another reasonable value have changed the result?

Cross-validated scores use the training period only. Test-period numbers are printed for information. None of these
results changes a choice in notebooks 05 and 06: picking a setting because it scores better after the results are
known would be tuning on the results. Prints only; writes no files.

Run from the project root after notebook 05 (about 10 minutes):  python src/models/sensitivity_checks_m4.py
"""

import json
import sys
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.base import clone
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from models import advanced as A  # noqa: E402
from models import baseline as B  # noqa: E402

pd.set_option("display.width", 200)
pd.set_option("display.max_columns", 30)
warnings.filterwarnings("ignore", category=UserWarning)


def selected(name):
    """The pipeline of one learner with the setting selected in notebook 05 (read from the model card)."""
    card = json.loads((ROOT / "models" / "m4_advanced" / "model_card.json").read_text(encoding="utf-8"))
    models, grids = A.make_models()
    params = {}
    for k, v in card["models"][name]["params"].items():
        key = next(g for g in grids[name] if g.split("__")[-1] == k)
        if k == "cont":      # the KNN scaler is stored by class name
            v = next(s for s in grids[name][key] if type(s).__name__ == v)
        params[key] = v
    return models[name].set_params(**params)


def scores(y, oof, folds, yt=None, pt=None):
    """Within-year AUC, its SD, pooled AUC and Brier on 2021-24, plus the test AUC and the test cost relative to
    never alerting at the threshold chosen on 2021-24 (for information)."""
    s = A.cv_scores(y, oof, folds)
    out = {"within-year AUC": s["within-year AUC"], "SD": s["within-year SD"], "pooled AUC": s["pooled AUC"],
           "Brier": s["pooled Brier"]}
    if pt is not None:
        t = B.best_threshold(y, oof)
        out.update({"threshold": t, "test AUC": roc_auc_score(yt, pt),
                    "test cost / never": B.expected_cost(yt, pt, t) / (B.COST_FN * np.sum(yt))})
    return out


def main():
    t0 = time.time()
    df = A.load_model_data()
    train, test = B.split_train_test(df)
    X, y, Xt, yt = train[A.FEATURES], train[A.TARGET], test[A.FEATURES], test[A.TARGET]
    g_tr, g_te = train["group"].to_numpy(), test["group"].to_numpy()
    folds = B.time_series_folds(train)
    val = np.concatenate([va for _, va in folds])
    rf = selected("Random forest")

    def run(est, Xa=X, Xb=Xt):
        oof = A.oof_predict(est, Xa, y, folds)
        pt = clone(est).fit(Xa, y).predict_proba(Xb)[:, 1]
        return oof, pt

    base_oof, base_pt = run(rf)

    print("=== 1. Window of the rolling shock rate (ours: 26 weeks; forest at its selected setting)")
    rows = []
    for w in [13, 26, 52]:
        d = A.load_model_data(rate_window=w)
        tr, te = B.split_train_test(d)
        oof, pt = run(rf, tr[A.FEATURES], te[A.FEATURES])
        rows.append({"window (weeks)": w, **scores(y, oof, folds, yt, pt)})
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    print("\n=== 2. Number of trees in the forest (ours: 300)")
    rows = []
    for n in [100, 300, 500, 1000]:
        oof, pt = run(clone(rf).set_params(model__n_estimators=n))
        rows.append({"trees": n, **scores(y, oof, folds, yt, pt)})
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    print("\n=== 3. Random seed of the forest (ours: 42)")
    rows = []
    for s in [0, 1, 7, 42, 2024]:
        oof, pt = run(clone(rf).set_params(model__random_state=s))
        rows.append({"seed": s, **scores(y, oof, folds, yt, pt)})
    r = pd.DataFrame(rows)
    print(r.round(3).to_string(index=False))
    print(f"  range of within-year AUC {r['within-year AUC'].min():.3f}-{r['within-year AUC'].max():.3f}; "
          f"test AUC {r['test AUC'].min():.3f}-{r['test AUC'].max():.3f}")

    print("\n=== 4. Beyond the edges of the grids")
    gb = selected("Gradient boosting")
    rows = []
    for lr_, n in [(0.01, 300), (0.01, 600), (0.005, 600), (0.003, 1000)]:
        oof, _ = run(clone(gb).set_params(model__learning_rate=lr_, model__max_iter=n))
        rows.append({"boosting learning rate": lr_, "trees": n, **scores(y, oof, folds)})
    print("Gradient boosting (ours: 0.01 and 300 trees, both at the edge of the grid):")
    print(pd.DataFrame(rows).round(3).to_string(index=False))
    knn = selected("KNN")
    smallest = min(len(tr) for tr, _ in folds)
    rows = []
    for k in [200, 250, 275, smallest]:
        oof, _ = run(clone(knn).set_params(model__n_neighbors=k))
        rows.append({"KNN k": k, **scores(y, oof, folds)})
    print(f"KNN (ours: k = 250; the smallest training fold has {smallest} rows, the largest possible k):")
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    print("\n=== 5. Selection rule: what pooled AUC (the M3 rule) would have chosen, from the notebook 05 grid tables")
    rows = []
    for n in A.MODELS:
        gtab = pd.read_csv(ROOT / "reports" / "tables" / f"m4_cv_grid_{n.lower().replace(' ', '_')}.csv")
        bw, bp = gtab.loc[gtab["within-year AUC"].idxmax()], gtab.loc[gtab["pooled AUC"].idxmax()]
        rows.append({"learner": n, "within-year rule: within-year AUC": bw["within-year AUC"],
                     "within-year rule: pooled AUC": bw["pooled AUC"],
                     "pooled rule: within-year AUC": bp["within-year AUC"], "pooled rule: pooled AUC": bp["pooled AUC"],
                     "same setting": bool(bw.drop(["selected"], errors="ignore").equals(bp.drop(["selected"], errors="ignore")))})
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    print("\n=== 6. In-processing weight on Q1 shock rows (ours: 2)")
    yv, gv = y.to_numpy()[val], g_tr[val]
    rows = []
    for m in [1.0, 1.5, 2.0, 3.0]:
        oof = A.oof_predict(rf, X, y, folds, weight_fn=lambda g, yy, m=m: A.group_cost_weights(g, yy, mult=m), groups=g_tr)
        t = B.best_threshold(y, oof)
        r = A.group_rates(yv, oof[val], gv, t)
        rows.append({"weight": m, "threshold": t, "recall Q1": r.loc["Q1", "TPR (recall)"],
                     "recall Q5": r.loc["Q5", "TPR (recall)"], "recall range": r["TPR (recall)"].max() - r["TPR (recall)"].min(),
                     "cost / never": B.expected_cost(yv, oof[val], t) / (B.COST_FN * yv.sum())})
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    print("\n=== 7. Equal-opportunity tolerance (ours: recalls within 0.05)")
    rows = []
    for eps in [0.03, 0.05, 0.08, 0.10]:
        th = A.pareto_frontier(yv, base_oof[val], gv, kind="TPR", eps_grid=[eps]).iloc[0]["thresholds"]
        rv, rt = A.group_rates(yv, base_oof[val], gv, th), A.group_rates(yt.to_numpy(), base_pt, g_te, th)
        rows.append({"tolerance": eps, "thresholds": ", ".join(f"{g} {v:.2f}" for g, v in th.items()),
                     "2021-24 cost / never": A.total_cost(yv, base_oof[val], gv, th) / (B.COST_FN * yv.sum()),
                     "2021-24 recall range": rv["TPR (recall)"].max() - rv["TPR (recall)"].min(),
                     "test cost / never": A.total_cost(yt.to_numpy(), base_pt, g_te, th) / (B.COST_FN * yt.sum()),
                     "test recall range": rt["TPR (recall)"].max() - rt["TPR (recall)"].min()})
    print(pd.DataFrame(rows).round(3).to_string(index=False))

    print("\n=== 8. Threshold step (ours: 0.01)")
    for step in [0.01, 0.005]:
        grid = np.round(np.arange(step, 1.0, step), 3)
        t = B.best_threshold(y, base_oof, grid=grid)
        print(f"  step {step}: threshold {t}, 2021-24 cost / never "
              f"{B.expected_cost(y[val], base_oof[val], t) / (B.COST_FN * y[val].sum()):.3f}, "
              f"test cost / never {B.expected_cost(yt, base_pt, t) / (B.COST_FN * yt.sum()):.3f}")

    print("\n=== 9. Groups compared (ours: Q1 vs Q5); bottom 40% (Q1+Q2) vs top 40% (Q4+Q5), shared threshold")
    thr = B.best_threshold(y, base_oof)
    for lab, yy, gg, pp in [("2021-24", yv, gv, base_oof[val]), ("test", yt.to_numpy(), g_te, base_pt)]:
        alert = pp >= thr
        out = {}
        for name, members in [("Q1", ["Q1"]), ("Q5", ["Q5"]), ("Q1+Q2", ["Q1", "Q2"]), ("Q4+Q5", ["Q4", "Q5"])]:
            m = np.isin(gg, members)
            out[name] = {"alert rate": alert[m].mean(), "TPR": alert[m & (yy == 1)].mean(), "FPR": alert[m & (yy == 0)].mean()}
        for u, p in [("Q1", "Q5"), ("Q1+Q2", "Q4+Q5")]:
            print(f"  {lab}, {u} vs {p}: disparate impact {out[u]['alert rate'] / out[p]['alert rate']:.3f}, "
                  f"equal opportunity diff. {out[u]['TPR'] - out[p]['TPR']:+.3f}, "
                  f"predictive equality diff. {out[u]['FPR'] - out[p]['FPR']:+.3f}")

    print("\n=== 10. Bootstrap resamples for the fairness intervals (ours: 2,000), 2021-24")
    wv = train["week_end"].to_numpy()[val]
    cols = ["disparate impact ratio (Q1/Q5)", "equal opportunity diff. (TPR Q1-Q5)"]
    for n in [1000, 2000, 5000]:
        b = A.bootstrap_fairness(yv, base_oof[val], gv, wv, thr, n_boot=n)
        print(f"  {n} resamples: " + "; ".join(f"{c} {b[c].quantile(0.025):.3f} to {b[c].quantile(0.975):.3f}" for c in cols))

    print("\n=== 11. Permutation repeats (ours: 10), forest, 2021-24")
    rf1 = clone(rf).set_params(model__n_jobs=1)
    imp = {}
    for n in [10, 20]:
        imp[n] = B.cv_permutation_importance(rf1, X, y, folds, n_repeats=n).set_index("feature")["mean AUC drop"]
    rho = stats.spearmanr(imp[10], imp[20])[0]
    top10, top20 = list(imp[10].sort_values(ascending=False).index[:5]), list(imp[20].sort_values(ascending=False).index[:5])
    print(f"  rank correlation of the 20 importances, 10 vs 20 repeats: {rho:.3f}")
    print(f"  top 5 with 10 repeats: {top10}")
    print(f"  top 5 with 20 repeats: {top20}")

    print("\n=== 12. Run-to-run variation of the fairness results (forest, 2021-24, same seeds as check 3)")
    print("  'weights all 1' changes nothing in principle, but with row weights the forest draws its bootstrap samples")
    print("  in a different way, so it is the fair baseline for reweighing and for Q1 shocks counted twice.")
    rows = []
    variants = [("no weights", None), ("weights all 1", lambda g, yy: np.ones(len(yy))),
                ("reweighing", A.reweighing_weights), ("Q1 shocks x2", A.group_cost_weights)]
    for s in [0, 1, 7, 42, 2024]:
        est = clone(rf).set_params(model__random_state=s)
        for lab, fn in variants:
            oof = A.oof_predict(est, X, y, folds, weight_fn=fn, groups=g_tr)
            t = B.best_threshold(y, oof)
            r = A.group_rates(yv, oof[val], gv, t)
            rows.append({"seed": s, "training": lab, "recall Q1": r.loc["Q1", "TPR (recall)"],
                         "recall Q5": r.loc["Q5", "TPR (recall)"],
                         "EO diff. (Q1-Q5)": r.loc["Q1", "TPR (recall)"] - r.loc["Q5", "TPR (recall)"],
                         "recall range": r["TPR (recall)"].max() - r["TPR (recall)"].min(),
                         "cost / never": B.expected_cost(yv, oof[val], t) / (B.COST_FN * yv.sum())})
    r = pd.DataFrame(rows)
    print(r.round(3).to_string(index=False))
    summ = r.groupby("training", sort=False)[["EO diff. (Q1-Q5)", "recall range", "cost / never"]].agg(["mean", "min", "max"])
    print("\n  Mean, min and max over the five seeds:")
    print(summ.round(3).to_string())

    print(f"\nDone in {(time.time() - t0) / 60:.1f} minutes.")


if __name__ == "__main__":
    main()
