"""Shared code for the Milestone 4 models and the fairness audit of the price-shock early-warning system.

Used by notebooks/05_advanced_models.ipynb and notebooks/06_fairness_audit.ipynb. It builds on
src/models/baseline.py (Milestone 3), which is left unchanged so the M3 numbers stay reproducible.

What changes from Milestone 3 (A = advanced-model decisions; B1-B20 are the M3 decisions):
  A1 Two ensembles are added, a random forest and gradient boosting (HistGradientBoostingClassifier),
     and the three M3 learners are re-tuned under the same M4 protocol, so that the gain from the
     ensembles can be separated from the gain from the new features and the new selection rule.
  A2 Selection by within-year AUC: the mean of the four per-fold ROC-AUCs. M3 selected by pooled AUC,
     which partly rewards telling crisis years from calm years (it flattered the tree). Pooled AUC,
     PR-AUC and the Brier score are still reported.
  A3 Two new features, both derived from data already in master_features.csv:
       shock_rate_26w   share of the group's last 26 weeks that were shock weeks (lets the predicted
                        level follow the regime, so one threshold can work in calm and crisis years)
       july_next_week   week t+1 ends in July, the first month of the fiscal year (budget measures and
                        tariff rebasing spread over the month, not only its first week)
     Both were suggested by the M3 test-period errors, which is disclosed in the report.
  A4 Grids extended with the split criterion (Gini/entropy) for the tree and the forest and with the
     distance (Euclidean/Manhattan) for KNN, the two defaults the M3 afterwards-check found not best.
  A5 Same folds, threshold rule and cost ratio as M3 (expanding window 2021-24, FN : FP = 5 : 1).
  A6 Final model: the highest within-year AUC among the learners that accept row weights (all but
     KNN), because the pre- and in-processing mitigations retrain the final model with row weights.
     Chosen by the team after the CV results showed KNN and the forest tied (0.683 vs 0.678).
Fairness (R = responsible-use decisions; F1-F4 are the M2 feature decisions):
  R1 Sensitive attribute: consumption quintile. Unprivileged group Q1 (poorest), privileged group Q5.
     An alarm is the favourable outcome (it triggers protection), so a low alarm rate or a low recall
     for Q1 is the harm to look for.
  R2 The audit is run on the 2021-24 out-of-fold predictions (about 40 shock rows per quintile) and
     repeated on the test period (6-9 shock rows per quintile), with week-block bootstrap intervals.
  R3 Mitigation: reweighing (pre-processing), group-weighted training costs (in-processing) and
     quintile-specific thresholds (post-processing), all chosen on 2021-24 out-of-fold predictions.
  R4 A missed Q1 shock costs Q1_MISS_MULT times a missed shock elsewhere in the group-cost policy
     (a value judgement; 1 to 3 reported).
"""

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import ParameterGrid
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from models import baseline as B

ROOT, SEED, TARGET, GROUPS = B.ROOT, B.SEED, B.TARGET, B.GROUPS
UNPRIV, PRIV = "Q1", "Q5"
RATE_WINDOW = 26                      # A3: half a year of history for the rolling shock rate
Q1_MISS_MULT = 2.0                    # R4: a missed Q1 shock counts twice
MISS_MULTS = [1.0, 1.5, 2.0, 3.0]     # sensitivity of the Q1 miss cost

NEW_FEATURES = ["shock_rate_26w", "july_next_week"]
FEATURES = B.FEATURES + NEW_FEATURES
BINARY = B.BINARY + ["july_next_week"]
CONTINUOUS = [f for f in FEATURES if f not in BINARY]
LABELS = {**B.LABELS, "shock_rate_26w": "Shock rate, past 26 weeks", "july_next_week": "Next week is in July"}

MODELS = ["Logistic regression", "KNN", "Decision tree", "Random forest", "Gradient boosting"]
ENSEMBLES = ["Random forest", "Gradient boosting"]


# ---------------------------------------------------------------- data (A3)
def load_model_data(rate_window=RATE_WINDOW):
    """Quintile rows with complete M4 features and target. Same rows as Milestone 3 (1,805)."""
    df = pd.read_csv(ROOT / "data" / "processed" / "master_features.csv", parse_dates=["week_end"])
    df = df[df["group"].isin(GROUPS)].copy()
    df = df.sort_values(["group", "week_end"])
    df["shock_rate_26w"] = (df.groupby("group")["shock_now"]
                              .transform(lambda s: s.rolling(rate_window, min_periods=8).mean()))
    df["july_next_week"] = ((df["week_end"] + pd.Timedelta(days=7)).dt.month == 7).astype(int)
    n_before = len(df)
    df = df.dropna(subset=FEATURES + [TARGET]).copy()
    df[TARGET] = df[TARGET].astype(int)
    df["shock_now"] = df["shock_now"].astype(int)
    df["split"] = np.where(df["week_end"] <= B.TRAIN_END, "train", "test")
    df = df.sort_values(["week_end", "group"]).reset_index(drop=True)
    df.attrs["rows_dropped"] = n_before - len(df)
    return df


# ---------------------------------------------------------------- models and grids (A1, A4)
def make_models():
    """Five learners under one protocol. The three M3 learners keep their M3 grids, extended by the
    split criterion (tree) and the distance (KNN). The two ensembles are new.

    Random forest: many deep-ish trees, each grown on a bootstrap sample of the weeks and choosing each
    split from a random subset of features; the forest averages their votes, which lowers the variance
    that made the single tree unstable. Trees need no scaling.
    Gradient boosting: shallow trees added one after another, each fitted to the errors the previous
    ones left; a small learning rate and few leaves keep it from memorising the training weeks.
    """
    lr = Pipeline([("scale", StandardScaler()),
                   ("model", LogisticRegression(solver="saga", max_iter=20000, random_state=SEED))])
    knn = Pipeline([("scale", ColumnTransformer([("cont", StandardScaler(), CONTINUOUS)], remainder="passthrough")),
                    ("model", KNeighborsClassifier())])
    tree = Pipeline([("model", DecisionTreeClassifier(random_state=SEED))])
    rf = Pipeline([("model", RandomForestClassifier(n_estimators=300, random_state=SEED, n_jobs=-1))])
    gb = Pipeline([("model", HistGradientBoostingClassifier(random_state=SEED, early_stopping=False))])
    grids = {
        "Logistic regression": {
            "model__C": [0.0001, 0.0003, 0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 100],
            "model__l1_ratio": [0.0, 1.0],
            "model__class_weight": [None, "balanced"],
        },
        "KNN": {
            "model__n_neighbors": [5, 10, 15, 25, 35, 50, 75, 100, 150, 200, 250],
            "model__weights": ["uniform", "distance"],
            "model__metric": ["euclidean", "manhattan"],
            "scale__cont": [StandardScaler(), MinMaxScaler()],
        },
        "Decision tree": {
            "model__max_depth": [1, 2, 3, 4, 5, 6, 8],
            "model__min_samples_leaf": [5, 10, 20, 40, 80, 120, 160],
            "model__criterion": ["gini", "entropy"],
            "model__class_weight": [None, "balanced"],
        },
        "Random forest": {
            "model__max_depth": [3, 5, 8, None],
            "model__min_samples_leaf": [5, 20, 50, 100],
            "model__max_features": ["sqrt", 0.5],
            "model__criterion": ["gini", "entropy"],
            "model__class_weight": [None, "balanced_subsample"],
        },
        "Gradient boosting": {
            "model__learning_rate": [0.01, 0.03, 0.1],
            "model__max_iter": [100, 300],
            "model__max_depth": [2, 3],
            "model__min_samples_leaf": [20, 50, 100],
            "model__l2_regularization": [0.0, 1.0],
            "model__class_weight": [None, "balanced"],
        },
    }
    return {"Logistic regression": lr, "KNN": knn, "Decision tree": tree,
            "Random forest": rf, "Gradient boosting": gb}, grids


def fit(estimator, X, y, sample_weight=None):
    """Fits a pipeline, passing optional row weights to its final step."""
    est = clone(estimator)
    if sample_weight is None:
        return est.fit(X, y)
    return est.fit(X, y, model__sample_weight=np.asarray(sample_weight, float))


def oof_predict(estimator, X, y, folds, weight_fn=None, groups=None):
    """Out-of-fold probabilities (each validation year predicted by a model trained on earlier weeks).
    weight_fn(groups, y) -> row weights is applied to each fold's TRAINING rows only, so the weights
    never use the validation year."""
    p = np.full(len(X), np.nan)
    groups = None if groups is None else np.asarray(groups)
    for tr, va in folds:
        w = None if weight_fn is None else weight_fn(groups[tr], y.iloc[tr])
        p[va] = fit(estimator, X.iloc[tr], y.iloc[tr], w).predict_proba(X.iloc[va])[:, 1]
    return p


def cv_scores(y, oof, folds):
    """Within-year (mean and SD of the per-fold AUCs), pooled AUC, pooled PR-AUC and Brier of OOF predictions."""
    val = np.concatenate([va for _, va in folds])
    per = [roc_auc_score(y.iloc[va], oof[va]) for _, va in folds]
    return {"within-year AUC": np.mean(per), "within-year SD": np.std(per),
            **{f"AUC {k + 1}": a for k, a in enumerate(per)},
            "pooled AUC": roc_auc_score(y.iloc[val], oof[val]),
            "pooled PR-AUC": average_precision_score(y.iloc[val], oof[val]),
            "pooled Brier": brier_score_loss(y.iloc[val], oof[val])}


def tune(pipe, grid, X, y, folds, select_by="within-year AUC"):
    """Grid search over the expanding-window folds (A2).

    Every setting is trained on each fold's training weeks and predicts that fold's validation year.
    Settings are ranked by the within-year AUC (mean of the four per-fold AUCs). The train AUC (on each
    fold's own training weeks) is kept to diagnose over- and underfitting. The best setting is refitted
    on all training weeks. Returns (results table, refitted best pipeline, out-of-fold predictions of
    the best setting).
    """
    rows, oofs = [], []
    for params in ParameterGrid(grid):
        est = clone(pipe).set_params(**params)
        oof = np.full(len(X), np.nan)
        train_auc = []
        for tr, va in folds:
            m = clone(est).fit(X.iloc[tr], y.iloc[tr])
            oof[va] = m.predict_proba(X.iloc[va])[:, 1]
            train_auc.append(roc_auc_score(y.iloc[tr], m.predict_proba(X.iloc[tr])[:, 1]))
        rows.append({**B._short(params), **cv_scores(y, oof, folds), "train AUC": np.mean(train_auc),
                     "_params": params})
        oofs.append(oof)
    res = pd.DataFrame(rows)
    best = int(res[select_by].idxmax())
    best_model = clone(pipe).set_params(**res.loc[best, "_params"]).fit(X, y)
    res["selected"] = res.index == best
    oof_best = oofs[best]
    res = res.sort_values(select_by, ascending=False).reset_index(drop=True)
    return res, best_model, oof_best


# ---------------------------------------------------------------- fairness metrics (R1, R2)
def _thr_for(groups, threshold):
    """A single threshold, or a dict {group: threshold}, as one threshold per row."""
    if isinstance(threshold, dict):
        return np.array([threshold[g] for g in groups], float)
    return np.full(len(groups), float(threshold))


def group_rates(y, p, groups, threshold):
    """Confusion-matrix rates for each quintile at the given threshold(s)."""
    y, p, groups = np.asarray(y).astype(int), np.asarray(p, float), np.asarray(groups)
    alert = p >= _thr_for(groups, threshold)
    rows = []
    for g in GROUPS:
        m = groups == g
        yy, aa, pp = y[m], alert[m], p[m]
        tp, fp = int(np.sum(aa & (yy == 1))), int(np.sum(aa & (yy == 0)))
        fn, tn = int(np.sum(~aa & (yy == 1))), int(np.sum(~aa & (yy == 0)))
        rows.append({"group": g, "rows": int(m.sum()), "shock rows": int(yy.sum()),
                     "shock rate": yy.mean(), "alerts": tp + fp, "alert rate": aa.mean(),
                     "TPR (recall)": tp / (tp + fn) if tp + fn else np.nan,
                     "FPR": fp / (fp + tn) if fp + tn else np.nan,
                     "FNR (miss rate)": fn / (tp + fn) if tp + fn else np.nan,
                     "precision": tp / (tp + fp) if tp + fp else np.nan,
                     "Brier": brier_score_loss(yy, pp),
                     "ROC-AUC": roc_auc_score(yy, pp) if 0 < yy.sum() < len(yy) else np.nan,
                     "TP": tp, "FP": fp, "FN": fn, "TN": tn})
    return pd.DataFrame(rows).set_index("group")


def fairness_summary(rates, unpriv=UNPRIV, priv=PRIV):
    """The group fairness metrics of the brief, from a group_rates table.

    disparate impact ratio = alert rate of Q1 / alert rate of Q5 (the 80% rule flags values below 0.8;
        here an alarm is the favourable outcome, so a low ratio means Q1 is warned less often)
    demographic parity difference = alert rate of Q1 - alert rate of Q5
    equal opportunity difference = TPR of Q1 - TPR of Q5 (equal share of real shocks caught)
    predictive equality difference = FPR of Q1 - FPR of Q5 (equal share of calm weeks falsely alarmed)
    equalized odds gap = the larger of the absolute TPR and FPR differences
    The 'all groups' versions are the largest minus the smallest value over the five quintiles."""
    r = rates
    ar_u, ar_p = r.loc[unpriv, "alert rate"], r.loc[priv, "alert rate"]
    out = {"disparate impact ratio (Q1/Q5)": ar_u / ar_p if ar_p > 0 else np.nan,
           "demographic parity diff. (Q1-Q5)": ar_u - ar_p,
           "equal opportunity diff. (TPR Q1-Q5)": r.loc[unpriv, "TPR (recall)"] - r.loc[priv, "TPR (recall)"],
           "predictive equality diff. (FPR Q1-Q5)": r.loc[unpriv, "FPR"] - r.loc[priv, "FPR"]}
    out["equalized odds gap (Q1 vs Q5)"] = max(abs(out["equal opportunity diff. (TPR Q1-Q5)"]),
                                               abs(out["predictive equality diff. (FPR Q1-Q5)"]))
    out["min/max alert-rate ratio (all groups)"] = (r["alert rate"].min() / r["alert rate"].max()
                                                     if r["alert rate"].max() > 0 else np.nan)
    out["TPR range (all groups)"] = r["TPR (recall)"].max() - r["TPR (recall)"].min()
    out["FPR range (all groups)"] = r["FPR"].max() - r["FPR"].min()
    out["Brier Q1 - Q5"] = r.loc[unpriv, "Brier"] - r.loc[priv, "Brier"]
    return out


def bootstrap_fairness(y, p, groups, weeks, threshold, n_boot=2000, seed=SEED):
    """Week-block bootstrap of the fairness summary: whole weeks (all five quintile rows) are drawn
    with replacement, as in M3, because the rows of a week share their signals. Resamples in which
    Q1 or Q5 has no shock row are skipped (their TPR is undefined)."""
    rng = np.random.default_rng(seed)
    y, p, groups, weeks = np.asarray(y).astype(int), np.asarray(p, float), np.asarray(groups), np.asarray(weeks)
    uniq = np.unique(weeks)
    rows_of = {w: np.flatnonzero(weeks == w) for w in uniq}
    out = []
    for _ in range(n_boot):
        idx = np.concatenate([rows_of[w] for w in rng.choice(uniq, size=len(uniq), replace=True)])
        gy = pd.Series(y[idx]).groupby(groups[idx]).sum()
        if gy.get(UNPRIV, 0) == 0 or gy.get(PRIV, 0) == 0:
            continue
        out.append(fairness_summary(group_rates(y[idx], p[idx], groups[idx], threshold)))
    return pd.DataFrame(out)


# ---------------------------------------------------------------- mitigation (R3, R4)
def reweighing_weights(groups, y):
    """Pre-processing by reweighing: each (group, label) cell gets the weight
    P(group) x P(label) / P(group, label), so that in the weighted training data the shock rate is the
    same in every quintile (group and label become independent). Cells that are rarer than independence
    would predict are weighted up."""
    d = pd.DataFrame({"g": np.asarray(groups), "y": np.asarray(y).astype(int)})
    pg = d["g"].value_counts(normalize=True)
    py = d["y"].value_counts(normalize=True)
    pgy = d.groupby(["g", "y"]).size() / len(d)
    return np.array([pg[g] * py[yy] / pgy[(g, yy)] for g, yy in zip(d["g"], d["y"])])


def group_cost_weights(groups, y, mult=Q1_MISS_MULT, group=UNPRIV):
    """In-processing by group-weighted training costs: the shock rows of one group count `mult` times
    in the training loss, so the model pays more for missing them while it learns."""
    groups, y = np.asarray(groups), np.asarray(y).astype(int)
    return np.where((groups == group) & (y == 1), mult, 1.0)


def group_thresholds(y, p, groups, c_fn=None, c_fp=B.COST_FP):
    """Post-processing: one threshold per quintile, each minimising that quintile's expected cost on
    out-of-fold predictions. c_fn is a dict {group: cost of a miss}; by default 5 for every group."""
    y, p, groups = np.asarray(y), np.asarray(p, float), np.asarray(groups)
    c_fn = c_fn or {g: B.COST_FN for g in GROUPS}
    keep = ~np.isnan(p)
    return {g: B.best_threshold(y[keep & (groups == g)], p[keep & (groups == g)], c_fp, c_fn[g]) for g in GROUPS}


def miss_costs(mult=Q1_MISS_MULT):
    return {g: B.COST_FN * (mult if g == UNPRIV else 1.0) for g in GROUPS}


def total_cost(y, p, groups, threshold, c_fn=None, c_fp=B.COST_FP):
    """Expected cost of errors with a group-specific miss cost (default 5 for every group)."""
    y, groups = np.asarray(y).astype(int), np.asarray(groups)
    alert = np.asarray(p, float) >= _thr_for(groups, threshold)
    c_fn = c_fn or {g: B.COST_FN for g in GROUPS}
    cfn = np.array([c_fn[g] for g in groups])
    return float(np.sum(c_fp * (alert & (y == 0))) + np.sum(cfn * (~alert & (y == 1))))


def pareto_frontier(y, p, groups, kind="TPR", eps_grid=None, c_fn=None, c_fp=B.COST_FP, grid=None):
    """Fairness-accuracy trade-off for quintile-specific thresholds.

    For each tolerance eps, find the five thresholds (one per quintile) with the lowest total expected
    cost subject to a fairness constraint:
      kind="TPR": largest minus smallest recall over the quintiles <= eps   (equal opportunity)
      kind="FPR": largest minus smallest false-positive rate <= eps       (predictive equality)
      kind="DI" : smallest / largest alert rate >= 1 - eps                (demographic parity, 80% rule at eps = 0.2)
    The cost is separable by quintile, so the search is exact: for every candidate lower bound L of the
    constrained rate, each quintile takes its cheapest threshold whose rate lies in [L, L + eps] (or
    [L, L / (1 - eps)] for the ratio); the best L wins. Returns one row per eps."""
    y, p, groups = np.asarray(y).astype(int), np.asarray(p, float), np.asarray(groups)
    grid = np.round(np.arange(0.01, 1.00, 0.01), 2) if grid is None else grid
    c_fn = c_fn or {g: B.COST_FN for g in GROUPS}
    eps_grid = np.round(np.arange(0, 0.61, 0.02), 2) if eps_grid is None else eps_grid
    cost, rate = {}, {}
    for g in GROUPS:
        m = groups == g
        alert = p[m][None, :] >= grid[:, None]               # thresholds x rows
        yy = y[m][None, :]
        tp, fp = (alert & (yy == 1)).sum(1), (alert & (yy == 0)).sum(1)
        fn = (~alert & (yy == 1)).sum(1)
        cost[g] = c_fp * fp + c_fn[g] * fn
        rate[g] = {"TPR": tp / max(yy.sum(), 1), "FPR": fp / max((yy == 0).sum(), 1), "DI": alert.mean(1)}[kind]
    cands = np.unique(np.concatenate([rate[g] for g in GROUPS]))
    rows = []
    for eps in eps_grid:
        best = None
        for L in cands:
            hi = L + eps if kind != "DI" else (L / (1 - eps) if eps < 1 else np.inf)
            pick, tot = {}, 0.0
            for g in GROUPS:
                ok = (rate[g] >= L - 1e-12) & (rate[g] <= hi + 1e-12)
                if not ok.any():
                    break
                i = np.flatnonzero(ok)[np.argmin(cost[g][ok])]
                pick[g], tot = float(grid[i]), tot + cost[g][i]
            else:
                if best is None or tot < best[0]:
                    best = (tot, pick)
        if best is not None:
            rows.append({"eps": eps, "cost": best[0], "thresholds": best[1]})
    return pd.DataFrame(rows)


# ---------------------------------------------------------------- hypothesis test H5
def diebold_mariano(loss_a, loss_b, lags=4):
    """Diebold-Mariano test of equal predictive accuracy for two loss series observed on the same
    weeks: the mean loss difference d = loss_a - loss_b is tested against zero with Newey-West (HAC)
    standard errors, because weekly losses are autocorrelated. Returns the mean difference, its HAC
    standard error, the t statistic and the one-sided p-value for H1: E[loss_a] > E[loss_b]."""
    d = np.asarray(loss_a, float) - np.asarray(loss_b, float)
    m = sm.OLS(d, np.ones_like(d)).fit(cov_type="HAC", cov_kwds={"maxlags": lags})
    t = float(m.tvalues[0])
    return {"mean diff": float(d.mean()), "HAC SE": float(m.bse[0]), "t": t,
            "p (one-sided)": float(stats.norm.sf(t)), "p (two-sided)": float(2 * stats.norm.sf(abs(t))),
            "weeks": len(d)}
