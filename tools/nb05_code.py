"""Code cells of notebooks/05_advanced_models.ipynb, in order. The text cells are in build_m4_notebooks.py."""

SETUP = r'''
import sys
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
import sklearn
from scipy import stats
from sklearn.base import clone
from sklearn.metrics import roc_curve, precision_recall_curve, roc_auc_score
from sklearn.model_selection import cross_val_score
from sklearn.utils.validation import has_fit_parameter
from IPython.display import display

ROOT = Path.cwd()
while not (ROOT / "requirements.txt").exists() and ROOT != ROOT.parent:
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))
from utils.plot_style import apply_style, GROUP_COLORS, SERIES, INK, INK_SECONDARY, GRID
from models import baseline as B      # Milestone 3 code: folds, metrics, thresholds, bootstrap
from models import advanced as A      # Milestone 4 code: new features, ensembles, fairness tools

apply_style()
warnings.filterwarnings("ignore", category=UserWarning)
pd.set_option("display.max_columns", 40)
pd.set_option("display.width", 180)
np.random.seed(A.SEED)

FIG_DIR, TABLE_DIR = ROOT / "reports" / "figures", ROOT / "reports" / "tables"
MODEL_DIR = ROOT / "models" / "m4_advanced"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODELS = A.MODELS
COLORS = {"Logistic regression": SERIES[0], "KNN": SERIES[1], "Decision tree": SERIES[2],
          "Random forest": SERIES[6], "Gradient boosting": SERIES[5], "Persistence": SERIES[3],
          "Majority class": "#9a9893"}


def caption(fig, text, y=-0.02):
    fig.text(0.01, y, text, ha="left", va="top", fontsize=9, color=INK_SECONDARY)


def pct(x, d=1):
    return f"{100 * x:.{d}f}%"
'''

DATA = r'''
df = A.load_model_data()
train, test = B.split_train_test(df)
X, y = train[A.FEATURES], train[A.TARGET]
Xt, yt = test[A.FEATURES], test[A.TARGET]
g_tr, g_te = train["group"].to_numpy(), test["group"].to_numpy()

print(f"Rows: {len(df)} quintile-weeks ({df.attrs['rows_dropped']} dropped, the same rows as in Milestone 3)")
print(f"Train: {train['week_end'].nunique()} weeks, {len(train)} rows, shock rate {pct(y.mean())}")
print(f"Test:  {test['week_end'].nunique()} weeks, {len(test)} rows, shock rate {pct(yt.mean())}")
print(f"Features: {len(A.FEATURES)} (the 18 of Milestone 3 plus {A.NEW_FEATURES})")
'''

NEW_FEATURE_EVIDENCE = r'''
# Do the two new features carry information in the training period alone?
july = train.groupby("july_next_week")[A.TARGET].agg(["mean", "size"]).rename(
    index={0: "next week not in July", 1: "next week in July"}, columns={"mean": "shock rate", "size": "rows"})
bands = pd.cut(train["shock_rate_26w"], [-0.01, 0.10, 0.20, 1.0],
               labels=["below 10%", "10% to 20%", "above 20%"])
rate = train.groupby(bands, observed=True)[A.TARGET].agg(["mean", "size"]).rename(
    columns={"mean": "shock rate", "size": "rows"})
rate.index.name = "shock rate, past 26 weeks"
display(july.round(3))
display(rate.round(3))
print("Correlation of the 26-week shock rate with shocks in the past 4 weeks:",
      round(train["shock_rate_26w"].corr(train["shocks_last_4w"]), 2))
'''

FIG_A1 = r'''
# Figure A1: the 26-week shock rate follows the inflation regime
fig, ax = plt.subplots(figsize=(11, 3.8))
for g in ["Q1", "Q5"]:
    s = df[df["group"] == g]
    ax.plot(s["week_end"], 100 * s["shock_rate_26w"], color=GROUP_COLORS[g], lw=1.8,
            label=f"{g}: share of the past 26 weeks that were shock weeks")
ax.axvspan(test["week_end"].min(), test["week_end"].max(), color=GRID, alpha=0.6, lw=0)
ax.text(test["week_end"].min(), ax.get_ylim()[1] * 0.95, "  test period", color=INK_SECONDARY, va="top")
ax.set(ylabel="shock weeks in past 26 weeks (%)", xlabel="week", ylim=(-2, 75),
       title="Figure A1. The rolling shock rate tracks calm and crisis regimes")
ax.legend(loc="upper left")
caption(fig, "Shock week: weekly SPI rise of at least 1% for the group. The rate uses weeks up to and including week t only, "
             "so it is known when the forecast is made.\nUntil 26 weeks exist, it averages "
             "the weeks available (the smooth start). Source: PBS weekly SPI, Sep 2019 to Sep 2026.", y=-0.03)
fig.savefig(FIG_DIR / "figA1_rolling_shock_rate.png")
plt.show()
'''

FOLDS = r'''
folds = B.time_series_folds(train)
ft = B.fold_table(train, folds)
# Shock rows of each quintile in each validation year: every fold has both classes for every group
per_group = pd.DataFrame({f"shock rows {g}": [int(y.iloc[va][g_tr[va] == g].sum()) for _, va in folds] for g in A.GROUPS})
ft = pd.concat([ft, per_group], axis=1)
display(ft.round(1))
ft.to_csv(TABLE_DIR / "m4_cv_folds.csv", index=False)
for tr, va in folds:
    assert train["week_end"].iloc[tr].max() < train["week_end"].iloc[va].min()
val = np.concatenate([va for _, va in folds])      # rows of the four validation years
print("Every validation year contains shock and calm rows for every quintile:",
      bool((per_group > 0).all().all()))
'''

GRIDS = r'''
models, grids = A.make_models()
for name in MODELS:
    n = int(np.prod([len(v) for v in grids[name].values()]))
    print(f"{name}: {n} settings x {len(folds)} folds = {n * len(folds)} fits")
    for k, v in grids[name].items():
        print(f"    {k.split('__')[-1]:18s} {[type(x).__name__ if hasattr(x, 'fit') else x for x in v]}")
'''

TUNE = r'''
# Grid search for all five learners (takes a few minutes; the random forest is the slowest)
grid_res, fitted, oof = {}, {}, {}
for name in MODELS:
    res, best, oof[name] = A.tune(models[name], grids[name], X, y, folds)
    fitted[name], grid_res[name] = best, res
    res.drop(columns="_params").to_csv(TABLE_DIR / f"m4_cv_grid_{name.lower().replace(' ', '_')}.csv", index=False)
    print(f"\n{name}: top 3 of {len(res)} settings (sorted by within-year AUC)")
    show = [c for c in res.columns if c not in ("_params", "selected", "AUC 1", "AUC 2", "AUC 3", "AUC 4")]
    display(res[show].head(3).round(3))
'''

CV_SUMMARY = r'''
# Selected setting of each learner
rows = []
for name in MODELS:
    top = grid_res[name].iloc[0]
    rows.append({"model": name, "selected setting": ", ".join(f"{k}={v}" for k, v in B._short(top["_params"]).items()),
                 **A.cv_scores(y, oof[name], folds), "train AUC": top["train AUC"]})
cv_m4 = pd.DataFrame(rows).set_index("model")
display(cv_m4.drop(columns="selected setting").round(3))
cv_m4.to_csv(TABLE_DIR / "m4_cv_summary.csv")
# Final model: the highest within-year AUC among the learners that accept training weights, because the
# pre- and in-processing mitigations of notebook 06 retrain the final model with row weights
cv_m4["accepts row weights"] = [has_fit_parameter(fitted[n].named_steps["model"], "sample_weight") for n in MODELS]
FINAL = cv_m4[cv_m4["accepts row weights"]]["within-year AUC"].idxmax()
print("Selected settings:")
for n in MODELS:
    print(f"  {n}: {cv_m4.loc[n, 'selected setting']}")
best_any = cv_m4["within-year AUC"].idxmax()
print(f"\nHighest within-year AUC overall: {best_any} ({cv_m4.loc[best_any, 'within-year AUC']:.3f})")
print(f"Final model (highest within-year AUC among learners that accept row weights): {FINAL} "
      f"({cv_m4.loc[FINAL, 'within-year AUC']:.3f})")
'''

FIG_A2 = r'''
# Figure A2: validation curves of the two ensembles (one hyperparameter varied, the others at their selected values)
def same(col, v):
    # numbers are compared as numbers (5 and 5.0 are equal), None as missing, text as text
    if v is None:
        return col.isna()
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return (pd.to_numeric(col, errors="coerce") - float(v)).abs() < 1e-9
    return col.astype(str) == str(v)

def curve(name, xparam, fixed):
    r = grid_res[name].copy()
    for k, v in fixed.items():
        r = r[same(r[k], v)]
    return r.sort_values(xparam, key=lambda s: pd.to_numeric(s, errors="coerce").fillna(99))

sel = {n: B._short(grid_res[n].iloc[0]["_params"]) for n in A.ENSEMBLES}
specs = [("Random forest", "max_depth", "maximum depth of each tree (none = grown fully)"),
         ("Random forest", "min_samples_leaf", "minimum rows in a leaf"),
         ("Gradient boosting", "learning_rate", "learning rate (shrinkage of each new tree)"),
         ("Gradient boosting", "min_samples_leaf", "minimum rows in a leaf")]
fig, axes = plt.subplots(1, 4, figsize=(14, 3.8), sharey=True)
for ax, (name, xp, xlabel) in zip(axes, specs):
    c = curve(name, xp, {k: v for k, v in sel[name].items() if k != xp})
    xs = c[xp].fillna(-1).astype(float).to_numpy()
    lab = ["none" if v == -1 else (f"{v:g}") for v in xs]
    pos = np.arange(len(xs))
    ax.plot(pos, c["train AUC"], ls="--", color=COLORS[name], lw=1.5, label="training weeks")
    ax.plot(pos, c["within-year AUC"], color=COLORS[name], lw=2.2, label="validation years (within-year)")
    ax.fill_between(pos, c["within-year AUC"] - c["within-year SD"], c["within-year AUC"] + c["within-year SD"],
                    color=COLORS[name], alpha=0.12, lw=0)
    ax.plot(pos, c["pooled AUC"], color=INK_SECONDARY, lw=1.2, ls=":", label="validation years (pooled)")
    chosen = list(xs).index(-1 if sel[name][xp] is None else float(sel[name][xp]))
    ax.axvline(chosen, color=INK_SECONDARY, lw=0.8, ls=":")
    ax.set_xticks(pos, lab)
    ax.set(xlabel=xlabel, title=name)
axes[0].set_ylabel("ROC-AUC")
axes[0].legend(loc="lower left", fontsize=8)
fig.suptitle("Figure A2. Validation curves of the random forest and gradient boosting", x=0.01, ha="left",
             fontweight="bold", color=INK, y=1.03)
caption(fig, "Solid: mean of the four per-year validation AUCs (selection criterion); band: plus or minus one SD across years; "
             "dashed: AUC on each fold's own training weeks; dotted line: pooled AUC; vertical line: selected value.", y=-0.04)
fig.savefig(FIG_DIR / "figA2_validation_curves_ensembles.png")
plt.show()
'''

M3_LOAD = r'''
# The Milestone 3 baselines exactly as submitted: same 18 features, same settings and thresholds
card3 = json.loads((ROOT / "models" / "m3_baselines" / "model_card.json").read_text(encoding="utf-8"))
M3 = ["Logistic regression", "KNN", "Decision tree"]
m3_fit = {n: joblib.load(ROOT / "models" / "m3_baselines" / (n.lower().replace(" ", "_") + ".joblib")) for n in M3}
m3_thr = {n: card3["models"][n]["threshold"] for n in M3}
X3, Xt3 = train[B.FEATURES], test[B.FEATURES]
m3_oof = {n: B.oof_predict(m3_fit[n], X3, y, folds) for n in M3}
m3_test = {n: m3_fit[n].predict_proba(Xt3)[:, 1] for n in M3}
pers = B.Persistence().fit(X3, y)
m3_oof["Persistence"], m3_test["Persistence"] = B.oof_predict(pers, X3, y, folds), pers.predict_proba(Xt3)[:, 1]
m3_thr["Persistence"] = 0.5
for n in M3:
    assert abs(roc_auc_score(y[val], m3_oof[n][val]) - card3["models"][n]["pooled_cv_auc"]) < 1e-9
print("M3 baselines reproduce their submitted pooled CV AUCs exactly.")
'''

COMPARE = r'''
# One table: M3 baselines (as submitted) against the five learners under the M4 protocol
thr = {n: B.best_threshold(y, oof[n]) for n in MODELS}            # cost 5:1 on 2021-24 out-of-fold predictions
p_test = {n: fitted[n].predict_proba(Xt)[:, 1] for n in MODELS}
entries = [(f"M3 {n}", m3_oof[n], m3_test[n], m3_thr[n]) for n in M3 + ["Persistence"]] + \
          [(f"M4 {n}", oof[n], p_test[n], thr[n]) for n in MODELS]
never_val, never_test = B.COST_FN * y[val].sum(), B.COST_FN * yt.sum()
rows = []
for lab, po, pt, t in entries:
    cv = A.cv_scores(y, po, folds)
    m = B.classification_metrics(yt, pt, t)
    rows.append({"model": lab, "CV within-year AUC": cv["within-year AUC"], "CV pooled AUC": cv["pooled AUC"],
                 "CV PR-AUC": cv["pooled PR-AUC"], "CV Brier": cv["pooled Brier"], "threshold": t,
                 "test accuracy": m["accuracy"], "test precision": m["precision"], "test recall": m["recall"],
                 "test F1": m["F1"], "test ROC-AUC": m["ROC-AUC"], "test PR-AUC": m["PR-AUC"], "test Brier": m["Brier"],
                 "CV cost / never": B.expected_cost(y[val], po[val], t) / never_val,
                 "test cost / never": m["cost"] / never_test})
comp = pd.DataFrame(rows).set_index("model")
display(comp.round(3))
comp.to_csv(TABLE_DIR / "m4_model_comparison.csv")
'''

BOOT = r'''
# Uncertainty on the test period: 2,000 bootstrap resamples of whole test weeks
scores = {f"M4 {n}": p_test[n] for n in MODELS}
scores.update({f"M3 {n}": m3_test[n] for n in M3})
boot = B.week_block_bootstrap(yt, scores, test["week_end"])
ci = pd.DataFrame({"test AUC": [comp.loc[k, "test ROC-AUC"] for k in boot.columns],
                   "95% CI low": boot.quantile(0.025).values, "95% CI high": boot.quantile(0.975).values},
                  index=boot.columns)
display(ci.round(3))
ref = "M3 KNN"                                  # the best M3 baseline on the test period
gain = []
for n in MODELS:
    d = boot[f"M4 {n}"] - boot[ref]
    gain.append({"comparison": f"M4 {n} minus {ref}", "AUC difference": comp.loc[f"M4 {n}", "test ROC-AUC"] - comp.loc[ref, "test ROC-AUC"],
                 "95% CI low": d.quantile(0.025), "95% CI high": d.quantile(0.975), "share of resamples <= 0": (d <= 0).mean()})
gain = pd.DataFrame(gain).set_index("comparison")
display(gain.round(3))
ci.to_csv(TABLE_DIR / "m4_test_auc_ci.csv")
gain.to_csv(TABLE_DIR / "m4_test_auc_gain_vs_m3.csv")
'''

ABLATION = r'''
# Where does the change come from? The final model's setting, retrained with and without the new features
final_params = grid_res[FINAL].iloc[0]["_params"]
variants = {"18 features of M3": B.FEATURES,
            "+ shock rate, past 26 weeks": B.FEATURES + ["shock_rate_26w"],
            "+ next week in July": B.FEATURES + ["july_next_week"],
            "+ both (M4 features)": A.FEATURES}
rows = []
for lab, cols in variants.items():
    est = clone(models[FINAL]).set_params(**final_params)
    po = A.oof_predict(est, train[cols], y, folds)
    m = clone(est).fit(train[cols], y)
    pt = m.predict_proba(test[cols])[:, 1]
    t = B.best_threshold(y, po)
    rows.append({"features": lab, **{k: v for k, v in A.cv_scores(y, po, folds).items() if not k.startswith("AUC ")},
                 "test ROC-AUC": roc_auc_score(yt, pt), "test Brier": B.classification_metrics(yt, pt, t)["Brier"],
                 "test cost / never": B.expected_cost(yt, pt, t) / never_test})
ablation = pd.DataFrame(rows).set_index("features")
display(ablation.round(3))
ablation.to_csv(TABLE_DIR / "m4_feature_ablation.csv")
'''

FIG_A3 = r'''
# Figure A3: ROC and precision-recall curves on the test period, M4 learners against the best M3 baseline
fig, (a1, a2) = plt.subplots(1, 2, figsize=(11, 4.6))
curves = [(f"M4 {n}", p_test[n], COLORS[n], "-", 2.2 if n in A.ENSEMBLES else 1.2) for n in MODELS] + \
         [("M3 KNN (as submitted)", m3_test["KNN"], INK_SECONDARY, "--", 1.6)]
for lab, pt, col, ls, lw in curves:
    fpr, tpr, _ = roc_curve(yt, pt)
    a1.plot(fpr, tpr, color=col, ls=ls, lw=lw, label=f"{lab} (AUC {roc_auc_score(yt, pt):.2f})")
    pr, rc, _ = precision_recall_curve(yt, pt)
    a2.plot(rc, pr, color=col, ls=ls, lw=lw, label=lab)
for n in [FINAL]:
    mm = B.classification_metrics(yt, p_test[n], thr[n])
    fpr_pt = mm["FP"] / (mm["FP"] + mm["TN"])
    a1.scatter(fpr_pt, mm["recall"], color=COLORS[n], s=50, zorder=5, edgecolor=INK)
    a2.scatter(mm["recall"], mm["precision"], color=COLORS[n], s=50, zorder=5, edgecolor=INK)
a1.plot([0, 1], [0, 1], color=GRID, lw=1)
a2.axhline(yt.mean(), color=GRID, lw=1)
a1.set(xlabel="false-positive rate (share of calm rows alarmed)", ylabel="true-positive rate (recall)",
       title="ROC curve, test 2025-26")
a2.set(xlabel="recall (share of shocks caught)", ylabel="precision (share of alarms that were right)",
       title="Precision-recall curve, test 2025-26")
a1.legend(loc="lower right", fontsize=8)
fig.suptitle("Figure A3. Test-period ranking skill of the M4 learners and the best M3 baseline", x=0.01, ha="left",
             fontweight="bold", color=INK, y=1.02)
caption(fig, f"455 quintile-weeks, 35 followed by a shock. Dot: the final model ({FINAL}) at its threshold chosen on 2021-24. "
             "Grey lines: no skill (diagonal; shock rate 7.7%).", y=-0.03)
fig.savefig(FIG_DIR / "figA3_roc_pr_test.png")
plt.show()
'''

LEAKAGE = r'''
# Leakage check: what would shuffled stratified K-fold have reported for the two ensembles?
designs = {"Shuffled stratified K-fold (rows)": B.random_folds(train),
           "Shuffled stratified K-fold (whole weeks)": B.random_folds(train, by_week=True),
           "Expanding window by year (ours)": folds}
rows = []
for name in A.ENSEMBLES:
    for d, f in designs.items():
        s = cross_val_score(fitted[name], X, y, cv=f, scoring="roc_auc")
        rows.append({"model": name, "CV design": d, "mean fold AUC": s.mean(), "fold AUC SD": s.std()})
leak = pd.DataFrame(rows).pivot(index="model", columns="CV design", values="mean fold AUC")[list(designs)]
display(leak.round(3))
leak.to_csv(TABLE_DIR / "m4_cv_design_comparison.csv")
'''

THRESHOLD_CURVES = r'''
# Threshold curves of the final model: precision, recall, F1 and expected cost at every cut-off
grid_t = np.round(np.arange(0.01, 1.0, 0.01), 2)
def sweep(yy, pp):
    out = []
    for t in grid_t:
        m = B.classification_metrics(yy, pp, t)
        out.append({"threshold": t, "precision": m["precision"], "recall": m["recall"], "F1": m["F1"],
                    "alert rate": m["alerts"] / len(yy), "cost / never": m["cost"] / (B.COST_FN * np.sum(yy))})
    return pd.DataFrame(out)
sw_val, sw_test = sweep(y[val].to_numpy(), oof[FINAL][val]), sweep(yt.to_numpy(), p_test[FINAL])
sw_val.to_csv(TABLE_DIR / "m4_threshold_curve_oof.csv", index=False)
sw_test.to_csv(TABLE_DIR / "m4_threshold_curve_test.csv", index=False)

fig, axes = plt.subplots(1, 2, figsize=(12, 4.2), sharex=True)
for ax, sw, lab in [(axes[0], sw_val, "validation years 2021-24 (out-of-fold)"), (axes[1], sw_test, "test 2025-26")]:
    ax.plot(sw["threshold"], sw["recall"], color=SERIES[0], label="recall")
    ax.plot(sw["threshold"], sw["precision"], color=SERIES[1], label="precision")
    ax.plot(sw["threshold"], sw["F1"], color=SERIES[2], label="F1")
    ax.plot(sw["threshold"], sw["cost / never"], color=INK, lw=1.6, ls="--", label="cost relative to never alerting")
    ax.axvline(thr[FINAL], color=INK_SECONDARY, lw=0.9, ls=":")
    ax.axhline(1, color=GRID, lw=1)
    ax.set(xlabel="alarm threshold (alert if predicted probability >= threshold)", title=lab, ylim=(0, 1.6))
axes[0].set_ylabel("rate, or cost ratio")
axes[0].legend(loc="upper right", fontsize=8)
fig.suptitle(f"Figure A4. Threshold curves of the final model ({FINAL})", x=0.01, ha="left", fontweight="bold",
             color=INK, y=1.03)
caption(fig, f"Cost: 1 per false alarm, 5 per missed shock, divided by the cost of never alerting (below 1 = better than doing nothing). "
             f"Dotted line: threshold {thr[FINAL]:.2f}, chosen on the validation years only.", y=-0.03)
fig.savefig(FIG_DIR / "figA4_threshold_curves.png")
plt.show()
'''

COST_RATIOS = r'''
# Sensitivity to the cost ratio: threshold re-chosen on 2021-24 for each ratio, then scored on the test period
rows = []
for r in B.COST_RATIOS:
    triv_oof, triv_test = B.trivial_policy_costs(y[val], 1, r), B.trivial_policy_costs(yt, 1, r)
    for lab, po, pt in [(f"M4 {FINAL}", oof[FINAL], p_test[FINAL]), ("M3 KNN", m3_oof["KNN"], m3_test["KNN"])]:
        t = B.best_threshold(y, po, 1, r)
        rows.append({"FN : FP": f"{r} : 1", "model": lab, "threshold": t,
                     "2021-24 cost / cheaper trivial": B.expected_cost(y[val], po[val], t, 1, r) / min(triv_oof.values()),
                     "test cost / cheaper trivial": B.expected_cost(yt, pt, t, 1, r) / min(triv_test.values())})
ratios = pd.DataFrame(rows)
display(ratios.pivot(index="FN : FP", columns="model",
                     values=["threshold", "2021-24 cost / cheaper trivial", "test cost / cheaper trivial"])
        .reindex([f"{r} : 1" for r in B.COST_RATIOS]).round(2))
ratios.to_csv(TABLE_DIR / "m4_cost_ratio_sensitivity.csv", index=False)
'''

CALIBRATION = r'''
# Calibration: do predicted probabilities match observed shock rates? (Figure A5)
def reliability(yy, pp, bins=8):
    q = pd.qcut(pp, bins, duplicates="drop")
    return pd.DataFrame({"mean predicted": pd.Series(pp).groupby(q, observed=True).mean().values,
                         "observed shock rate": pd.Series(np.asarray(yy)).groupby(q, observed=True).mean().values,
                         "rows": pd.Series(pp).groupby(q, observed=True).size().values})

fig, axes = plt.subplots(1, 2, figsize=(10.5, 4.3), sharey=True)
cal_rows = []
for ax, (lab, yy, sets) in zip(axes, [("validation years 2021-24", y[val].to_numpy(), {n: oof[n][val] for n in MODELS}),
                                      ("test 2025-26", yt.to_numpy(), p_test)]):
    for n in MODELS:
        r = reliability(yy, sets[n])
        ax.plot(r["mean predicted"], r["observed shock rate"], marker="o", ms=4, color=COLORS[n],
                lw=2.2 if n == FINAL else 1.0, alpha=1 if n == FINAL else 0.6, label=n)
        cal_rows.append({"period": lab, "model": n, "Brier": np.mean((sets[n] - yy) ** 2),
                         "Brier of the base rate": np.mean((y.mean() - yy) ** 2),
                         "mean predicted": sets[n].mean(), "observed rate": yy.mean()})
    ax.plot([0, 0.7], [0, 0.7], color=GRID, lw=1)
    ax.set(xlabel="mean predicted probability (8 equal-count bins)", title=lab, xlim=(0, 0.75), ylim=(0, 0.75))
axes[0].set_ylabel("observed shock rate in the bin")
axes[0].legend(fontsize=8, loc="upper left")
fig.suptitle("Figure A5. Calibration of the predicted probabilities", x=0.01, ha="left", fontweight="bold", color=INK, y=1.03)
caption(fig, "A calibrated model lies on the diagonal: among rows given about 20%, about 20% are followed by a shock. "
             "Thick line: final model.", y=-0.03)
fig.savefig(FIG_DIR / "figA5_calibration.png")
plt.show()
cal = pd.DataFrame(cal_rows)
display(cal.pivot(index="model", columns="period", values=["Brier", "mean predicted"]).round(3))
print("Observed shock rate: validation years", round(y[val].mean(), 3), "| test", round(yt.mean(), 3))
cal.to_csv(TABLE_DIR / "m4_calibration.csv", index=False)
'''

H4_TEST = r'''
# H4 in sample: pooled logit for Q1 and Q5 with signal x Q5 interactions (training period)
q15 = train[train["group"].isin(["Q1", "Q5"])].copy()
q15["grp_Q5"] = (q15["group"] == "Q5").astype(int)
inter = []
for s in B.SIGNALS:
    q15[f"{s} x Q5"] = q15[s] * q15["grp_Q5"]
    inter.append(f"{s} x Q5")
base_cols = B.OWN_HISTORY + B.SIGNALS + B.CONTROLS + ["grp_Q5"]
q15r = q15.rename(columns={c: c.replace(" x ", "_x_") for c in inter})   # names the Wald test can parse
inter_r = [c.replace(" x ", "_x_") for c in inter]
h4_base = B.fit_logit(q15r, base_cols)
h4_full = B.fit_logit(q15r, base_cols + inter_r)
lr_stat = 2 * (h4_full.llf - h4_base.llf)
wald = h4_full.wald_test(", ".join(f"{c} = 0" for c in inter_r), scalar=True)
print(f"H4 likelihood-ratio test: chi2({len(inter_r)}) = {lr_stat:.2f}, p = {stats.chi2.sf(lr_stat, len(inter_r)):.3f}  (rows treated as independent)")
print(f"H4 Wald test, week-clustered: chi2({len(inter_r)}) = {float(wald.statistic):.2f}, p = {float(wald.pvalue):.3f}")
h4_tab = pd.DataFrame({"interaction (signal x Q5)": [B.LABELS[s] for s in B.SIGNALS],
                       "coefficient": h4_full.params[inter_r].values, "p-value": h4_full.pvalues[inter_r].values})
display(h4_tab.round(3))

# Exploratory (not pre-stated): component momentum x Q5, the M2 evidence named utility and fuel momentum
q15r2 = q15r.copy()
comp_inter = []
for c in B.COMPONENTS:
    q15r2[f"{c}_x_Q5"] = q15r2[c] * q15r2["grp_Q5"]
    comp_inter.append(f"{c}_x_Q5")
cols_c = B.OWN_HISTORY + B.SIGNALS + B.COMPONENTS + B.CONTROLS + ["grp_Q5"]
h4c = B.fit_logit(q15r2, cols_c + comp_inter)
wald_c = h4c.wald_test(", ".join(f"{c} = 0" for c in comp_inter), scalar=True)
print(f"Exploratory: component x Q5 interactions, week-clustered Wald chi2(3) = {float(wald_c.statistic):.2f}, p = {float(wald_c.pvalue):.3f}")
display(pd.DataFrame({"interaction": [B.LABELS[c] + " x Q5" for c in B.COMPONENTS],
                      "coefficient": h4c.params[comp_inter].values, "p-value": h4c.pvalues[comp_inter].values}).round(3))
pd.DataFrame([{"test": "LR (independent rows)", "chi2": lr_stat, "df": len(inter_r), "p": stats.chi2.sf(lr_stat, len(inter_r))},
              {"test": "Wald (week-clustered)", "chi2": float(wald.statistic), "df": len(inter_r), "p": float(wald.pvalue)},
              {"test": "Wald, component x Q5 (exploratory)", "chi2": float(wald_c.statistic), "df": 3, "p": float(wald_c.pvalue)}]
             ).to_csv(TABLE_DIR / "m4_h4_tests.csv", index=False)
h4_tab.to_csv(TABLE_DIR / "m4_h4_interactions.csv", index=False)
'''

H4_OOS = r'''
# H4 out of sample: one pooled model for all quintiles against a separate model for each quintile
rows = []
est = clone(fitted[FINAL])
if "n_jobs" in est.named_steps["model"].get_params():
    est.set_params(model__n_jobs=1)      # small per-quintile fits run faster on one core
pooled_oof, pooled_test = oof[FINAL], p_test[FINAL]
for g in A.GROUPS:
    mtr, mte = g_tr == g, g_te == g
    tr_g = train[mtr].reset_index(drop=True)
    folds_g = B.time_series_folds(tr_g)
    sep_oof = A.oof_predict(est, tr_g[A.FEATURES], tr_g[A.TARGET], folds_g)
    sep_test = clone(est).fit(tr_g[A.FEATURES], tr_g[A.TARGET]).predict_proba(test[mte][A.FEATURES])[:, 1]
    va_g = np.concatenate([va for _, va in folds_g])
    per_pooled = [roc_auc_score(y[mtr].iloc[va], pooled_oof[mtr][va]) for _, va in folds_g]
    per_sep = [roc_auc_score(tr_g[A.TARGET].iloc[va], sep_oof[va]) for _, va in folds_g]
    rows.append({"group": g, "within-year AUC, pooled model": np.mean(per_pooled),
                 "within-year AUC, own model": np.mean(per_sep),
                 "test AUC, pooled model": roc_auc_score(yt[mte], pooled_test[mte]),
                 "test AUC, own model": roc_auc_score(yt[mte], sep_test)})
h4_oos = pd.DataFrame(rows).set_index("group")
display(h4_oos.round(3))
h4_oos.to_csv(TABLE_DIR / "m4_h4_pooled_vs_own.csv")
'''

IMPORTANCE = r'''
# Permutation importance on the validation years (the test period is not used), for both ensembles.
# one_core() runs the forest on a single core: for a few hundred rows that is faster than starting parallel workers
def one_core(est):
    return clone(est).set_params(model__n_jobs=1) if "n_jobs" in est.named_steps["model"].get_params() else est

imp = {}
for n in A.ENSEMBLES:
    imp[n] = B.cv_permutation_importance(one_core(fitted[n]), X, y, folds, n_repeats=10).set_index("feature")
imp_tab = pd.DataFrame({f"{n} AUC drop": imp[n]["mean AUC drop"] for n in A.ENSEMBLES})
imp_tab["mean"] = imp_tab.mean(axis=1)
imp_tab = imp_tab.sort_values("mean", ascending=False)
imp_tab.insert(0, "feature", [A.LABELS[f] for f in imp_tab.index])
display(imp_tab.round(4).head(10))
imp_tab.to_csv(TABLE_DIR / "m4_permutation_importance.csv")

# The same measure for the final model, separately on Q1 rows and on Q5 rows of the validation years
def perm_by_group(est, g, n_repeats=10):
    drops = []
    for tr, va in folds:
        m = clone(est).fit(X.iloc[tr], y.iloc[tr])
        vg = va[g_tr[va] == g]
        r = sklearn.inspection.permutation_importance(m, X.iloc[vg], y.iloc[vg], scoring="roc_auc",
                                                      n_repeats=n_repeats, random_state=A.SEED)
        drops.append(r.importances_mean)
    return pd.Series(np.mean(drops, axis=0), index=A.FEATURES)
import sklearn.inspection
imp_g = pd.DataFrame({g: perm_by_group(one_core(fitted[FINAL]), g) for g in ["Q1", "Q5"]})
imp_g.insert(0, "feature", [A.LABELS[f] for f in imp_g.index])
imp_g = imp_g.loc[imp_tab.index]
display(imp_g.round(4).head(10))
imp_g.to_csv(TABLE_DIR / "m4_permutation_importance_q1_q5.csv")
'''

FIG_A6 = r'''
# Figure A6: what drives the forecasts, overall and for the poorest and richest quintiles
top = imp_tab.index[:12][::-1]
yy = np.arange(len(top))
fig, axes = plt.subplots(1, 2, figsize=(12.5, 5.2), sharey=True)
ax = axes[0]
for k, n in enumerate(A.ENSEMBLES):
    ax.barh(yy + (k - 0.5) * 0.38, imp_tab.loc[top, f"{n} AUC drop"], height=0.38, color=COLORS[n], label=n)
ax.set_yticks(yy, [A.LABELS[f] for f in top])
ax.axvline(0, color=INK_SECONDARY, lw=0.8)
ax.set(xlabel="drop in validation AUC when the feature is shuffled", title="Both ensembles, all quintiles")
ax.legend(loc="lower right", fontsize=8)
ax = axes[1]
for k, g in enumerate(["Q1", "Q5"]):
    ax.barh(yy + (k - 0.5) * 0.38, imp_g.loc[top, g], height=0.38, color=GROUP_COLORS[g], label=f"{g} rows")
ax.axvline(0, color=INK_SECONDARY, lw=0.8)
ax.set(xlabel="drop in validation AUC when the feature is shuffled", title=f"{FINAL}, Q1 rows against Q5 rows")
ax.legend(loc="lower right", fontsize=8)
fig.suptitle("Figure A6. Permutation importance on the validation years 2021-24", x=0.01, ha="left",
             fontweight="bold", color=INK, y=1.02)
caption(fig, "Mean over four validation years and 10 random shuffles. The twelve features with the largest mean drop "
             "across both ensembles are shown. The test period is not used.", y=-0.03)
fig.savefig(FIG_DIR / "figA6_feature_importance.png")
plt.show()
'''

SAVE = r'''
# Save the five fitted pipelines, the out-of-fold and test predictions (used by notebook 06) and a model card
for n in MODELS:
    joblib.dump(fitted[n], MODEL_DIR / (n.lower().replace(" ", "_") + ".joblib"))
pred_oof = train[["week_end", "group", A.TARGET]].copy()
pred_test = test[["week_end", "group", A.TARGET]].copy()
for n in MODELS:
    pred_oof[n], pred_test[n] = oof[n], p_test[n]
pred_oof.to_csv(MODEL_DIR / "oof_predictions.csv", index=False)
pred_test.to_csv(MODEL_DIR / "test_predictions.csv", index=False)
card = {"features": A.FEATURES, "train_end": str(B.TRAIN_END.date()), "validation_years": B.VAL_YEARS,
        "selection": "within-year AUC (mean of the four per-fold ROC-AUCs)", "final_model": FINAL,
        "cost_fp": B.COST_FP, "cost_fn": B.COST_FN, "sklearn_version": sklearn.__version__,
        "models": {n: {"params": B._short(grid_res[n].iloc[0]["_params"]), "threshold": thr[n],
                       **{k: float(v) for k, v in A.cv_scores(y, oof[n], folds).items()}} for n in MODELS}}
(MODEL_DIR / "model_card.json").write_text(json.dumps(card, indent=2, default=str), encoding="utf-8")
print("Saved to", MODEL_DIR.relative_to(ROOT), sorted(p.name for p in MODEL_DIR.iterdir()))
'''
