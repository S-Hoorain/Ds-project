"""Builds group_XX/notebook.ipynb from the cells below (run from this folder).

    python build_notebook.py ../group_XX/notebook.ipynb

The interpretation text lives in notebook_text.py. Its numbers come from an
executed run of the same code cells (the code is deterministic, seeds fixed).
"""
import sys
import nbformat as nbf

OUT = sys.argv[1] if len(sys.argv) > 1 else "../group_XX/notebook.ipynb"
cells = []


import json
from pathlib import Path
from notebook_text import TEXT   # interpretation text for the placeholder cells
from notebook_model_text import model_text
if Path("numbers.json").exists():   # numbers of the last executed run
    TEXT.update(model_text(json.loads(Path("numbers.json").read_text(encoding="utf-8"))))


def md(text):
    text = TEXT.get(text.strip(), text)
    cells.append(nbf.v4.new_markdown_cell(text.strip("\n")))


def code(text):
    cells.append(nbf.v4.new_code_cell(text.strip("\n")))


# =============================================================================
md(r"""
# Assignment 2: Predicting Early Hospital Readmission (Diabetes Dataset)
**CS/SDP 312/314 L1, Data Science for Social Good**

**Group members:** 1. Syeda Hoorain Imran, 08704 · 2. Munib Sattar, 09239

**Language / libraries:** Python 3.13 · pandas · numpy · scikit-learn · matplotlib · joblib

**How to run:** put `diabetes_dev.csv` in the same folder as this notebook and run all cells (about 20 to 30 minutes on
a laptop with 3 parallel workers). The cleaning code is in `predict.py`, and this notebook imports it, so training and the held-out
predictions use exactly the same steps. The last section saves the final model to `model/pipeline.joblib` and the
threshold to `threshold.json`. Figures and tables for the report are saved to `figures/` and `tables/`.

**Task.** For each hospital stay, predict the probability that the patient is readmitted within 30 days
(`readmitted == "<30"`, class 1). Stays followed by a later readmission (`">30"`) or by no readmission (`"NO"`) are
class 0.
""")

md("## 0. Setup and loading the data")
code(r'''
import json
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import joblib

from sklearn.base import clone
from sklearn.model_selection import (StratifiedGroupKFold, StratifiedKFold, GridSearchCV,
                                     cross_validate, cross_val_predict)
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import (average_precision_score, roc_auc_score, brier_score_loss,
                             precision_score, recall_score, f1_score, confusion_matrix,
                             precision_recall_curve)

# Our cleaning code. It lives in predict.py so that the notebook and the
# submitted prediction script can never drift apart.
import predict
from predict import clean, NUMERIC_FEATURES, CATEGORICAL_FEATURES

SEED = 42
np.random.seed(SEED)
N_JOBS = 3   # parallel workers; kept low so the notebook fits in the memory of an ordinary laptop
pd.set_option("display.precision", 3)
pd.set_option("display.width", 160)
pd.set_option("display.max_columns", 30)
Path("figures").mkdir(exist_ok=True)   # figures used in the PDF report
Path("tables").mkdir(exist_ok=True)    # tables used in the PDF report

# diabetes_dev.csv should sit next to this notebook (the other paths are fallbacks)
candidates = [Path("diabetes_dev.csv"), Path("data") / "diabetes_dev.csv",
              Path("..") / "Package" / "diabetes_dev.csv"]
found = [p for p in candidates if p.exists()]
assert found, "Put diabetes_dev.csv in the same folder as this notebook."
raw = pd.read_csv(found[0])
print("Development data:", raw.shape[0], "stays (rows),", raw.shape[1], "columns")
print("Distinct patients:", raw["patient_nbr"].nunique())
''')

md("### The target")
code(r'''
# Class 1 = readmitted within 30 days. ">30" and "NO" are both class 0.
y = (raw["readmitted"] == "<30").astype(int).to_numpy()

# patient_nbr is used ONLY to keep all stays of one patient on the same side of a
# split. It is never a model input (the held-out patients are new people).
groups = raw["patient_nbr"].to_numpy()

target_table = raw["readmitted"].value_counts().to_frame("Stays")
target_table["Share (%)"] = target_table["Stays"] / len(raw) * 100
target_table["Class"] = target_table.index.map({"<30": 1, ">30": 0, "NO": 0})
target_table.to_csv("tables/t01_target.csv")
print(f"Early readmissions: {y.sum():,} of {len(y):,} stays = {y.mean():.1%}")
target_table
''')

md(r"""
Only about **1 stay in 9** is followed by an early readmission. This **class imbalance** matters in three places.
- **Accuracy** would be misleading. A model that says "no" for everyone is 89% accurate and useless (the Unit 10
  example of 9,990 vs 10 cases). We therefore use **average precision** (the area under the precision-recall curve),
  **ROC-AUC** and the **Brier score**, the three ranking and probability measures the held-out evaluation uses.
- The default **0.5 cut-off** would flag almost nobody, so the threshold needs its own analysis (Section 7).
- The **no-skill level** of average precision is the share of positives (0.11), not 0.5. Any model has to beat 0.11.
""")

# =============================================================================
md("## 1. Exploring the raw data")
md("### 1.1 How missing values are recorded")
code(r'''
# Missing values are written as "?" in most columns. In max_glu_serum and
# A1Cresult the cell is blank (pandas reads it as NaN), which means "test not done".
missing = pd.DataFrame({
    '"?" values': (raw == "?").sum(),
    "Blank cells": raw.isna().sum(),
})
missing = missing[missing.sum(axis=1) > 0]
missing["Missing (%)"] = missing.sum(axis=1) / len(raw) * 100
missing = missing.sort_values("Missing (%)", ascending=False)
missing.to_csv("tables/t02_missing.csv")
missing
''')

code(r'''
# Does missingness itself relate to the target?
for col in ["weight", "payer_code", "medical_specialty"]:
    is_missing = raw[col] == "?"
    print(f"{col:18s} early-readmission rate: missing {y[is_missing].mean():.3f} | recorded {y[~is_missing].mean():.3f}")
for col in ["A1Cresult", "max_glu_serum"]:
    not_tested = raw[col].isna()
    print(f"{col:18s} early-readmission rate: not tested {y[not_tested].mean():.3f} | tested {y[~not_tested].mean():.3f}")
''')

md("MISSING_MD")

md("### 1.2 Patients with more than one stay")
code(r'''
stays_per_patient = raw["patient_nbr"].map(raw["patient_nbr"].value_counts())
band = stays_per_patient.clip(upper=5).astype(str).replace("5", "5+")
repeat = pd.DataFrame({
    "Stays (rows)": band.value_counts().sort_index(),
    "Early readmission rate (%)": pd.Series(y).groupby(band.values).mean() * 100,
})
repeat.index.name = "Stays by the same patient"
repeat.to_csv("tables/t03_repeat_patients.csv")
n_multi = (raw["patient_nbr"].value_counts() > 1).sum()
print(f"{n_multi:,} patients have more than one stay; together they account for "
      f"{(stays_per_patient > 1).sum():,} rows ({(stays_per_patient > 1).mean():.1%}).")
repeat
''')

md("REPEAT_MD")

md("### 1.3 Which raw variables relate to early readmission?")
code(r'''
fig, axes = plt.subplots(1, 2, figsize=(13, 4.3))

inpatient = raw["number_inpatient"].clip(upper=6)
rate_inp = pd.Series(y).groupby(inpatient.values).mean() * 100
n_inp = inpatient.value_counts().sort_index()
axes[0].bar([str(i) if i < 6 else "6+" for i in rate_inp.index], rate_inp.values, color="#4C72B0")
axes[0].axhline(y.mean() * 100, color="black", linestyle="--", label=f"Overall rate = {y.mean():.1%}")
for i, (r, n) in enumerate(zip(rate_inp.values, n_inp.values)):
    axes[0].text(i, r + 0.6, f"n={n:,}", ha="center", fontsize=8)
axes[0].set_title("Early readmission by inpatient stays in the previous year")
axes[0].set_xlabel("Inpatient stays in the year before this stay (count)")
axes[0].set_ylabel("Readmitted within 30 days (% of stays)")
axes[0].legend()

age_order = sorted(raw["age"].unique(), key=lambda a: int(a[1:].split("-")[0]))
rate_age = pd.Series(y).groupby(raw["age"].values).mean().reindex(age_order) * 100
n_age = raw["age"].value_counts().reindex(age_order)
axes[1].bar([a.strip("[)") for a in age_order], rate_age.values, color="#55A868")
axes[1].axhline(y.mean() * 100, color="black", linestyle="--")
for i, (r, n) in enumerate(zip(rate_age.values, n_age.values)):
    axes[1].text(i, r + 0.4, f"{n:,}", ha="center", fontsize=7)
axes[1].set_title("Early readmission by age band (n above bars)")
axes[1].set_xlabel("Age band (years)")
axes[1].set_ylabel("Readmitted within 30 days (% of stays)")
plt.tight_layout()
plt.savefig("figures/f01_rates_inpatient_age.png", dpi=200, bbox_inches="tight")
plt.show()
''')

md("RATES_MD")

code(r'''
# Discharge disposition: where the patient went after the stay (26 codes in IDS_mapping.csv)
disch = raw["discharge_disposition_id"]
disch_table = pd.DataFrame({"Stays": disch.value_counts(),
                            "Early readmission rate (%)": pd.Series(y).groupby(disch.values).mean() * 100})
disch_table["Our group"] = disch_table.index.map(predict.DISCHARGE_GROUP)
disch_table.index.name = "discharge_disposition_id"
disch_table.sort_values("Stays", ascending=False)
''')

md("DISCHARGE_MD")

md("### 1.4 Diagnosis codes")
code(r'''
for col in ["diag_1", "diag_2", "diag_3"]:
    print(f"{col}: {raw[col].nunique()} distinct ICD-9 codes; the 10 most common cover "
          f"{raw[col].value_counts().head(10).sum() / len(raw):.0%} of stays")

# Codes that are seen fewer than 20 times in 81,281 stays
rare = (raw["diag_1"].value_counts() < 20).sum()
print(f"diag_1 codes seen fewer than 20 times: {rare}")
''')

md("DIAG_MD")

# =============================================================================
md("## 2. Cleaning and grouping the features")
md("CLEANING_MD")

code(r'''
# Apply the cleaning function from predict.py to the raw rows (without the target)
X = clean(raw.drop(columns=["readmitted"]))
print("Model input:", X.shape[0], "rows x", X.shape[1], "features")
print("Numeric features:    ", len(NUMERIC_FEATURES))
print("Categorical features:", len(CATEGORICAL_FEATURES))
print("Missing numeric values left for the imputer:", int(X[NUMERIC_FEATURES].isna().sum().sum()))
print("Missing categorical values:", int(X[CATEGORICAL_FEATURES].isna().sum().sum()))
X.head(3).T
''')

code(r'''
# Early-readmission rate by the new groups (training rows only would be stricter,
# but this is description, not model fitting)
group_rates = []
for col in ["discharge_group", "diag_1_group", "admission_source", "A1Cresult"]:
    t = pd.DataFrame({"Stays": X[col].value_counts(),
                      "Rate (%)": pd.Series(y).groupby(X[col].values).mean() * 100})
    t.index = pd.MultiIndex.from_product([[col], t.index])
    group_rates.append(t)
group_rates = pd.concat(group_rates)
group_rates.to_csv("tables/t04_group_rates.csv")
group_rates
''')

md("GROUPS_MD")

# =============================================================================
md("## 3. Splitting the data by patient")
md(r"""
**Why not a random split of rows?** About 46% of the rows belong to patients with more than one stay. A random row
split would put some stays of a patient in training and other stays of the same patient in validation, and the model
could partly "recognise" the patient instead of learning patterns that carry over to new people. The instructor's
held-out set is **patient-disjoint**, so our validation must be too.

**Our design (holdout and cross-validation, Week 8 of the course).**
1. **Holdout test set.** We put 20% of the *patients* (with all their stays) aside as our own test set. It plays the
   role of the hidden held-out set and is used **once**, at the end, to check the chosen model and threshold.
2. **Grouped 5-fold cross-validation** on the other 80% of patients, for choosing models and settings. Each fold
   again keeps every patient on one side.

`StratifiedGroupKFold` does both jobs. "Group" keeps a patient's stays together; "stratified" keeps the share of early
readmissions about the same (11%) in every part, so no fold is unusually easy or hard. All imputation, scaling and
encoding is fitted inside the folds (it is part of the pipeline), so validation rows never leak into those steps.
""")
code(r'''
# Outer split: 5 grouped, stratified parts -> the first part (20% of patients) is our holdout test set
outer = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=SEED)
train_idx, test_idx = next(outer.split(X, y, groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y[train_idx], y[test_idx]
g_train = groups[train_idx]

# Inner cross-validation on the training patients only
cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=1)

shared = set(groups[train_idx]) & set(groups[test_idx])
split_table = pd.DataFrame({
    "Stays": [len(train_idx), len(test_idx)],
    "Patients": [len(set(groups[train_idx])), len(set(groups[test_idx]))],
    "Early readmission rate (%)": [y_train.mean() * 100, y_test.mean() * 100],
}, index=["Training (80% of patients)", "Holdout test (20% of patients)"])
split_table.to_csv("tables/t05_split.csv")
print("Patients in both training and test:", len(shared))
fold_check = [len(set(g_train[a]) & set(g_train[b])) for a, b in cv.split(X_train, y_train, g_train)]
print("Patients shared between fit and validation part, per CV fold:", fold_check)
split_table
''')

code(r'''
def make_preprocessor(num=NUMERIC_FEATURES, cat=CATEGORICAL_FEATURES):
    """Imputation, scaling and one-hot encoding, all learned from training rows only.

    - Numeric: median imputation (resistant to the long right tails), then z-score scaling
      so that KNN distances and logistic-regression penalties treat features fairly.
    - Categorical: one-hot encoding. Levels seen fewer than 50 times in training are pooled
      into one "infrequent" column, and a level never seen in training (for example a new
      payer code in the held-out data) is sent to that same column instead of crashing.
    """
    numeric = Pipeline([("impute", SimpleImputer(strategy="median")),
                        ("scale", StandardScaler())])
    categorical = Pipeline([("impute", SimpleImputer(strategy="constant", fill_value="Unknown")),
                            ("onehot", OneHotEncoder(handle_unknown="infrequent_if_exist",
                                                     min_frequency=50, sparse_output=False))])
    return ColumnTransformer([("num", numeric, num), ("cat", categorical, cat)])


n_columns = make_preprocessor().fit(X_train).transform(X_train.head()).shape[1]
print("Columns after one-hot encoding:", n_columns)
''')

# =============================================================================
md("## 4. Comparing models with grouped cross-validation")
md(r"""
We compare two simple baselines with five models from the course, from the most interpretable to the most flexible:

| Model | Why it is in the comparison |
|---|---|
| No-skill baseline | Gives every stay the average rate (11%). The floor any model must beat. |
| Prior-inpatient-visits rule | One-feature rule a nurse could use without a computer: the readmission rate for each number of inpatient stays in the previous year (0, 1, ..., 6+), learned from the training folds. |
| Logistic regression | Linear, gives odds ratios that are easy to explain (Week 9). |
| Decision tree | A set of if-then rules (Units 08–09). We tune depth, leaf size and Gini vs entropy. |
| K-nearest neighbours | Predicts from the k most similar past stays (Unit 11). Needs the z-score scaling. |
| Random forest | Many deep trees on bootstrap samples, averaged (ensemble, bagging). |
| Gradient boosting | Many small trees, each fixing the errors of the previous ones (ensemble, boosting). We use scikit-learn's `HistGradientBoostingClassifier`, which bins numeric values first to run fast on 65,000 rows. |

Every model is tuned with `GridSearchCV` on the same grouped folds and is scored by **average precision** (the
primary held-out metric). ROC-AUC and the Brier score are recorded for each setting too.
""")

code(r'''
SCORING = {"AP": "average_precision", "AUC": "roc_auc", "Brier": "neg_brier_score"}
cv_results = {}     # model name -> mean CV scores of its best setting
best_params = {}
fitted = {}         # best setting of each model, refitted on all training patients

# Baseline 1: no skill. Everyone gets the training rate, so AP equals the share of
# positives in each validation fold, AUC is 0.5 and Brier = rate x (1 - rate).
rows = []
for fit_i, val_i in cv.split(X_train, y_train, g_train):
    p = np.full(len(val_i), y_train[fit_i].mean())
    rows.append([average_precision_score(y_train[val_i], p), 0.5, brier_score_loss(y_train[val_i], p)])
cv_results["No-skill baseline"] = dict(zip(["AP", "AUC", "Brier"], np.mean(rows, axis=0)), **{"AP sd": np.std(np.array(rows)[:, 0])})

# Baseline 2: readmission rate by the number of prior inpatient stays (0..6+)
inp_train = raw["number_inpatient"].clip(upper=6).to_numpy()[train_idx]
rows = []
for fit_i, val_i in cv.split(X_train, y_train, g_train):
    rates = pd.Series(y_train[fit_i]).groupby(inp_train[fit_i]).mean()      # learned on the fit part only
    p = pd.Series(inp_train[val_i]).map(rates).fillna(y_train[fit_i].mean()).to_numpy()
    rows.append([average_precision_score(y_train[val_i], p), roc_auc_score(y_train[val_i], p),
                 brier_score_loss(y_train[val_i], p)])
cv_results["Prior-inpatient-visits rule"] = dict(zip(["AP", "AUC", "Brier"], np.mean(rows, axis=0)), **{"AP sd": np.std(np.array(rows)[:, 0])})
pd.DataFrame(cv_results).T
''')

code(r'''
model_grid = {
    "Logistic regression": (
        LogisticRegression(max_iter=3000),
        {"clf__C": [0.01, 0.1, 1.0]}),                      # C = 1 / strength of the L2 penalty
    "Decision tree": (
        DecisionTreeClassifier(random_state=SEED),
        {"clf__criterion": ["gini", "entropy"],
         "clf__max_depth": [4, 6, 8, 10],
         "clf__min_samples_leaf": [50, 200]}),
    "K-nearest neighbours": (
        KNeighborsClassifier(),
        {"clf__n_neighbors": [50, 100, 200, 400],
         "clf__weights": ["uniform"]}),
    "Random forest": (
        RandomForestClassifier(n_estimators=300, max_features="sqrt", random_state=SEED, n_jobs=1),
        {"clf__max_depth": [10, 15, None],
         "clf__min_samples_leaf": [10, 50]}),
    "Gradient boosting": (
        HistGradientBoostingClassifier(random_state=SEED, early_stopping=False),
        {"clf__learning_rate": [0.05, 0.1],
         "clf__max_iter": [100, 200],                        # number of trees
         "clf__max_leaf_nodes": [15, 31],
         "clf__min_samples_leaf": [50, 200]}),
}

grid_tables = {}
for name, (estimator, grid) in model_grid.items():
    pipe = Pipeline([("prep", make_preprocessor()), ("clf", estimator)])
    search = GridSearchCV(pipe, grid, scoring=SCORING, refit="AP", cv=cv, n_jobs=N_JOBS)
    search.fit(X_train, y_train, groups=g_train)
    res, b = search.cv_results_, search.best_index_
    cv_results[name] = {"AP": res["mean_test_AP"][b], "AUC": res["mean_test_AUC"][b],
                        "Brier": -res["mean_test_Brier"][b], "AP sd": res["std_test_AP"][b]}
    best_params[name] = {k.replace("clf__", ""): v for k, v in search.best_params_.items()}
    fitted[name] = search.best_estimator_
    grid_tables[name] = (pd.DataFrame(res["params"]).rename(columns=lambda c: c.replace("clf__", ""))
                         .assign(AP=res["mean_test_AP"], AUC=res["mean_test_AUC"], Brier=-res["mean_test_Brier"])
                         .sort_values("AP", ascending=False))
    print(f"{name:22s} best {best_params[name]}  CV AP = {cv_results[name]['AP']:.4f}")
''')

code(r'''
comparison = pd.DataFrame(cv_results).T[["AP", "AP sd", "AUC", "Brier"]]
comparison.index.name = "Model (grouped 5-fold CV on training patients)"
comparison["Best setting"] = [best_params.get(m, "") for m in comparison.index]
comparison.to_csv("tables/t06_model_comparison.csv")
comparison
''')

code(r'''
# The six best settings of the decision tree and of gradient boosting (all settings are in grid_tables)
display(grid_tables["Decision tree"].head(6).round(4))
grid_tables["Gradient boosting"].head(6).round(4)
''')

code(r'''
fig, ax = plt.subplots(figsize=(9, 4.2))
order = comparison.sort_values("AP").index
ax.barh(order, comparison.loc[order, "AP"], xerr=comparison.loc[order, "AP sd"],
        color=["#BBBBBB" if "baseline" in m or "rule" in m else "#4C72B0" for m in order], capsize=3)
ax.axvline(y_train.mean(), color="black", linestyle="--", label=f"No-skill level = {y_train.mean():.3f}")
for i, m in enumerate(order):
    ax.text(comparison.loc[m, "AP"] + 0.006, i, f"{comparison.loc[m, 'AP']:.3f}", va="center", fontsize=9)
ax.set_xlabel("Average precision (mean of 5 grouped folds; bars = ±1 SD)")
ax.set_title("Model comparison on training patients (grouped cross-validation)")
ax.set_xlim(0, 0.28)
ax.legend(loc="lower right")
plt.tight_layout()
plt.savefig("figures/f02_model_comparison.png", dpi=200, bbox_inches="tight")
plt.show()
''')

md("COMPARISON_MD")

md("### 4.1 Does the grouped split matter here? A leakage check")
code(r'''
# Same models, same training rows, two ways of splitting: by patient (honest) and by row (leaky)
leak_rows = []
row_cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=1)
leak_models = {
    "Fully grown decision tree": DecisionTreeClassifier(random_state=SEED),
    "1-nearest neighbour": KNeighborsClassifier(n_neighbors=1),
    "Gradient boosting (chosen setting)": clone(fitted["Gradient boosting"].named_steps["clf"]),
}
for name, est in leak_models.items():
    pipe = Pipeline([("prep", make_preprocessor()), ("clf", est)])
    for split_name, splitter, grp in [("Grouped by patient", cv, g_train), ("Random rows (leaky)", row_cv, None)]:
        r = cross_validate(pipe, X_train, y_train, groups=grp, cv=splitter, n_jobs=N_JOBS,
                           scoring={"AP": "average_precision", "AUC": "roc_auc"})
        leak_rows.append([name, split_name, r["test_AP"].mean(), r["test_AUC"].mean()])
leak = pd.DataFrame(leak_rows, columns=["Model", "Split", "AP", "AUC"]).pivot(index="Model", columns="Split")
leak.to_csv("tables/t07_leakage_check.csv")
leak
''')

md("LEAK_MD")

md("### 4.2 Checking our cleaning and grouping choices")
md(r"""
Each line below changes **one** cleaning choice and scores the chosen gradient-boosting setting on the same grouped
folds. If a simpler or more detailed version had done clearly better, we would have changed our cleaning.
""")
code(r'''
gb_setting = clone(fitted["Gradient boosting"].named_steps["clf"])   # chosen setting, unfitted
train_raw = raw.iloc[train_idx]

def variant_score(X_variant, num, cat):
    pipe = Pipeline([("prep", make_preprocessor(num, cat)), ("clf", clone(gb_setting))])
    r = cross_validate(pipe, X_variant, y_train, groups=g_train, cv=cv, n_jobs=N_JOBS,
                       scoring={"AP": "average_precision", "AUC": "roc_auc"})
    return r["test_AP"].mean(), r["test_AUC"].mean()

variants = {"Our cleaned features": (X_train, NUMERIC_FEATURES, CATEGORICAL_FEATURES)}

v = X_train.assign(race=train_raw["race"].replace("?", "Unknown").to_numpy())
variants["Race added as an input"] = (v, NUMERIC_FEATURES, CATEGORICAL_FEATURES + ["race"])

v = X_train.assign(discharge_group=train_raw["discharge_disposition_id"].astype(str).to_numpy())
variants["Raw 26 discharge codes instead of 12 groups"] = (v, NUMERIC_FEATURES, CATEGORICAL_FEATURES)

v = X_train.copy()
for col in ["diag_1", "diag_2", "diag_3"]:          # "250.83" -> "250", rare codes pooled by the encoder
    v[col + "_group"] = train_raw[col].astype(str).str.split(".").str[0].to_numpy()
variants["3-digit diagnosis codes instead of 9 groups"] = (v, NUMERIC_FEATURES, CATEGORICAL_FEATURES)

variants["payer_code left out"] = (X_train, NUMERIC_FEATURES,
                                   [c for c in CATEGORICAL_FEATURES if c != "payer_code"])

choice_rows = {name: variant_score(*args) for name, args in variants.items()}
choices = pd.DataFrame(choice_rows, index=["CV AP", "CV AUC"]).T
choices["AP change"] = choices["CV AP"] - choices.loc["Our cleaned features", "CV AP"]
choices.to_csv("tables/t08_cleaning_choices.csv")
choices.round(4)
''')

md("CHOICES_MD")

md("### 4.3 What the models learned")
code(r'''
# Logistic regression: odds ratios. Numeric features are z-scored, so their odds ratio is
# "per one standard deviation"; for a one-hot column it compares that level with the rest.
lr = fitted["Logistic regression"]
names = [n.split("__", 1)[1] for n in lr.named_steps["prep"].get_feature_names_out()]
odds = pd.Series(np.exp(lr.named_steps["clf"].coef_[0]), index=names).sort_values()
odds_table = pd.concat([odds.tail(8)[::-1], odds.head(6)]).to_frame("Odds ratio")
odds_table.to_csv("tables/t09_lr_odds_ratios.csv")
odds_table
''')

code(r'''
# Gradient boosting: permutation importance on the holdout patients. Each cleaned feature is
# shuffled in turn, and we measure how much average precision drops. A big drop = the model
# relies on that feature. (This uses the 28 cleaned features, before one-hot encoding.)
gb = fitted["Gradient boosting"]
perm = permutation_importance(gb, X_test, y_test, scoring="average_precision",
                              n_repeats=5, random_state=SEED, n_jobs=N_JOBS)
importance = (pd.DataFrame({"Drop in AP (mean)": perm.importances_mean, "SD": perm.importances_std},
                           index=X_test.columns).sort_values("Drop in AP (mean)", ascending=False))
importance.to_csv("tables/t10_permutation_importance.csv")
importance.head(10)
''')

md("IMPORTANCE_MD")

# =============================================================================
md("## 5. Choosing the final model")
md("CHOICE_MD")

code(r'''
FINAL_MODEL = "Gradient boosting"
final_settings = best_params[FINAL_MODEL]
print("Final model:", FINAL_MODEL, final_settings)
''')

# =============================================================================
md("## 6. Probability quality (calibration)")
code(r'''
# Out-of-fold predictions on the training patients: each stay is predicted by a model
# that never saw that patient. These are used for calibration and for the threshold.
oof = {}
for name in ["Logistic regression", "Gradient boosting"]:
    oof[name] = cross_val_predict(clone(fitted[name]), X_train, y_train, groups=g_train, cv=cv,
                                  method="predict_proba", n_jobs=N_JOBS)[:, 1]
    print(f"{name:20s} out-of-fold AP {average_precision_score(y_train, oof[name]):.4f} | "
          f"AUC {roc_auc_score(y_train, oof[name]):.4f} | Brier {brier_score_loss(y_train, oof[name]):.4f}")

# Reliability table: put stays into 10 equal-size groups by predicted probability and
# compare the average prediction with the share that was really readmitted.
p = oof[FINAL_MODEL]
decile = pd.qcut(p, 10, labels=False, duplicates="drop")
calib = pd.DataFrame({"Mean predicted (%)": pd.Series(p).groupby(decile).mean() * 100,
                      "Observed rate (%)": pd.Series(y_train).groupby(decile).mean() * 100,
                      "Stays": pd.Series(p).groupby(decile).size()})
calib.index = [f"Group {i + 1}" for i in calib.index]
calib.to_csv("tables/t11_calibration.csv")
calib
''')

code(r'''
# The same check with class weights: "balanced" weights are a common fix for imbalance,
# so we test what they do to the probabilities.
lr_bal = clone(fitted["Logistic regression"]).set_params(clf__class_weight="balanced")
p_bal = cross_val_predict(lr_bal, X_train, y_train, groups=g_train, cv=cv, method="predict_proba", n_jobs=N_JOBS)[:, 1]
print(f"Logistic regression, balanced weights: AP {average_precision_score(y_train, p_bal):.4f} | "
      f"AUC {roc_auc_score(y_train, p_bal):.4f} | Brier {brier_score_loss(y_train, p_bal):.4f} | "
      f"mean predicted {p_bal.mean():.3f} vs real rate {y_train.mean():.3f}")
''')

md("CALIB_MD")

# =============================================================================
md("## 7. Choosing the decision threshold")
md("THRESHOLD_INTRO_MD")

code(r'''
COST_MISS = 7            # cost of missing a patient who is readmitted (false negative)
COST_ALARM = 1           # cost of an unneeded follow-up (false positive)

def threshold_table(y_true, prob, thresholds):
    rows = []
    for t in thresholds:
        pred = (prob >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_true, pred, labels=[0, 1]).ravel()
        rows.append({"Threshold": t, "Flagged (%)": pred.mean() * 100,
                     "Precision": tp / max(tp + fp, 1), "Recall": tp / (tp + fn),
                     "F1": f1_score(y_true, pred, zero_division=0),
                     "False alarm rate": fp / (fp + tn),
                     "Cost per 100 stays": (COST_MISS * fn + COST_ALARM * fp) / len(y_true) * 100})
    return pd.DataFrame(rows)

grid_t = np.round(np.arange(0.05, 0.51, 0.01), 2)
thr = threshold_table(y_train, oof[FINAL_MODEL], grid_t)
best_cost = thr.loc[thr["Cost per 100 stays"].idxmin()]
best_f1 = thr.loc[thr["F1"].idxmax()]
THRESHOLD = float(best_cost["Threshold"])
print(f"Lowest cost (miss = {COST_MISS} x alarm): threshold {THRESHOLD:.2f}")
print(f"Highest F1: threshold {best_f1['Threshold']:.2f}")
show_t = [0.05, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.25, 0.30, 0.40, 0.50, THRESHOLD]
shown = thr[np.isclose(thr["Threshold"].to_numpy()[:, None], show_t).any(axis=1)]
shown.to_csv("tables/t12_thresholds.csv", index=False)
shown
''')

code(r'''
fig, axes = plt.subplots(1, 2, figsize=(13, 4.3))
axes[0].plot(thr["Threshold"], thr["Recall"], label="Recall (share of readmissions caught)", color="#C44E52")
axes[0].plot(thr["Threshold"], thr["Precision"], label="Precision (share of flags that are right)", color="#4C72B0")
axes[0].plot(thr["Threshold"], thr["F1"], label="F1", color="#55A868")
axes[0].plot(thr["Threshold"], thr["Flagged (%)"] / 100, label="Share of stays flagged", color="grey", linestyle=":")
axes[0].axvline(THRESHOLD, color="black", linestyle="--", label=f"Chosen threshold = {THRESHOLD:.2f}")
axes[0].set_xlabel("Decision threshold (predicted probability)")
axes[0].set_ylabel("Value (0 to 1)")
axes[0].set_title("Trade-off as the threshold moves (out-of-fold, training patients)")
axes[0].legend(fontsize=8)

for ratio, style in [(3, ":"), (5, "-"), (7, "--"), (10, "-.")]:
    tbl = thr.copy()
    pred_cost = []
    for t in tbl["Threshold"]:
        pred = (oof[FINAL_MODEL] >= t).astype(int)
        tn, fp, fn, tp = confusion_matrix(y_train, pred, labels=[0, 1]).ravel()
        pred_cost.append((ratio * fn + fp) / len(y_train) * 100)
    pred_cost = np.array(pred_cost)
    print(f"Miss = {ratio} x alarm: lowest cost at threshold {tbl['Threshold'][pred_cost.argmin()]:.2f}")
    axes[1].plot(tbl["Threshold"], pred_cost, linestyle=style, color="black" if ratio == COST_MISS else "grey",
                 label=f"miss = {ratio} x alarm (lowest at {tbl['Threshold'][pred_cost.argmin()]:.2f})")
axes[1].set_xlabel("Decision threshold (predicted probability)")
axes[1].set_ylabel("Total cost per 100 stays (alarm = 1 unit)")
axes[1].set_title("Cost of errors for different cost ratios")
axes[1].legend(fontsize=8)
plt.tight_layout()
plt.savefig("figures/f03_threshold.png", dpi=200, bbox_inches="tight")
plt.show()
''')

md("THRESHOLD_MD")

# =============================================================================
md("## 8. Final check on the holdout patients")
md(r"""
Everything so far used only the training patients. Now we use the holdout test patients **once**: each model,
refitted on all training patients with its chosen setting, predicts the 20% of patients it has never seen, and the
final model is scored at the chosen threshold. These are our patient-grouped validation results.
""")
code(r'''
holdout = {}
prob_test = {}
for name, model in fitted.items():
    prob_test[name] = model.predict_proba(X_test)[:, 1]
    holdout[name] = {"AP": average_precision_score(y_test, prob_test[name]),
                     "AUC": roc_auc_score(y_test, prob_test[name]),
                     "Brier": brier_score_loss(y_test, prob_test[name])}
holdout_table = pd.DataFrame(holdout).T
holdout_table["CV AP (training)"] = [cv_results[m]["AP"] for m in holdout_table.index]
holdout_table.index.name = "Model (holdout test patients)"
holdout_table.to_csv("tables/t13_holdout.csv")
holdout_table
''')

code(r'''
p_final = prob_test[FINAL_MODEL]
pred_final = (p_final >= THRESHOLD).astype(int)
tn, fp, fn, tp = confusion_matrix(y_test, pred_final).ravel()
final_metrics = pd.Series({
    "Average precision": average_precision_score(y_test, p_final),
    "ROC-AUC": roc_auc_score(y_test, p_final),
    "Brier score": brier_score_loss(y_test, p_final),
    "Threshold": THRESHOLD,
    "Precision": precision_score(y_test, pred_final),
    "Recall": recall_score(y_test, pred_final),
    "F1": f1_score(y_test, pred_final),
    "Flagged (%)": pred_final.mean() * 100,
})
final_metrics.to_csv("tables/t14_final_holdout_metrics.csv")
cm = pd.DataFrame([[tp, fn], [fp, tn]], index=["Actually readmitted <30", "Not readmitted <30"],
                  columns=["Flagged", "Not flagged"])
cm.to_csv("tables/t15_confusion_matrix.csv")
display(final_metrics.to_frame("Holdout value"))
cm
''')

code(r'''
fig, ax = plt.subplots(figsize=(6.5, 4.5))
for name, colour in [("Gradient boosting", "#4C72B0"), ("Random forest", "#8172B2"),
                     ("Logistic regression", "#C44E52"), ("Decision tree", "#55A868")]:
    prec, rec, _ = precision_recall_curve(y_test, prob_test[name])
    ax.plot(rec, prec, color=colour, label=f"{name} (AP = {holdout[name]['AP']:.3f})")
ax.axhline(y_test.mean(), color="grey", linestyle=":", label=f"No skill (AP = {y_test.mean():.3f})")
ax.scatter([recall_score(y_test, pred_final)], [precision_score(y_test, pred_final)], color="black", zorder=5,
           label=f"Chosen threshold {THRESHOLD:.2f}")
ax.set_xlabel("Recall (share of early readmissions caught)")
ax.set_ylabel("Precision (share of flagged stays readmitted)")
ax.set_title("Precision-recall curves on the holdout patients")
ax.legend(fontsize=8)
plt.tight_layout()
plt.savefig("figures/f04_pr_curves.png", dpi=200, bbox_inches="tight")
plt.show()
''')

md("HOLDOUT_MD")

# =============================================================================
md("## 9. Performance across patient groups")
md(r"""
We check the final model on the holdout patients for each **age band**, **gender** and **race** group. For each group
we report its size, how many early readmissions it has, and how the model does on it.
- **AUC** and **average precision**: how well the model ranks patients inside the group. AP depends on the group's
  own readmission rate, so it is compared with that rate.
- **Recall** (at our threshold): the share of the group's early readmissions that the model catches. A low recall
  means the group's high-risk patients are more often **missed**.
- **False alarm rate**: the share of the group's non-readmitted patients who are flagged anyway.
- **Mean predicted vs observed rate**: whether the probabilities are too high or too low for that group.
""")
code(r'''
test_raw = raw.iloc[test_idx].reset_index(drop=True)
age_band = pd.cut(test_raw["age"].str.extract(r"(\d+)")[0].astype(int), bins=[0, 40, 60, 80, 100], right=False,
                  labels=["Under 40", "40-59", "60-79", "80 and over"])

def group_metrics(labels, title):
    rows = []
    for level in pd.Series(labels).dropna().unique():
        m = (pd.Series(labels) == level).to_numpy()
        yt, pt, pr = y_test[m], p_final[m], pred_final[m]
        has_both = 0 < yt.sum() < len(yt)
        rows.append({"Variable": title, "Group": level, "Stays": m.sum(), "Readmitted <30": int(yt.sum()),
                     "Rate (%)": yt.mean() * 100,
                     "Mean predicted (%)": pt.mean() * 100,
                     "AUC": roc_auc_score(yt, pt) if has_both else np.nan,
                     "AP": average_precision_score(yt, pt) if has_both else np.nan,
                     "Recall": pr[yt == 1].mean() if yt.sum() else np.nan,
                     "False alarm rate": pr[yt == 0].mean(),
                     "Precision": yt[pr == 1].mean() if pr.sum() else np.nan})
    return pd.DataFrame(rows).sort_values("Stays", ascending=False)

fairness = pd.concat([group_metrics(age_band.astype(str), "Age"),
                      group_metrics(test_raw["gender"], "Gender"),
                      group_metrics(test_raw["race"].replace("?", "Unknown"), "Race")], ignore_index=True)
overall = group_metrics(np.array(["All"] * len(y_test)), "All")
fairness = pd.concat([overall, fairness], ignore_index=True)
fairness.to_csv("tables/t16_subgroups.csv", index=False)
fairness
''')

code(r'''
fig, axes = plt.subplots(1, 2, figsize=(13, 4.3))
plot_df = fairness[(fairness["Stays"] >= 100) & (fairness["Variable"] != "All")].copy()
plot_df["Label"] = plot_df["Group"] + "  (n=" + plot_df["Stays"].map("{:,}".format) + ")"
yy = np.arange(len(plot_df))
axes[0].barh(yy, plot_df["Recall"], color="#C44E52")
axes[0].axvline(fairness.loc[fairness["Group"] == "All", "Recall"].item(), color="black", linestyle="--", label="All patients")
axes[0].set_yticks(yy, plot_df["Label"])
axes[0].set_xlabel("Recall at the chosen threshold (share of early readmissions caught)")
axes[0].set_title("Who gets missed?")
axes[0].legend()
axes[1].barh(yy, plot_df["AUC"], color="#4C72B0")
axes[1].axvline(fairness.loc[fairness["Group"] == "All", "AUC"].item(), color="black", linestyle="--", label="All patients")
axes[1].set_yticks(yy, [""] * len(yy))
axes[1].set_xlim(0.5, 0.75)
axes[1].set_xlabel("ROC-AUC within the group")
axes[1].set_title("How well are patients ranked inside each group?")
axes[1].legend()
plt.tight_layout()
plt.savefig("figures/f05_subgroups.png", dpi=200, bbox_inches="tight")
plt.show()
''')

md("FAIRNESS_MD")

code(r'''
# Did leaving race out of the inputs help or hurt the race groups? Refit the chosen setting
# with race added back (training patients only) and compare on the holdout patients.
race_test = test_raw["race"].replace("?", "Unknown")
X_train_r = X_train.assign(race=train_raw["race"].replace("?", "Unknown").to_numpy())
X_test_r = X_test.assign(race=race_test.to_numpy())
with_race = Pipeline([("prep", make_preprocessor(NUMERIC_FEATURES, CATEGORICAL_FEATURES + ["race"])),
                      ("clf", clone(gb_setting))]).fit(X_train_r, y_train)
p_race = with_race.predict_proba(X_test_r)[:, 1]
print(f"Holdout AP without race {average_precision_score(y_test, p_final):.4f} | with race {average_precision_score(y_test, p_race):.4f}")

rows = []
for g in ["Caucasian", "AfricanAmerican", "Hispanic"]:
    m = (race_test == g).to_numpy()
    for label, pp in [("Without race (submitted)", p_final), ("With race", p_race)]:
        rows.append({"Group": g, "Model": label, "Stays": m.sum(),
                     "Observed rate (%)": y_test[m].mean() * 100, "Mean predicted (%)": pp[m].mean() * 100,
                     "Recall": ((pp[m] >= THRESHOLD) & (y_test[m] == 1)).sum() / y_test[m].sum()})
race_check = pd.DataFrame(rows).set_index(["Group", "Model"])
race_check.to_csv("tables/t17_race_input_check.csv")
race_check.round(3)
''')

md("RACE_MD")

# =============================================================================
md("## 10. Final model for submission")
md(r"""
The final pipeline is the chosen model with its chosen setting, **refitted on all 81,281 development stays**
(training and holdout patients together), because more patients give a better model and the settings and threshold
are already fixed. The threshold stays the one chosen on the training patients.
""")
code(r'''
final_pipeline = clone(fitted[FINAL_MODEL]).fit(X, y)
Path("model").mkdir(exist_ok=True)
joblib.dump(final_pipeline, "model/pipeline.joblib")
with open("threshold.json", "w") as f:
    json.dump({"threshold": round(THRESHOLD, 2)}, f)
print("Saved model/pipeline.joblib and threshold.json =", round(THRESHOLD, 2))
print(final_pipeline)
''')

md(r"""
### Self-check of the prediction script
We run `predict.py` the way the instructor will, on a 500-row sample without the target, and then on a deliberately
messy copy (unseen codes, `"?"` in numeric columns, a missing column, a blank row) to make sure it never crashes and
always returns one valid probability per row, in order.
""")
code(r'''
import importlib
importlib.reload(predict)   # loads the model file we just saved

sample = raw.sample(500, random_state=SEED).drop(columns=["readmitted"])
p_sample = predict.predict_proba(sample)

messy = sample.copy().astype(object)
messy.iloc[:5, messy.columns.get_loc("diag_1")] = "999.9X"           # diagnosis code never seen
messy.iloc[:5, messy.columns.get_loc("admission_type_id")] = 99      # ID code not in IDS_mapping
messy.iloc[:5, messy.columns.get_loc("payer_code")] = "ZZ"           # unseen payer
messy.iloc[5:10, messy.columns.get_loc("num_medications")] = "?"     # "?" in a numeric column
messy.iloc[10, :] = np.nan                                           # completely blank row
messy = messy.drop(columns=["medical_specialty"])                     # a whole column missing
p_messy = predict.predict_proba(messy)

for label, p_ in [("sample", p_sample), ("messy", p_messy)]:
    assert p_.shape == (500,) and np.isfinite(p_).all() and (p_ >= 0).all() and (p_ <= 1).all()
    print(f"{label}: 500 probabilities, min {p_.min():.3f}, max {p_.max():.3f}, no NaN")
print("Saved model reproduces itself:", np.allclose(p_sample, final_pipeline.predict_proba(clean(sample))[:, 1]))
''')

md("CLOSING_MD")

nb = nbf.v4.new_notebook()
nb["cells"] = cells
nb["metadata"] = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                  "language_info": {"name": "python"}}
missing = [c.source for c in cells if c.cell_type == "markdown" and c.source.strip().endswith("_MD")]
if missing:
    print("WARNING, placeholders without text:", missing)
nbf.write(nb, OUT)
print("wrote", OUT, len(cells), "cells")
