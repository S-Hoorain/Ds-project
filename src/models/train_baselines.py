"""Train, tune and evaluate the Milestone 3 baseline models from the command line.

This script runs the same steps as notebooks/03_baseline_models.ipynb, with the same functions
(src/models/baseline.py) and seeds, so both give identical numbers. The notebook adds the
explanations, figures, error analysis, feature importance and the H1 test.

Steps:
  1. load the quintile rows of master_features.csv and split them by date (train <= 2024, test 2025-26)
  2. build four expanding-window folds (validation years 2021, 2022, 2023, 2024)
  3. grid-search logistic regression, KNN and a decision tree; select by pooled out-of-fold AUC
  4. choose each model's alarm threshold on its out-of-fold predictions (cost of a miss = 5 false alarms)
  5. score the two naive benchmarks and the three models on the untouched test period
  6. save the fitted models, a model card and the result tables

Input:  data/processed/master_features.csv
Output: models/m3_baselines/*.joblib, models/m3_baselines/model_card.json
        reports/tables/m3_cv_grid_<model>.csv, m3_cv_folds.csv, m3_test_metrics.csv, m3_predictions.csv

Run:  python src/models/train_baselines.py
"""

import sys
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from models.baseline import (COST_FN, COST_FP, FEATURES, ROOT, SEED, TARGET, TRAIN_END, VAL_YEARS,  # noqa: E402
                             best_threshold, classification_metrics, fold_table, grid_search_time_cv,
                             load_model_data, make_benchmarks, make_models, oof_predict, save_models,
                             split_train_test, time_series_folds)

TABLES = ROOT / "reports" / "tables"


def main():
    warnings.filterwarnings("ignore", category=UserWarning)
    np.random.seed(SEED)
    df = load_model_data()
    train, test = split_train_test(df)
    X, y, Xt, yt = train[FEATURES], train[TARGET], test[FEATURES], test[TARGET]
    print(f"train: {train['week_end'].nunique()} weeks x 5 groups = {len(train)} rows, shock rate {y.mean():.1%}")
    print(f"test:  {test['week_end'].nunique()} weeks x 5 groups = {len(test)} rows, shock rate {yt.mean():.1%}")

    folds = time_series_folds(train)
    fold_table(train, folds).to_csv(TABLES / "m3_cv_folds.csv", index=False)

    # Baseline models: tune on the training period only, then refit the best setting on all of it.
    models, grids = make_models()
    fitted, oof, card = {}, {}, {"features": FEATURES, "train_end": str(TRAIN_END.date()),
                                 "validation_years": VAL_YEARS, "cost_fp": COST_FP, "cost_fn": COST_FN,
                                 "sklearn_version": sklearn.__version__, "models": {}}
    for name, pipe in models.items():
        res, best, oof[name] = grid_search_time_cv(pipe, grids[name], X, y, folds)
        fitted[name] = best
        res.drop(columns="_params").to_csv(TABLES / f"m3_cv_grid_{name.lower().replace(' ', '_')}.csv", index=False)
        top = res.iloc[0]
        card["models"][name] = {"params": {k.split("__")[-1]: (type(v).__name__ if hasattr(v, "fit") else v)
                                           for k, v in top["_params"].items()},
                                "pooled_cv_auc": top["pooled CV AUC"], "mean_fold_auc": top["mean fold AUC"],
                                "fold_auc_sd": top["fold AUC SD"]}
        print(f"{name:20s} pooled CV AUC {top['pooled CV AUC']:.3f}  (fold mean {top['mean fold AUC']:.3f} "
              f"+/- {top['fold AUC SD']:.3f})  {card['models'][name]['params']}")

    # Naive benchmarks need no tuning; their out-of-fold predictions come from the same folds.
    for name, b in make_benchmarks().items():
        fitted[name] = b.fit(X, y)
        oof[name] = oof_predict(b, X, y, folds)

    # Thresholds from the training period only; then one look at the test period.
    rows, preds = [], test[["week_end", "group", TARGET]].copy()
    for name, model in fitted.items():
        if name == "Majority class":
            tau = 1.01                     # by definition it never raises an alarm
        elif name == "Persistence":
            tau = 0.5                      # 0/1 forecast
        else:
            tau = best_threshold(y, oof[name])
        p = model.predict_proba(Xt)[:, 1]
        preds[f"p_{name}"] = p
        rows.append({"model": name, **classification_metrics(yt, p, tau)})
        if name in card["models"]:
            card["models"][name]["threshold"] = tau
    metrics = pd.DataFrame(rows)
    metrics.to_csv(TABLES / "m3_test_metrics.csv", index=False)
    preds.to_csv(TABLES / "m3_predictions.csv", index=False, date_format="%Y-%m-%d")
    out = save_models({k: v for k, v in fitted.items() if k in models}, card)

    show = metrics.set_index("model")[["threshold", "accuracy", "precision", "recall", "specificity", "F1",
                                       "ROC-AUC", "PR-AUC", "Brier", "alerts", "FN", "cost"]]
    with pd.option_context("display.width", 200, "display.max_columns", 20, "display.precision", 3):
        print("\nTest period 2025-26:\n", show)
    print(f"\nSaved models to {out.relative_to(ROOT)} and tables to {TABLES.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
