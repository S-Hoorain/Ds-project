"""Shared code for the Milestone 3 baseline models of the price-shock early-warning system.

Used by notebooks/03_baseline_models.ipynb and src/models/train_baselines.py, so the notebook
and the script produce the same numbers from the same code.

The task: standing at the end of week t, predict whether week t+1 will be a price-shock week
(SPI rise of at least 1%) for each quintile group. Target column: target_shock_next.

Decisions (B = baseline modelling; D1-D5 and F1-F4 are the M2 data and feature decisions):
  B1 Rows: Q1-Q5 only. The Combined index is a weighted average of the quintiles, so adding it
     would count the same week's information a sixth time.
  B2 Split: chronological. Train = weeks up to 2024-12-31, test = 2025-01 onward. Fixed in M2,
     before any model was fit. No shuffling: the test weeks are all later than the training weeks.
  B3 Validation: expanding-window cross-validation over WHOLE WEEKS (all five quintile rows of a
     week stay in the same fold), so a model is never validated on a week earlier than the weeks it
     was trained on, and never sees a sister quintile of a validation week.
  B4 Scaling is part of each model's Pipeline, so it is re-fitted on the training part of every
     fold. (The M2 *_z / *_mm columns were scaled on the whole training period and would leak
     later folds into earlier ones, so they are not used here.)
  B5 Tuning metric: ROC-AUC (threshold-free, unaffected by the 17% shock rate), computed on the
     POOLED out-of-fold predictions of all validation years, because one alarm threshold has to
     work in every year. The mean and SD of the per-fold AUCs are reported alongside.
  B6 Imbalance: no resampling. Class weights are a tuning option (LR, tree), the alarm threshold is
     chosen by cost, and metrics include recall, specificity, F1 and PR-AUC.
  B7 Threshold: chosen on out-of-fold predictions (training period only) to minimise expected
     social cost, with a missed shock (FN) costing COST_FN times a false alarm (FP).
  B8 Listwise deletion of rows with a missing feature or target (structural gaps in the first
     8 weeks and the last week; promised in M2, Table 2).
"""

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.base import BaseEstimator, ClassifierMixin, clone
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
                             roc_auc_score)
from sklearn.model_selection import ParameterGrid, StratifiedGroupKFold, StratifiedKFold
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parents[2]
TRAIN_END = pd.Timestamp("2024-12-31")
GROUPS = ["Q1", "Q2", "Q3", "Q4", "Q5"]
TARGET = "target_shock_next"
SEED = 42
VAL_YEARS = [2021, 2022, 2023, 2024]   # B3: one validation block per calendar year (4 folds)
N_FOLDS = len(VAL_YEARS)
COST_FP, COST_FN = 1.0, 5.0          # B7: a missed shock costs five false alarms (sensitivity analysed)
COST_RATIOS = [1, 2, 3, 5, 10, 20]   # FN : FP ratios for the sensitivity analysis

# ---------------------------------------------------------------- features (all known at the end of week t)
# Group names follow the M2 hypothesis H1: logit P(shock next week) = a_g + g'(own history) + b'(signals).
OWN_HISTORY = ["spi_wow_pct", "spi_chg_4w"]
SIGNALS = ["fx_chg_8w", "shocks_last_4w", "momentum_spikes_4w", "infl_staples_4w",
           "fuel_review_next_week", "fy_start_next_week"]
# Momentum of the volatile components; EDA (M2 Section III-F) found utility and fuel momentum
# relate to Q5's future inflation more than to Q1's.
COMPONENTS = ["infl_perishables_4w", "infl_utilities_4w", "infl_motor_fuel_4w"]
CONTROLS = ["policy_rate", "ramadan_next_week", "pre_eid_adha_4w"]
GROUP_DUMMIES = ["grp_Q1", "grp_Q2", "grp_Q3", "grp_Q4"]   # Q5 (richest) is the reference group

FEATURES = OWN_HISTORY + SIGNALS + COMPONENTS + CONTROLS + GROUP_DUMMIES
BINARY = ["fuel_review_next_week", "fy_start_next_week", "ramadan_next_week", "pre_eid_adha_4w"] + GROUP_DUMMIES
CONTINUOUS = [f for f in FEATURES if f not in BINARY]
H1_BASE = OWN_HISTORY + CONTROLS + GROUP_DUMMIES   # own-history baseline of hypothesis H1
H1_FULL = H1_BASE + SIGNALS                        # ... plus the six lead signals

LABELS = {
    "spi_wow_pct": "SPI change this week (%)",
    "spi_chg_4w": "SPI change, past 4 weeks (%)",
    "fx_chg_8w": "PKR/USD change, past 8 weeks (%)",
    "shocks_last_4w": "Shock weeks in past 4 weeks",
    "momentum_spikes_4w": "Momentum-item spikes, past 4 weeks",
    "infl_staples_4w": "Staple-food inflation, past 4 weeks (%)",
    "fuel_review_next_week": "Fuel-price review next week",
    "fy_start_next_week": "Fiscal year starts next week",
    "infl_perishables_4w": "Perishables inflation, past 4 weeks (%)",
    "infl_utilities_4w": "Utility-tariff inflation, past 4 weeks (%)",
    "infl_motor_fuel_4w": "Motor-fuel inflation, past 4 weeks (%)",
    "policy_rate": "SBP policy rate (%)",
    "ramadan_next_week": "Ramadan next week",
    "pre_eid_adha_4w": "Eid ul-Adha within 4 weeks",
    "grp_Q1": "Group Q1 (vs Q5)", "grp_Q2": "Group Q2 (vs Q5)",
    "grp_Q3": "Group Q3 (vs Q5)", "grp_Q4": "Group Q4 (vs Q5)",
}


# ---------------------------------------------------------------- data
def load_model_data():
    """Quintile rows of master_features.csv with complete features and target (B1, B8)."""
    df = pd.read_csv(ROOT / "data" / "processed" / "master_features.csv", parse_dates=["week_end"])
    df = df[df["group"].isin(GROUPS)].copy()
    n_before = len(df)
    df = df.dropna(subset=FEATURES + [TARGET]).copy()
    df[TARGET] = df[TARGET].astype(int)
    df["shock_now"] = df["shock_now"].astype(int)
    df["split"] = np.where(df["week_end"] <= TRAIN_END, "train", "test")
    df = df.sort_values(["week_end", "group"]).reset_index(drop=True)
    df.attrs["rows_dropped"] = n_before - len(df)
    return df


def split_train_test(df):
    train = df[df["split"] == "train"].reset_index(drop=True)
    test = df[df["split"] == "test"].reset_index(drop=True)
    return train, test


# ---------------------------------------------------------------- validation (B3)
def time_series_folds(train, val_years=VAL_YEARS):
    """Expanding-window ("forward-chaining") folds with one calendar year per validation block.

    Fold k validates on every week of year val_years[k] and trains on ALL weeks before 1 January of
    that year, so the training window grows fold by fold and never includes a later week. Whole
    weeks move together, so the five quintile rows of a week are never split across train and
    validation. A calendar year is used (rather than equal-sized blocks) so that every validation
    block contains exactly one fiscal-year start, one Ramadan and one Eid ul-Adha.
    No gap is needed: the target is one week ahead, so the last training label (the shock in the
    first validation week) is already known when that week's forecast is made.
    Returns a list of (train_row_positions, validation_row_positions).
    """
    year = train["week_end"].dt.year.to_numpy()
    return [(np.flatnonzero(year < y), np.flatnonzero(year == y)) for y in val_years]


def random_folds(train, n_splits=N_FOLDS, by_week=False):
    """Shuffled stratified K-fold, used ONLY to show how much it overstates performance.
    by_week=False shuffles rows (sister quintiles of a week land in different folds);
    by_week=True keeps a week's rows together but still lets the future predict the past."""
    if by_week:
        cv = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
        return list(cv.split(train, train[TARGET], groups=train["week_end"]))
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    return list(cv.split(train, train[TARGET]))


def fold_table(train, folds):
    rows = []
    for k, (tr, va) in enumerate(folds, 1):
        a, b = train.iloc[tr], train.iloc[va]
        rows.append({"fold": k,
                     "train weeks": f"{a['week_end'].min():%d %b %Y} – {a['week_end'].max():%d %b %Y}",
                     "n train weeks": a["week_end"].nunique(),
                     "validation weeks": f"{b['week_end'].min():%d %b %Y} – {b['week_end'].max():%d %b %Y}",
                     "n validation weeks": b["week_end"].nunique(),
                     "train shock rate %": 100 * a[TARGET].mean(),
                     "validation shock rate %": 100 * b[TARGET].mean(),
                     "validation shocks (rows)": int(b[TARGET].sum())})
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- models and grids
def make_models():
    """The three baseline pipelines and their hyperparameter grids.

    Logistic regression: every feature standardised (z-scores), so the L1/L2 penalty treats all
    features alike and the coefficients are standardised coefficients. The saga solver is used
    because it fits both penalties of the grid (chosen with l1_ratio).
    KNN: distances need comparable scales. Continuous features are scaled (z-score or Min-Max,
    chosen by CV); 0/1 flags pass through unchanged, so a rare flag such as the fiscal-year start
    (z of about 7 when on) does not swamp the distance.
    Decision tree: splits are thresholds on one feature at a time, so it needs no scaling.
    """
    lr = Pipeline([("scale", StandardScaler()),
                   ("model", LogisticRegression(solver="saga", max_iter=20000, random_state=SEED))])
    knn = Pipeline([("scale", ColumnTransformer([("cont", StandardScaler(), CONTINUOUS)], remainder="passthrough")),
                    ("model", KNeighborsClassifier())])
    tree = Pipeline([("model", DecisionTreeClassifier(random_state=SEED))])
    grids = {
        "Logistic regression": {
            "model__C": [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 100],  # C = 1 / penalty strength
            "model__l1_ratio": [0.0, 1.0],                                            # 0 = L2 (ridge), 1 = L1 (lasso)
            "model__class_weight": [None, "balanced"],
        },
        "KNN": {
            # Upper end limited by the smallest training fold (fold 1: about 300 rows).
            "model__n_neighbors": [5, 10, 15, 25, 35, 50, 75, 100, 150, 200, 250],
            "model__weights": ["uniform", "distance"],
            "scale__cont": [StandardScaler(), MinMaxScaler()],
        },
        "Decision tree": {
            "model__max_depth": [1, 2, 3, 4, 5, 6, 8],
            "model__min_samples_leaf": [5, 10, 20, 40, 80, 120, 160],
            "model__class_weight": [None, "balanced"],
        },
    }
    return {"Logistic regression": lr, "KNN": knn, "Decision tree": tree}, grids


def _short(params):
    # "model__n_neighbors" -> "n_neighbors"; a scaler object -> its class name.
    return {k.split("__")[-1]: (type(v).__name__ if hasattr(v, "fit") else v) for k, v in params.items()}


def grid_search_time_cv(pipe, grid, X, y, folds):
    """Systematic grid search over the time-series folds (B5).

    For every configuration in the grid, the model is trained on each fold's training weeks and
    predicts that fold's validation year. Two scores are kept:
      * pooled AUC: one ROC-AUC over the stacked out-of-fold predictions of all four validation
        years. This is the SELECTION criterion, because the early-warning system uses one alarm
        threshold for every year, so a probability of 0.3 must mean the same in 2022 as in 2024.
        A model that ranks weeks well within each year but whose level drifts between years
        scores well fold by fold yet badly here.
      * mean and SD of the per-fold AUCs: the usual K-fold summary, and the fold-to-fold variance.
    The train AUC (on each fold's own training weeks) is kept to diagnose over- and underfitting.
    The best configuration is then refitted on the whole training period.
    Returns (results table sorted by pooled AUC, refitted best pipeline, its out-of-fold predictions).
    """
    rows, oofs = [], []
    val = np.concatenate([va for _, va in folds])
    for params in ParameterGrid(grid):
        est = clone(pipe).set_params(**params)
        oof = np.full(len(X), np.nan)
        fold_auc, train_auc = [], []
        for tr, va in folds:
            m = clone(est).fit(X.iloc[tr], y.iloc[tr])
            oof[va] = m.predict_proba(X.iloc[va])[:, 1]
            fold_auc.append(roc_auc_score(y.iloc[va], oof[va]))
            train_auc.append(roc_auc_score(y.iloc[tr], m.predict_proba(X.iloc[tr])[:, 1]))
        rows.append({**_short(params), "pooled CV AUC": roc_auc_score(y.iloc[val], oof[val]),
                     "mean fold AUC": np.mean(fold_auc), "fold AUC SD": np.std(fold_auc),
                     **{f"AUC {k + 1}": a for k, a in enumerate(fold_auc)},
                     "train AUC": np.mean(train_auc), "_params": params})
        oofs.append(oof)
    res = pd.DataFrame(rows)
    best = int(res["pooled CV AUC"].idxmax())
    best_model = clone(pipe).set_params(**res.loc[best, "_params"]).fit(X, y)
    res["selected"] = res.index == best
    oof_best = oofs[best]
    res = res.sort_values("pooled CV AUC", ascending=False).reset_index(drop=True)
    return res, best_model, oof_best


def oof_predict(estimator, X, y, folds):
    """Out-of-fold probabilities: each validation week is predicted by a model trained only on
    earlier weeks. Rows in the first block (never validated) stay NaN."""
    p = np.full(len(X), np.nan)
    for tr, va in folds:
        m = clone(estimator).fit(X.iloc[tr], y.iloc[tr])
        p[va] = m.predict_proba(X.iloc[va])[:, 1]
    return p


def cv_permutation_importance(estimator, X, y, folds, n_repeats=20, seed=SEED):
    """Permutation importance measured on data the model has not seen: in each fold, fit on the
    training weeks, then shuffle one feature at a time in the validation year and record the drop
    in ROC-AUC. Averaged over folds and repeats. Training-period data only; the test set is kept
    for evaluation."""
    drops = []
    for tr, va in folds:
        m = clone(estimator).fit(X.iloc[tr], y.iloc[tr])
        r = permutation_importance(m, X.iloc[va], y.iloc[va], scoring="roc_auc", n_repeats=n_repeats,
                                   random_state=seed)
        drops.append(r.importances_mean)
    d = np.vstack(drops)
    return pd.DataFrame({"feature": X.columns, "mean AUC drop": d.mean(axis=0), "SD across folds": d.std(axis=0)})


class Persistence(ClassifierMixin, BaseEstimator):
    """Naive heuristic: next week will be a shock week if this week was one (SPI rise >= 1%).
    Nothing is learned; fit() only records the class labels so sklearn tools accept it."""

    def fit(self, X, y=None):
        self.classes_ = np.array([0, 1])
        return self

    def predict_proba(self, X):
        s = (X["spi_wow_pct"].to_numpy() >= 1.0).astype(float)
        return np.column_stack([1 - s, s])


def make_benchmarks():
    """Majority class: always predicts 'no shock'; its probability is the training shock rate.
    Persistence: repeats this week's shock status."""
    return {"Majority class": DummyClassifier(strategy="prior"), "Persistence": Persistence()}


# ---------------------------------------------------------------- metrics, costs and thresholds
def classification_metrics(y, p, threshold, c_fp=COST_FP, c_fn=COST_FN):
    """All rubric metrics for probabilities p and an alarm threshold (alert if p >= threshold)."""
    y = np.asarray(y).astype(int)
    p = np.asarray(p, float)
    pred = (p >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    prec = tp / (tp + fp) if tp + fp else np.nan       # undefined when the model never raises an alarm
    rec = tp / (tp + fn) if tp + fn else np.nan
    spec = tn / (tn + fp) if tn + fp else np.nan
    f1 = 2 * prec * rec / (prec + rec) if (tp > 0) else 0.0
    two_classes = len(np.unique(y)) == 2
    return {"threshold": threshold, "accuracy": (tp + tn) / len(y), "precision": prec, "recall": rec,
            "specificity": spec, "F1": f1,
            "ROC-AUC": roc_auc_score(y, p) if two_classes else np.nan,
            "PR-AUC": average_precision_score(y, p) if two_classes else np.nan,
            "Brier": brier_score_loss(y, p), "alerts": tp + fp, "TP": tp, "FP": fp, "FN": fn, "TN": tn,
            "cost": c_fp * fp + c_fn * fn}


def expected_cost(y, p, threshold, c_fp=COST_FP, c_fn=COST_FN):
    pred = np.asarray(p) >= threshold
    y = np.asarray(y).astype(bool)
    return c_fp * np.sum(pred & ~y) + c_fn * np.sum(~pred & y)


def best_threshold(y, p, c_fp=COST_FP, c_fn=COST_FN, grid=None):
    """Threshold that minimises expected cost on (out-of-fold) predictions. When several thresholds
    tie, take the middle of the flat optimum. NaN predictions (never-validated rows) are ignored."""
    y, p = np.asarray(y), np.asarray(p, float)
    keep = ~np.isnan(p)
    y, p = y[keep], p[keep]
    grid = np.round(np.arange(0.01, 1.00, 0.01), 2) if grid is None else grid
    costs = np.array([expected_cost(y, p, t, c_fp, c_fn) for t in grid])
    ties = grid[costs == costs.min()]
    return float(ties[len(ties) // 2])


def trivial_policy_costs(y, c_fp=COST_FP, c_fn=COST_FN):
    """Cost of never alerting (every shock missed) and of alerting every week (every calm week a false alarm)."""
    y = np.asarray(y).astype(int)
    return {"never alert": c_fn * y.sum(), "always alert": c_fp * (len(y) - y.sum())}


def fit_logit(d, cols):
    """Unpenalised logit (statsmodels) with standard errors clustered by week, because the five
    quintile rows of a week share the same week-level signals and are not independent. Used for
    the formal H1 test and for odds ratios with confidence intervals."""
    X = sm.add_constant(d[cols].astype(float), has_constant="add")
    return sm.Logit(d[TARGET], X).fit(disp=0, cov_type="cluster",
                                      cov_kwds={"groups": pd.factorize(d["week_end"])[0]})


def logit_predict(model, d, cols):
    return np.asarray(model.predict(sm.add_constant(d[cols].astype(float), has_constant="add")))


def save_models(fitted, card, out_dir=None):
    """Save fitted pipelines (joblib) and a JSON model card (features, settings, thresholds, scores)."""
    out_dir = Path(out_dir or ROOT / "models" / "m3_baselines")
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, model in fitted.items():
        joblib.dump(model, out_dir / (name.lower().replace(" ", "_") + ".joblib"))
    (out_dir / "model_card.json").write_text(json.dumps(card, indent=2, default=str), encoding="utf-8")
    return out_dir


# ---------------------------------------------------------------- uncertainty: week-block bootstrap
def week_block_bootstrap(y, scores, weeks, n_boot=2000, seed=SEED):
    """Bootstrap sampling (sampling with replacement) of whole weeks: the five quintile rows of a
    week are drawn together, because they share the same signals and usually the same outcome, so
    they are one block of evidence rather than five. Recomputes the AUC of each score on every
    resample, which gives confidence intervals for an AUC and for the difference between two AUCs.
    Returns a DataFrame with one row per resample and one column per score.
    Resamples without both classes are skipped."""
    rng = np.random.default_rng(seed)
    y = np.asarray(y).astype(int)
    weeks = np.asarray(weeks)
    uniq = np.unique(weeks)
    rows_of = {w: np.flatnonzero(weeks == w) for w in uniq}
    out = []
    for _ in range(n_boot):
        idx = np.concatenate([rows_of[w] for w in rng.choice(uniq, size=len(uniq), replace=True)])
        if y[idx].min() == y[idx].max():
            continue
        out.append({k: roc_auc_score(y[idx], np.asarray(s)[idx]) for k, s in scores.items()})
    return pd.DataFrame(out)
