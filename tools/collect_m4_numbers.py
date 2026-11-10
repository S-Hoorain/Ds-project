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
grids = {"Logistic regression": ("C 12 values (10⁻⁴ to 100), L1 or L2, class weights none or balanced", 48),
         "KNN": ("k 11 values (5 to 250), uniform or distance weights, Euclidean or Manhattan, z-score or Min-Max", 88),
         "Decision tree": ("depth 1 to 8, minimum leaf 5 to 160 rows, Gini or entropy, class weights", 196),
         "Random forest": ("300 trees, depth 3, 5, 8 or unlimited, minimum leaf 5, 20, 50 or 100, √20 or half the features per split, Gini or entropy, class weights", 128),
         "Gradient boosting": ("learning rate 0.01, 0.03 or 0.1, 100 or 300 trees, depth 2 or 3, minimum leaf 20, 50 or 100, L2 penalty 0 or 1, class weights", 144)}
nice = {"C": "C", "l1_ratio": "L1 ratio", "class_weight": "class weights", "n_neighbors": "k", "weights": "weights",
        "metric": "distance", "cont": "scaling", "max_depth": "depth", "min_samples_leaf": "min. leaf",
        "criterion": "criterion", "max_features": "features per split", "learning_rate": "learning rate",
        "max_iter": "trees", "l2_regularization": "L2 penalty"}
rows = []
for n, (space, k) in grids.items():
    m = card["models"][n]
    sel = ", ".join(f"{nice.get(a, a)} {('none' if v is None else v)}" for a, v in m["params"].items())
    rows.append([n, space, f"{sel} (within-year AUC {m['within-year AUC']:.3f})"])
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
    rows.append([lab.replace("M3 ", "M3 · ").replace("M4 ", "M4 · "), f(r["CV within-year AUC"]), f(r["CV pooled AUC"]),
                 f(r["CV Brier"]), f(r["threshold"], 2), f(r["test accuracy"]), f(r["test precision"]), f(r["test recall"]),
                 f(r["test F1"]), f(r["test ROC-AUC"]), f(r["test PR-AUC"]), f(r["test Brier"]), f(r["test cost / never"], 2)])
N["compRows"] = rows
gain = pd.read_csv(T / "m4_test_auc_gain_vs_m3.csv").set_index("comparison")
g = gain.loc["M4 Random forest minus M3 KNN"]
N["gainRF"] = sg(g["AUC difference"])
N["gainRFci"] = f"{sg(g['95% CI low'], 2)} to {sg(g['95% CI high'], 2)}"

h4 = pd.read_csv(T / "m4_h4_tests.csv")
N["h4Rows"] = [[r["test"].replace("LR (independent rows)", "Likelihood ratio, signal × Q5 (rows independent, as planned)")
                .replace("Wald (week-clustered)", "Wald, signal × Q5 (week-clustered, main test)")
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
    rows.append([p.replace("Pre: ", "Pre-processing: ").replace("In: ", "In-processing: ").replace("Post: ", "Post-processing: ").replace(" x2", " × 2"),
                 pair("cost / never (5:1)", 3), pair("accuracy"), pair("recall"), pair("recall Q1"), pair("recall Q5"),
                 pair("disparate impact ratio (Q1/Q5)"), pair("TPR range (all groups)")])
N["policyRows"] = rows

asym = pd.read_csv(T / "m4_q1_cost_sensitivity.csv")
rows = []
for _, r in asym.iterrows():
    rows.append([f"{r['Q1 miss cost (x a miss elsewhere)']:g} ×", "2021–24" if r["period"].startswith("2021") else "test 2025–26",
                 f(r["threshold Q1"], 2), f(r["threshold Q5"], 2), f(r["recall Q1"], 2), f(r["recall Q5"], 2),
                 f(r["cost / never (5:1)"], 3)])
N["asymRows"] = rows

out = ROOT / "tools" / "m4_manuscript_numbers.js"
out.write_text("// Generated by tools/collect_m4_numbers.py from reports/tables/m4_*.csv. Do not edit by hand.\n"
               "module.exports = " + json.dumps(N, indent=1, ensure_ascii=False) + ";\n", encoding="utf-8")
print("wrote", out.relative_to(ROOT), "with", len(N), "entries")
