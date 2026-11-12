"""Collects the numbers of the Milestone 4 manuscript tables from reports/tables/m4_*.csv and the model card,
and writes them as a JavaScript module (tools/m4_manuscript_numbers.js) for tools/build_manuscript_m4.js.

Run after notebooks 05 and 06:   python tools/collect_m4_numbers.py
"""

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
T = ROOT / "reports" / "tables"
card = json.loads((ROOT / "models" / "m4_advanced" / "model_card.json").read_text(encoding="utf-8"))


def f(x, d=3):
    return "—" if pd.isna(x) else f"{x:.{d}f}"


def sg(x, d=3):
    return "—" if pd.isna(x) else ("+" if x >= 0 else "−") + f"{abs(x):.{d}f}"


N = {}

# grid sizes and selected settings
grids = {"Logistic regression": ("C (12 values, 10⁻⁴ to 100), L1 or L2, class weights", 48),
         "KNN": ("k (11 values, 5 to 250), uniform or distance weights, Euclidean or Manhattan, z-score or Min-Max", 88),
         "Decision tree": ("depth 1 to 8, minimum leaf 5 to 160, Gini or entropy, class weights", 196),
         "Random forest": ("300 trees, depth 3 to unlimited (4 values), minimum leaf 5 to 100 (4 values), √20 or half the features, Gini or entropy, class weights", 128),
         "Gradient boosting": ("learning rate 0.01 to 0.1 (3 values), 100 or 300 trees, depth 2 or 3, minimum leaf 20 to 100 (3 values), L2 penalty 0 or 1, class weights", 144)}
def setting(a, v):
    """One selected hyperparameter in words, e.g. ("metric", "manhattan") -> "Manhattan"."""
    if a == "C":
        return f"C = {v:g}"
    if a == "l1_ratio":
        return {0.0: "L2", 1.0: "L1"}.get(v, f"L1 ratio {v:g}")
    if a == "class_weight":
        return "balanced class weights" if v == "balanced" else "no class weights"
    if a == "n_neighbors":
        return f"k = {v}"
    if a == "weights":
        return "distance-weighted" if v == "distance" else "uniform weights"
    if a == "metric":
        return v.capitalize()
    if a == "cont":
        return {"StandardScaler": "z-score", "MinMaxScaler": "Min-Max"}.get(v, v)
    if a == "criterion":
        return {"gini": "Gini"}.get(v, v)
    if a == "max_depth":
        return "unlimited depth" if v is None else f"depth {v}"
    if a == "max_features":
        return "√20 features" if v == "sqrt" else "half the features"
    if a == "min_samples_leaf":
        return f"minimum leaf {v}"
    if a == "learning_rate":
        return f"learning rate {v:g}"
    if a == "max_iter":
        return f"{v} trees"
    if a == "l2_regularization":
        return "no L2 penalty" if v == 0 else f"L2 penalty {v:g}"
    return f"{a} {v}"


rows = []
for n, (space, k) in grids.items():
    m = card["models"][n]
    rows.append([n, space, ", ".join(setting(a, v) for a, v in m["params"].items())])
N["gridRows"] = rows
N["nSettings"] = f"{sum(k for _, k in grids.values()):,}"
N["nFits"] = f"{4 * sum(k for _, k in grids.values()):,}"

folds = pd.read_csv(T / "m4_cv_folds.csv")
sr = folds[[c for c in folds.columns if c.startswith("shock rows Q")]]
N["minShockRows"], N["maxShockRows"] = int(sr.values.min()), int(sr.values.max())

leak = pd.read_csv(T / "m4_cv_design_comparison.csv").set_index("model")
N["leakRows"] = f"{leak.loc['Random forest'].iloc[0]:.2f} and {leak.loc['Gradient boosting'].iloc[0]:.2f}"
N["leakOurs"] = f"{leak.loc['Random forest'].iloc[2]:.2f} and {leak.loc['Gradient boosting'].iloc[2]:.2f}"

comp = pd.read_csv(T / "m4_model_comparison.csv").set_index("model")
rows = []
for lab in comp.index:
    r = comp.loc[lab]
    rows.append([lab, f(r["CV within-year AUC"]), f(r["CV pooled AUC"]),
                 f(r["CV Brier"]), f(r["threshold"], 2), f(r["test accuracy"]), f(r["test precision"]), f(r["test recall"]),
                 f(r["test F1"]), f(r["test ROC-AUC"]), f(r["test PR-AUC"]), f(r["test Brier"]), f(r["test cost / never"], 2)])
N["compRows"] = rows
gain = pd.read_csv(T / "m4_test_auc_gain_vs_m3.csv").set_index("comparison")
g = gain.loc["M4 Random forest minus M3 KNN"]
N["gainRF"] = sg(g["AUC difference"])
N["gainRFci"] = f"{sg(g['95% CI low'], 2)} to {sg(g['95% CI high'], 2)}"

h4 = pd.read_csv(T / "m4_h4_tests.csv")
N["h4Rows"] = [[r["test"].replace("LR (independent rows)", "Likelihood ratio, signal × Q5 (planned)")
                .replace("Wald (week-clustered)", "Wald, signal × Q5 (week-clustered, main)")
                .replace("Wald, component x Q5 (exploratory)", "Wald, component × Q5 (exploratory)"),
                f"χ² = {r['chi2']:.2f}", str(int(r["df"])), f(r["p"]), "fail to reject" if r["p"] >= 0.05 else "reject H0"]
               for _, r in h4.iterrows()]

br = pd.read_csv(T / "m4_base_rates_by_group.csv")
rows = []
for per, lab in [("training 2019-24", "Training 2019–24"), ("validation years 2021-24", "Validation years 2021–24"),
                 ("test 2025-26", "Test 2025–26")]:
    b = br[br["period"] == per].set_index("group")
    rows.append([lab] + [f"{int(b.loc[g, 'shock rows'])} ({100 * b.loc[g, 'shock rate']:.0f}%)" for g in ["Q1", "Q2", "Q3", "Q4", "Q5"]])
N["baseRows"] = rows

aud = pd.read_csv(T / "m4_fairness_all_models.csv").set_index(["period", "model"])
rows = []
for n in ["Logistic regression", "KNN", "Decision tree", "Random forest", "Gradient boosting"]:
    v, t = aud.loc[("2021-24 (out-of-fold)", n)], aud.loc[("test 2025-26", n)]
    rows.append([n + (" (final)" if n == card["final_model"] else ""),
                 f"{v['disparate impact ratio (Q1/Q5)']:.2f} ({t['disparate impact ratio (Q1/Q5)']:.2f})",
                 f"{sg(v['equal opportunity diff. (TPR Q1-Q5)'], 3)} ({sg(t['equal opportunity diff. (TPR Q1-Q5)'], 2)})",
                 f"{sg(v['predictive equality diff. (FPR Q1-Q5)'], 3)} ({sg(t['predictive equality diff. (FPR Q1-Q5)'], 2)})",
                 f"{v['TPR range (all groups)']:.3f} ({t['TPR range (all groups)']:.2f})"])
N["auditRows"] = rows

pol = pd.read_csv(T / "m4_mitigation_policies.csv").set_index(["period", "policy"])
rows = []
for p in pol.index.get_level_values(1).unique():
    v, t = pol.loc[("2021-24 (out-of-fold)", p)], pol.loc[("test 2025-26", p)]
    pair = lambda c, d=2: f"{v[c]:.{d}f} ({t[c]:.{d}f})"
    rows.append([p.replace("No mitigation (shared threshold)", "None (shared threshold)").replace("Q1 shocks weighted x2 in training", "Q1 shocks × 2 in training")
                 .replace("recall gap <= 0.05", "gap ≤ 0.05").replace(" x2", " × 2")
                 .replace("Pre: ", "Pre-processing: ").replace("In: ", "In-processing: ").replace("Post: ", "Post-processing: "),
                 pair("cost / never (5:1)", 3), pair("accuracy"), pair("recall"), pair("recall Q1"), pair("recall Q5"),
                 pair("disparate impact ratio (Q1/Q5)"), pair("TPR range (all groups)")])
N["policyRows"] = rows

# one row per Q1 miss cost, test period in brackets; weights with identical results share a row
asym = pd.read_csv(T / "m4_q1_cost_sensitivity.csv")
mult = "Q1 miss cost (x a miss elsewhere)"
rows, keys = [], []
for w, g in asym.groupby(mult, sort=True):
    v, t = g[g["period"].str.startswith("2021")].iloc[0], g[g["period"].str.startswith("test")].iloc[0]
    pair = lambda c, d=2: f"{v[c]:.{d}f} ({t[c]:.{d}f})"
    cells = [f(v["threshold Q1"], 2), f(v["threshold Q5"], 2), pair("recall Q1"), pair("recall Q5"), pair("cost / never (5:1)", 3)]
    if keys and keys[-1][1] == cells:
        keys[-1][0].append(w)
    else:
        keys.append(([w], cells))
for ws, cells in keys:
    lab = " or ".join(f"{w:g}" for w in ws) + " ×"
    rows.append([lab] + cells)
N["asymRows"] = rows

out = ROOT / "tools" / "m4_manuscript_numbers.js"
out.write_text("// Generated by tools/collect_m4_numbers.py from reports/tables/m4_*.csv. Do not edit by hand.\n"
               "module.exports = " + json.dumps(N, indent=1, ensure_ascii=False) + ";\n", encoding="utf-8")
print("wrote", out.relative_to(ROOT), "with", len(N), "entries")
