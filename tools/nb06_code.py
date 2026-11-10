"""Code cells of notebooks/06_fairness_audit.ipynb, in order. The text cells are in build_m4_notebooks.py."""

SETUP = r'''
import sys
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib
from sklearn.base import clone
from IPython.display import display

ROOT = Path.cwd()
while not (ROOT / "requirements.txt").exists() and ROOT != ROOT.parent:
    ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "src"))
from utils.plot_style import apply_style, GROUP_COLORS, SERIES, INK, INK_SECONDARY, GRID
from models import baseline as B
from models import advanced as A
from features.build_features import component

apply_style()
warnings.filterwarnings("ignore", category=UserWarning)
pd.set_option("display.max_columns", 40)
pd.set_option("display.width", 180)
np.random.seed(A.SEED)

FIG_DIR, TABLE_DIR = ROOT / "reports" / "figures", ROOT / "reports" / "tables"
MODEL_DIR = ROOT / "models" / "m4_advanced"
GROUPS = A.GROUPS
COLORS = {"Logistic regression": SERIES[0], "KNN": SERIES[1], "Decision tree": SERIES[2],
          "Random forest": SERIES[6], "Gradient boosting": SERIES[5]}


def caption(fig, text, y=-0.02):
    fig.text(0.01, y, text, ha="left", va="top", fontsize=9, color=INK_SECONDARY)
'''

LOAD = r'''
# Data, folds and the models of notebook 05 (run notebook 05 first)
df = A.load_model_data()
train, test = B.split_train_test(df)
X, y = train[A.FEATURES], train[A.TARGET]
Xt, yt = test[A.FEATURES], test[A.TARGET]
g_tr, g_te = train["group"].to_numpy(), test["group"].to_numpy()
folds = B.time_series_folds(train)
val = np.concatenate([va for _, va in folds])
yv, gv, wv = y.to_numpy()[val], g_tr[val], train["week_end"].to_numpy()[val]

card = json.loads((MODEL_DIR / "model_card.json").read_text(encoding="utf-8"))
FINAL = card["final_model"]
fitted = {n: joblib.load(MODEL_DIR / (n.lower().replace(" ", "_") + ".joblib")) for n in A.MODELS}
thr = {n: card["models"][n]["threshold"] for n in A.MODELS}
pred_oof = pd.read_csv(MODEL_DIR / "oof_predictions.csv", parse_dates=["week_end"])
pred_test = pd.read_csv(MODEL_DIR / "test_predictions.csv", parse_dates=["week_end"])
assert (pred_oof["week_end"].values == train["week_end"].values).all() and (pred_oof["group"].values == g_tr).all()
oof = {n: pred_oof[n].to_numpy() for n in A.MODELS}
p_test = {n: pred_test[n].to_numpy() for n in A.MODELS}
print(f"Final model: {FINAL}, threshold {thr[FINAL]} (chosen in notebook 05 on 2021-24 out-of-fold predictions)")
print(f"Audit data: {len(val)} validation rows (2021-24) and {len(test)} test rows (2025-26)")
'''

BASE_RATES = r'''
# Shock rates by quintile: the true positive rate of each group in the data
br = []
for lab, yy, gg in [("training 2019-24", y.to_numpy(), g_tr), ("validation years 2021-24", yv, gv),
                    ("test 2025-26", yt.to_numpy(), g_te)]:
    for g in GROUPS:
        m = gg == g
        br.append({"period": lab, "group": g, "rows": int(m.sum()), "shock rows": int(yy[m].sum()),
                   "shock rate": yy[m].mean()})
br = pd.DataFrame(br)
display(br.pivot(index="group", columns="period", values=["shock rows", "shock rate"]).round(3))
br.to_csv(TABLE_DIR / "m4_base_rates_by_group.csv", index=False)
w = train.pivot(index="week_end", columns="group", values=A.TARGET)
print(f"Training weeks followed by a shock in at least one quintile: {(w.sum(axis=1) > 0).sum()}; "
      f"in all five: {(w.sum(axis=1) == 5).sum()}; in Q1 but not Q5: {((w['Q1'] == 1) & (w['Q5'] == 0)).sum()}; "
      f"in Q5 but not Q1: {((w['Q5'] == 1) & (w['Q1'] == 0)).sum()}")
'''

AUDIT_ALL = r'''
# Group fairness metrics of every M4 learner at its own threshold, validation years and test period
rows, rates_store = [], {}
for period, yy, gg, preds in [("2021-24 (out-of-fold)", yv, gv, {n: oof[n][val] for n in A.MODELS}),
                              ("test 2025-26", yt.to_numpy(), g_te, p_test)]:
    for n in A.MODELS:
        r = A.group_rates(yy, preds[n], gg, thr[n])
        rates_store[(period, n)] = r
        rows.append({"period": period, "model": n, **A.fairness_summary(r)})
audit = pd.DataFrame(rows).set_index(["period", "model"])
cols = ["disparate impact ratio (Q1/Q5)", "equal opportunity diff. (TPR Q1-Q5)",
        "predictive equality diff. (FPR Q1-Q5)", "equalized odds gap (Q1 vs Q5)",
        "min/max alert-rate ratio (all groups)", "TPR range (all groups)", "FPR range (all groups)"]
display(audit[cols].round(3))
audit.to_csv(TABLE_DIR / "m4_fairness_all_models.csv")
print("80% rule (disparate impact ratio below 0.8 or above 1.25):")
print(audit["disparate impact ratio (Q1/Q5)"].apply(lambda v: "violated" if (v < 0.8 or v > 1.25) else "met").unstack(0))
'''

AUDIT_FINAL = r'''
# The final model in detail: rates for each quintile
for period in ["2021-24 (out-of-fold)", "test 2025-26"]:
    print(f"{FINAL}, {period}, threshold {thr[FINAL]}")
    display(rates_store[(period, FINAL)][["rows", "shock rows", "shock rate", "alert rate", "TPR (recall)", "FPR",
                                          "precision", "Brier", "ROC-AUC"]].round(3))
pd.concat({p: rates_store[(p, FINAL)] for p in ["2021-24 (out-of-fold)", "test 2025-26"]}).to_csv(
    TABLE_DIR / "m4_final_rates_by_group.csv")
'''

BOOT_FAIR = r'''
# Uncertainty: week-block bootstrap of the fairness metrics of the final model (2,000 resamples of whole weeks)
bf = {}
for period, yy, gg, pp, ww in [("2021-24 (out-of-fold)", yv, gv, oof[FINAL][val], wv),
                               ("test 2025-26", yt.to_numpy(), g_te, p_test[FINAL], test["week_end"].to_numpy())]:
    b = A.bootstrap_fairness(yy, pp, gg, ww, thr[FINAL])
    point = A.fairness_summary(A.group_rates(yy, pp, gg, thr[FINAL]))
    bf[period] = pd.DataFrame({"estimate": pd.Series(point)[cols], "95% CI low": b[cols].quantile(0.025),
                               "95% CI high": b[cols].quantile(0.975), "resamples": len(b)})
bf = pd.concat(bf)
display(bf.round(3))
bf.to_csv(TABLE_DIR / "m4_fairness_bootstrap_final.csv")
'''

H5 = r'''
# H5: is the final model less accurate for Q1 than for Q5? Brier loss per week, Diebold-Mariano test
def weekly_loss(frame, p, g):
    m = (frame["group"] == g).to_numpy()
    return pd.Series((p[m] - frame[A.TARGET].to_numpy()[m]) ** 2, index=frame["week_end"].to_numpy()[m])

rows = []
tr_val = train.iloc[val]
for period, frame, pp in [("2021-24 (out-of-fold)", tr_val, oof[FINAL][val]), ("test 2025-26", test, p_test[FINAL])]:
    l1, l5 = weekly_loss(frame, pp, "Q1"), weekly_loss(frame, pp, "Q5")
    assert (l1.index == l5.index).all()
    for lags in [4]:
        dm = A.diebold_mariano(l1.values, l5.values, lags=lags)
        rows.append({"period": period, "Brier Q1": l1.mean(), "Brier Q5": l5.mean(), **dm})
h5 = pd.DataFrame(rows).set_index("period")
display(h5.round(4))
h5.to_csv(TABLE_DIR / "m4_h5_diebold_mariano.csv")

# Robustness: other lag lengths for the HAC variance, and the same test for every M4 learner (2021-24)
rob = []
l1, l5 = weekly_loss(tr_val, oof[FINAL][val], "Q1"), weekly_loss(tr_val, oof[FINAL][val], "Q5")
for lags in [1, 2, 4, 8, 13]:
    rob.append({"lags": lags, **A.diebold_mariano(l1.values, l5.values, lags=lags)})
display(pd.DataFrame(rob).set_index("lags")[["mean diff", "HAC SE", "t", "p (one-sided)"]].round(4))
rows = []
for n in A.MODELS:
    a, b = weekly_loss(tr_val, oof[n][val], "Q1"), weekly_loss(tr_val, oof[n][val], "Q5")
    rows.append({"model": n, "Brier Q1": a.mean(), "Brier Q5": b.mean(), **A.diebold_mariano(a.values, b.values)})
display(pd.DataFrame(rows).set_index("model")[["Brier Q1", "Brier Q5", "mean diff", "t", "p (one-sided)"]].round(4))
'''

DRIVERS = r'''
# Where does a disparity come from? Label every shock by the price component that drove it that week
items = pd.read_csv(ROOT / "data" / "processed" / "items_weekly_panel.csv", parse_dates=["week_end"])
items["component"] = [component(i, c) for i, c in zip(items["item_id"], items["category"])]
items["impact"] = items["impact_combined"].fillna(items["weight_combined"] * items["price_wow_pct"] / 100)
items = items.dropna(subset=["impact"])          # the first week has no previous price, so no impact
driver = items.loc[items.groupby("week_end")["impact"].idxmax(), ["week_end", "component"]].set_index("week_end")["component"]
nice = {"perishables": "food: perishables", "staples": "food: staples", "utilities": "energy: utility tariffs",
        "motor_fuel": "energy: motor fuel", "market_energy": "energy: LPG, firewood", "nonfood": "other non-food"}

frames = []
for period, frame, pp in [("2021-24 (out-of-fold)", train.iloc[val], oof[FINAL][val]), ("test 2025-26", test, p_test[FINAL])]:
    f = frame[["week_end", "group", A.TARGET]].copy()
    f["driver"] = (f["week_end"] + pd.Timedelta(days=7)).map(driver).map(nice)
    f["alert"] = (pp >= thr[FINAL]).astype(int)
    f["period"] = period
    frames.append(f[f[A.TARGET] == 1])
shocks = pd.concat(frames)
mix = (shocks.groupby(["period", "group"])["driver"].value_counts(normalize=True).unstack(fill_value=0))
print("Share of each quintile's shock rows, by the component that drove the shock:")
display(mix.round(2))
caught = shocks.groupby(["period", "driver"])["alert"].agg(["mean", "sum", "size"]).rename(
    columns={"mean": "recall", "sum": "caught", "size": "shock rows"})
print("Recall of the final model by shock driver:")
display(caught.round(2))
mix.to_csv(TABLE_DIR / "m4_shock_driver_mix_by_group.csv")
caught.to_csv(TABLE_DIR / "m4_recall_by_driver.csv")
'''

FIG_F1 = r'''
# Figure F1: recall, false-positive rate and alert rate by quintile for the final model, with bootstrap intervals
def boot_rates(yy, pp, gg, ww, t, n_boot=1000):
    rng = np.random.default_rng(A.SEED)
    uniq = np.unique(ww)
    rows_of = {w: np.flatnonzero(ww == w) for w in uniq}
    out = []
    for _ in range(n_boot):
        idx = np.concatenate([rows_of[w] for w in rng.choice(uniq, size=len(uniq), replace=True)])
        out.append(A.group_rates(yy[idx], pp[idx], gg[idx], t)[["TPR (recall)", "FPR", "alert rate"]])
    return pd.concat(out, keys=range(len(out)))

fig, axes = plt.subplots(1, 3, figsize=(13, 3.9), sharey=True)
for j, (period, yy, gg, pp, ww, mk) in enumerate([("2021-24 (out-of-fold)", yv, gv, oof[FINAL][val], wv, "o"),
                                                 ("test 2025-26", yt.to_numpy(), g_te, p_test[FINAL], test["week_end"].to_numpy(), "s")]):
    pt = A.group_rates(yy, pp, gg, thr[FINAL])
    bb = boot_rates(yy, pp, gg, ww, thr[FINAL])
    for ax, metric in zip(axes, ["TPR (recall)", "FPR", "alert rate"]):
        for i, g in enumerate(GROUPS):
            q = bb.xs(g, level=1)[metric].dropna().quantile([0.025, 0.975])
            xx = i + (j - 0.5) * 0.3
            ax.plot([xx, xx], q.values, color=GROUP_COLORS[g], lw=1.4, alpha=0.8)
            ax.scatter(xx, pt.loc[g, metric], color=GROUP_COLORS[g], marker=mk, s=40, zorder=3,
                       edgecolor=INK, linewidth=0.5, label=period if (i == 0) else None)
for ax, metric, ttl in zip(axes, ["TPR (recall)", "FPR", "alert rate"],
                           ["Recall (shocks caught)", "False-positive rate", "Alert rate (all rows)"]):
    ax.set_xticks(range(5), GROUPS)
    ax.set(title=ttl, xlabel="consumption quintile (Q1 poorest)", ylim=(0, 1.02))
axes[0].set_ylabel("rate")
handles = [plt.Line2D([], [], marker="o", ls="", color=INK_SECONDARY, label="validation years 2021-24 (out-of-fold)"),
           plt.Line2D([], [], marker="s", ls="", color=INK_SECONDARY, label="test 2025-26")]
axes[0].legend(handles=handles, loc="lower left", fontsize=8)
fig.suptitle(f"Figure F1. Error rates by quintile, final model ({FINAL}) at one shared threshold", x=0.01, ha="left",
             fontweight="bold", color=INK, y=1.03)
caption(fig, "Points: estimates; lines: 95% intervals from 1,000 bootstrap resamples of whole weeks. Equal opportunity asks "
             "for equal recall, predictive equality for equal false-positive rates, demographic parity for equal alert rates.", y=-0.04)
fig.savefig(FIG_DIR / "figF1_rates_by_quintile.png")
plt.show()
'''

MITIGATION = r'''
# Bias mitigation: three families, each chosen on the 2021-24 out-of-fold predictions only
est = fitted[FINAL]
policies = {}
# (0) no mitigation: one shared threshold at 5:1
policies["No mitigation (shared threshold)"] = dict(oof=oof[FINAL], test=p_test[FINAL], thr=thr[FINAL])

# (1) pre-processing: reweighing, weights computed on each fold's training rows
oof_rw = A.oof_predict(est, X, y, folds, weight_fn=A.reweighing_weights, groups=g_tr)
fit_rw = A.fit(est, X, y, A.reweighing_weights(g_tr, y))
policies["Pre: reweighing"] = dict(oof=oof_rw, test=fit_rw.predict_proba(Xt)[:, 1], thr=B.best_threshold(y, oof_rw))

# (2) in-processing: a missed Q1 shock costs twice as much in the training loss
oof_in = A.oof_predict(est, X, y, folds, weight_fn=A.group_cost_weights, groups=g_tr)
fit_in = A.fit(est, X, y, A.group_cost_weights(g_tr, y))
policies["In: Q1 shocks weighted x2 in training"] = dict(oof=oof_in, test=fit_in.predict_proba(Xt)[:, 1],
                                                          thr=B.best_threshold(y, oof_in))

# (3) post-processing: one threshold per quintile
costs_q1 = A.miss_costs(A.Q1_MISS_MULT)
policies["Post: quintile thresholds, Q1 miss x2"] = dict(oof=oof[FINAL], test=p_test[FINAL],
                                                         thr=A.group_thresholds(y, oof[FINAL], g_tr, costs_q1))
EO_EPS = 0.05     # recalls of the five quintiles may differ by at most 5 percentage points
eo = A.pareto_frontier(yv, oof[FINAL][val], gv, kind="TPR", eps_grid=[EO_EPS]).iloc[0]
policies[f"Post: equal opportunity (recall gap <= {EO_EPS:.2f})"] = dict(oof=oof[FINAL], test=p_test[FINAL], thr=eo["thresholds"])
di = A.pareto_frontier(yv, oof[FINAL][val], gv, kind="DI", eps_grid=[0.2]).iloc[0]
policies["Post: demographic parity (80% rule)"] = dict(oof=oof[FINAL], test=p_test[FINAL], thr=di["thresholds"])
# the full frontiers, for the trade-off figure in section 7
fr_tpr = A.pareto_frontier(yv, oof[FINAL][val], gv, kind="TPR")
fr_di = A.pareto_frontier(yv, oof[FINAL][val], gv, kind="DI")

for k, v in policies.items():
    t = v["thr"]
    print(f"{k}: thresholds " + (str({g: round(x, 2) for g, x in t.items()}) if isinstance(t, dict) else f"{t:.2f} for every quintile"))
'''

POLICY_TABLE = r'''
# Accuracy and fairness of each policy, on the validation years and on the test period
def evaluate(yy, pp, gg, t):
    r = A.group_rates(yy, pp, gg, t)
    tp, fp, fn, tn = r["TP"].sum(), r["FP"].sum(), r["FN"].sum(), r["TN"].sum()
    never = B.COST_FN * yy.sum()
    s = A.fairness_summary(r)
    return {"cost / never (5:1)": A.total_cost(yy, pp, gg, t) / never,
            "cost / never (Q1 miss x2)": A.total_cost(yy, pp, gg, t, costs_q1) / (never + B.COST_FN * yy[gg == "Q1"].sum()),
            "accuracy": (tp + tn) / len(yy), "recall": tp / (tp + fn), "precision": tp / (tp + fp) if tp + fp else np.nan,
            "F1": 2 * tp / (2 * tp + fp + fn), "recall Q1": r.loc["Q1", "TPR (recall)"], "recall Q5": r.loc["Q5", "TPR (recall)"],
            "disparate impact ratio (Q1/Q5)": s["disparate impact ratio (Q1/Q5)"],
            "equal opportunity diff. (TPR Q1-Q5)": s["equal opportunity diff. (TPR Q1-Q5)"],
            "predictive equality diff. (FPR Q1-Q5)": s["predictive equality diff. (FPR Q1-Q5)"],
            "TPR range (all groups)": s["TPR range (all groups)"]}

rows = []
for k, v in policies.items():
    rows.append({"policy": k, "period": "2021-24 (out-of-fold)", **evaluate(yv, v["oof"][val], gv, v["thr"])})
    rows.append({"policy": k, "period": "test 2025-26", **evaluate(yt.to_numpy(), v["test"], g_te, v["thr"])})
pol = pd.DataFrame(rows).set_index(["period", "policy"])
display(pol.round(3))
pol.to_csv(TABLE_DIR / "m4_mitigation_policies.csv")
'''

FIG_F2 = r'''
# Figure F2: the fairness-accuracy trade-off (Pareto frontier) for quintile-specific thresholds
never_v = B.COST_FN * yv.sum()
def frontier_eval(fr, kind):
    out = []
    for _, r in fr.iterrows():
        rr = A.group_rates(yv, oof[FINAL][val], gv, r["thresholds"])
        rt = A.group_rates(yt.to_numpy(), p_test[FINAL], g_te, r["thresholds"])
        fair_v = {"TPR": rr["TPR (recall)"].max() - rr["TPR (recall)"].min(),
                  "DI": rr["alert rate"].min() / rr["alert rate"].max()}[kind]
        fair_t = {"TPR": rt["TPR (recall)"].max() - rt["TPR (recall)"].min(),
                  "DI": rt["alert rate"].min() / rt["alert rate"].max()}[kind]
        out.append({"eps": r["eps"], "fairness (val)": fair_v, "fairness (test)": fair_t,
                    "cost / never (val)": r["cost"] / never_v,
                    "accuracy (val)": (rr["TP"].sum() + rr["TN"].sum()) / len(yv),
                    "cost / never (test)": A.total_cost(yt.to_numpy(), p_test[FINAL], g_te, r["thresholds"]) / (B.COST_FN * yt.sum()),
                    "accuracy (test)": (rt["TP"].sum() + rt["TN"].sum()) / len(yt)})
    return pd.DataFrame(out)
fe_tpr, fe_di = frontier_eval(fr_tpr, "TPR"), frontier_eval(fr_di, "DI")
fe_tpr.to_csv(TABLE_DIR / "m4_pareto_equal_opportunity.csv", index=False)
fe_di.to_csv(TABLE_DIR / "m4_pareto_demographic_parity.csv", index=False)

fig, axes = plt.subplots(1, 2, figsize=(12.5, 4.6))
marks = {"No mitigation (shared threshold)": ("o", SERIES[0]), "Pre: reweighing": ("^", SERIES[1]),
         "In: Q1 shocks weighted x2 in training": ("v", SERIES[2]), "Post: quintile thresholds, Q1 miss x2": ("D", SERIES[3]),
         f"Post: equal opportunity (recall gap <= {EO_EPS:.2f})": ("s", SERIES[6]), "Post: demographic parity (80% rule)": ("P", SERIES[4])}
for ax, fe, kind, xlab in [(axes[0], fe_tpr, "TPR", "recall gap: largest minus smallest recall over Q1-Q5"),
                           (axes[1], fe_di, "DI", "alert-rate ratio: smallest / largest alert rate over Q1-Q5")]:
    ax.plot(fe["fairness (val)"], fe["cost / never (val)"], color=INK, lw=2, drawstyle="steps-post" if kind == "TPR" else "default",
            label="Pareto frontier, 2021-24")
    for k, v in policies.items():
        rr = A.group_rates(yv, v["oof"][val], gv, v["thr"])
        fx = rr["TPR (recall)"].max() - rr["TPR (recall)"].min() if kind == "TPR" else rr["alert rate"].min() / rr["alert rate"].max()
        mk, col = marks[k]
        ax.scatter(fx, A.total_cost(yv, v["oof"][val], gv, v["thr"]) / never_v, marker=mk, s=60, color=col,
                   edgecolor=INK, linewidth=0.6, zorder=4, label=k)
    ax.axhline(1, color=GRID, lw=1)
    ax.set(xlabel=xlab, ylabel="expected cost relative to never alerting (5:1)")
axes[1].axvline(0.8, color=INK_SECONDARY, lw=0.8, ls=":")
axes[1].text(0.8, axes[1].get_ylim()[1], " 80% rule", color=INK_SECONDARY, va="top", fontsize=8)
axes[0].set_title("Equal opportunity against cost")
axes[1].set_title("Demographic parity against cost")
axes[0].legend(fontsize=7.5, loc="upper right")
fig.suptitle(f"Figure F2. Fairness-accuracy trade-off for the final model ({FINAL}), validation years 2021-24", x=0.01,
             ha="left", fontweight="bold", color=INK, y=1.03)
caption(fig, "Frontier: for each allowed unfairness, the lowest expected cost reachable with one threshold per quintile "
             "(exact search over thresholds 0.01-0.99).\nLower is more accurate. Fairer is further left in the left panel "
             "and further right in the right panel. Markers: the mitigation policies of section 6.", y=-0.04)
fig.savefig(FIG_DIR / "figF2_pareto_frontier.png")
plt.show()
display(fe_tpr.iloc[[0, 1, 2, 3, 5, 10, 15, -1]].round(3))
'''

ASYM = r'''
# Asymmetric costs across groups: how the Q1 threshold and the outcomes move with the Q1 miss cost
rows = []
for mult in A.MISS_MULTS:
    c = A.miss_costs(mult)
    t = A.group_thresholds(y, oof[FINAL], g_tr, c)
    for period, yy, gg, pp in [("2021-24 (out-of-fold)", yv, gv, oof[FINAL][val]), ("test 2025-26", yt.to_numpy(), g_te, p_test[FINAL])]:
        r = A.group_rates(yy, pp, gg, t)
        rows.append({"Q1 miss cost (x a miss elsewhere)": mult, "period": period, "threshold Q1": t["Q1"], "threshold Q5": t["Q5"],
                     "recall Q1": r.loc["Q1", "TPR (recall)"], "recall Q5": r.loc["Q5", "TPR (recall)"],
                     "FPR Q1": r.loc["Q1", "FPR"], "FPR Q5": r.loc["Q5", "FPR"],
                     "cost / never (5:1)": A.total_cost(yy, pp, gg, t) / (B.COST_FN * yy.sum())})
asym = pd.DataFrame(rows).set_index(["period", "Q1 miss cost (x a miss elsewhere)"])
display(asym.round(3))
asym.to_csv(TABLE_DIR / "m4_q1_cost_sensitivity.csv")
'''

FIG_F3 = r'''
# Figure F3: threshold curves for each quintile (expected cost of that quintile's errors at every threshold)
grid_t = np.round(np.arange(0.01, 1.0, 0.01), 2)
fig, axes = plt.subplots(1, 2, figsize=(12, 4.2), sharey=True)
for ax, (period, yy, gg, pp) in zip(axes, [("validation years 2021-24 (out-of-fold)", yv, gv, oof[FINAL][val]),
                                           ("test 2025-26", yt.to_numpy(), g_te, p_test[FINAL])]):
    for g in GROUPS:
        m = gg == g
        never = B.COST_FN * yy[m].sum()
        cc = [B.expected_cost(yy[m], pp[m], t) / never for t in grid_t]
        ax.plot(grid_t, cc, color=GROUP_COLORS[g], lw=2.2 if g in ("Q1", "Q5") else 1.0, label=g)
    m = gg == "Q1"
    cc2 = [B.expected_cost(yy[m], pp[m], t, 1, B.COST_FN * A.Q1_MISS_MULT) / (B.COST_FN * A.Q1_MISS_MULT * yy[m].sum()) for t in grid_t]
    ax.plot(grid_t, cc2, color=GROUP_COLORS["Q1"], lw=1.6, ls="--", label="Q1, miss cost x2")
    ax.axhline(1, color=GRID, lw=1)
    ax.axvline(thr[FINAL], color=INK_SECONDARY, lw=0.8, ls=":")
    ax.set(xlabel="alarm threshold", title=period, ylim=(0, 2))
axes[0].set_ylabel("cost of the quintile's errors / cost of never alerting")
axes[0].legend(fontsize=8, ncol=2)
fig.suptitle(f"Figure F3. Threshold curves by quintile, final model ({FINAL})", x=0.01, ha="left", fontweight="bold",
             color=INK, y=1.03)
caption(fig, "Each curve is minimised at that quintile's own cost-optimal threshold. Dashed: Q1 when a missed Q1 shock counts "
             "twice. Dotted line: the shared threshold.", y=-0.03)
fig.savefig(FIG_DIR / "figF3_threshold_curves_by_quintile.png")
plt.show()
'''
