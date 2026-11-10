// File, function and section listings of the Milestone 4 reference (used by tools/build_m4_reference_doc.js).

const STEPS = [
  ["1", "`python src/features/build_features.py`", "`master_model_ready.csv`, `items_weekly_panel.csv`, `islamic_events.csv`", "`master_features.csv` (unchanged since M2; re-run only if the data change)"],
  ["2", "run `notebooks/05_advanced_models.ipynb` (about 10 minutes)", "`master_features.csv`, `models/m3_baselines/*`", "figures A1–A6, `reports/tables/m4_*` (model tables), `models/m4_advanced/*` (models, predictions, model card)"],
  ["3", "run `notebooks/06_fairness_audit.ipynb` (about 2 minutes)", "`models/m4_advanced/*`, `master_features.csv`, `items_weekly_panel.csv`", "figures F1–F3, `reports/tables/m4_*` (fairness tables)"],
  ["4", "`python tools/prepare_manuscript_figures.py`", "`reports/figures/*.png`", "caption-free copies in `manuscript/figures/`"],
  ["5", "`node tools/build_manuscript_m4.js manuscript/M4_manuscript_sections_VI_VIII.docx`", "`manuscript/figures/figA*.png`, `figF*.png`", "the M4 manuscript (Word); export to PDF from Word"],
  ["6", "`python src/models/sensitivity_checks_m4.py` (about 6 minutes, for the viva)", "`master_features.csv`, `models/m4_advanced/model_card.json`, `reports/tables/m4_cv_grid_*.csv`", "nothing (prints the checks of the fixed M4 numbers; results in the viva guide, Section 11)"],
];

const FILES = [
  {
    path: "src/models/advanced.py", type: "Python module (imported by notebooks 05 and 06)",
    what: "All Milestone 4 modelling and fairness code. It adds the two new features, defines the five learners and their grids, runs the grid search with the within-year selection rule, computes out-of-fold predictions (optionally with row weights computed on each fold's training rows), and holds every fairness tool: rates by quintile, the fairness metrics of the brief, the week-block bootstrap of those metrics, reweighing, group-weighted training costs, quintile thresholds, the Pareto frontier search and the Diebold–Mariano test. Its docstring lists decisions A1–A6 and R1–R4.",
    why: "One home for the code keeps the notebooks readable and makes sure both notebooks use the same definitions. It reuses `baseline.py` (folds, thresholds, metrics, bootstrap) without changing it, so the M3 results stay reproducible.",
    reads: ["`data/processed/master_features.csv` (via `load_model_data()`)"],
    writes: ["nothing (the notebooks save the outputs)"],
    run: "Imported: `from models import advanced as A` (after adding `src/` to the path).",
    concepts: "random forest, gradient boosting, grid search, within-year AUC, sample weights, group fairness metrics, reweighing, post-processing thresholds, Pareto frontier, Diebold–Mariano test.",
  },
  {
    path: "notebooks/05_advanced_models.ipynb", type: "Jupyter notebook (submitted)",
    what: "Builds and compares the advanced models: new features and their evidence, the validation design, the five learners and their grids, tuning results and validation curves, the comparison with the M3 baselines on every metric with bootstrap intervals, the feature ablation, the leakage check, threshold curves and cost ratios, calibration, hypothesis H4 and feature importance. Saves the models and predictions.",
    why: "Rubric items 'Advanced model architecture and optimisation' (30%) and part of 'Feature importance and insights'.",
    reads: ["`data/processed/master_features.csv`", "`models/m3_baselines/*.joblib`, `model_card.json`"],
    writes: ["`reports/figures/figA1`–`figA6`", "`reports/tables/m4_cv_*`, `m4_model_comparison.csv`, `m4_test_auc_*`, `m4_feature_ablation.csv`, `m4_cv_design_comparison.csv`, `m4_threshold_curve_*`, `m4_cost_ratio_sensitivity.csv`, `m4_calibration.csv`, `m4_h4_*`, `m4_permutation_importance*`", "`models/m4_advanced/*.joblib`, `oof_predictions.csv`, `test_predictions.csv`, `model_card.json`"],
    run: "Open in Jupyter with the DS4SG (.venv) kernel and run all cells (about 10 minutes; the random-forest grid takes about 5).",
    concepts: "ensembles, hyperparameter search, time-ordered cross-validation, leakage, ROC and PR curves, threshold curves, calibration, Wald and likelihood-ratio tests, permutation importance.",
  },
  {
    path: "notebooks/06_fairness_audit.ipynb", type: "Jupyter notebook (submitted)",
    what: "The fairness audit of the final model: the sensitive attribute and base rates, the fairness metrics for all five learners, the final model in detail with bootstrap intervals, hypothesis H5, where the disparity comes from, the three mitigation families, the Pareto frontier, the asymmetric quintile thresholds, the recommended policy, the FATEN assessment and the living-lab plan.",
    why: "Rubric items 'Algorithmic bias and disparity audit' (35%), 'Bias mitigation and asymmetric threshold tuning' (20%) and the FATEN and living-lab parts of the report.",
    reads: ["`models/m4_advanced/*` (from notebook 05)", "`data/processed/master_features.csv`, `items_weekly_panel.csv`"],
    writes: ["`reports/figures/figF1`–`figF3`", "`reports/tables/m4_base_rates_by_group.csv`, `m4_fairness_*`, `m4_final_rates_by_group.csv`, `m4_h5_diebold_mariano.csv`, `m4_shock_driver_mix_by_group.csv`, `m4_recall_by_driver.csv`, `m4_mitigation_policies.csv`, `m4_pareto_*`, `m4_q1_cost_sensitivity.csv`"],
    run: "Run notebook 05 first, then run all cells (about 2 minutes).",
    concepts: "sensitive attribute, demographic parity, disparate impact and the 80% rule, equalized odds, equal opportunity, predictive equality, Diebold–Mariano, reweighing, group thresholds, Pareto frontier, FATEN, living lab.",
  },
  {
    path: "src/models/sensitivity_checks_m4.py", type: "Python script (command line, prints only)",
    what: "Checks every M4 number we fixed by judgement: the 26-week window, the number of trees, the seed, the edges of the boosting and KNN grids, the pooled-AUC selection rule, the in-processing weight, the equal-opportunity tolerance, the threshold step, bottom 40% vs top 40% as the compared groups, the bootstrap size, the permutation repeats, and the run-to-run variation of the fairness results.",
    why: "The viva asks whether other values were tried. These checks were run after the analysis was final and change no result.",
    reads: ["`data/processed/master_features.csv`", "`models/m4_advanced/model_card.json`, `reports/tables/m4_cv_grid_*.csv`"],
    writes: ["nothing"],
    run: "`python src/models/sensitivity_checks_m4.py` after notebook 05 (about 6 minutes).",
    concepts: "sensitivity analysis, seed variation, grid edges.",
  },
  {
    path: "tools/build_manuscript_m4.js (+ m4_manuscript_viii.js)", type: "Node.js script (docx package)",
    what: "Builds the Word manuscript of Sections VI–VIII with numbered tables and figures continuing the M3 draft (Table 25 and Fig. 14 onwards, references from [18]).",
    why: "The report is a Word document exported to PDF, in the same style as M2 and M3.",
    reads: ["`manuscript/figures/figA*.png`, `figF*.png`", "`reports/tables/m4_*.csv` (numbers typed in from these)"],
    writes: ["`manuscript/M4_manuscript_sections_VI_VIII.docx`"],
    run: "`NODE_PATH=<folder>/node_modules node tools/build_manuscript_m4.js manuscript/M4_manuscript_sections_VI_VIII.docx`, then export to PDF from Word.",
    concepts: "none beyond the manuscript.",
  },
  {
    path: "tools/build_m4_notebooks.py (+ nb05_code.py, nb06_code.py, nb_text_m4.py, nbtools.py)", type: "Python scripts (team tools, not submitted)",
    what: "Write the two notebooks from their code and text cells. `python tools/build_m4_notebooks.py text` refreshes only the text cells of executed notebooks and refuses if any code cell changed.",
    why: "Keeps the notebook code and text in plain files that are easy to review and edit together.",
    reads: ["the four helper files"], writes: ["`notebooks/05_advanced_models.ipynb`, `notebooks/06_fairness_audit.ipynb`"],
    run: "`python tools/build_m4_notebooks.py`, then execute both notebooks with nbconvert (commands in the script's docstring).",
    concepts: "none.",
  },
];

const FUNCS = [
  ["`load_model_data()`", "Quintile rows of `master_features.csv` with the two new features; same 1,805 rows as M3.", "rolling window, listwise deletion"],
  ["`make_models()`", "Pipelines and grids for logistic regression, KNN, tree, random forest and gradient boosting.", "ensembles, grids"],
  ["`fit()`, `oof_predict()`", "Fit a pipeline with optional row weights; out-of-fold predictions, with weights computed on each fold's training rows only.", "sample weights, leakage"],
  ["`cv_scores()`", "Within-year AUC (mean and SD of the four yearly AUCs), pooled AUC, pooled PR-AUC, Brier.", "selection rule"],
  ["`tune()`", "Grid search over the expanding-window folds, ranked by within-year AUC; refits the best setting.", "grid search, validation curves"],
  ["`group_rates()`", "Rows, shocks, alert rate, TPR, FPR, FNR, precision, Brier and AUC for each quintile at a threshold (shared or per quintile).", "confusion matrix by group"],
  ["`fairness_summary()`", "Disparate impact ratio, demographic parity, equal opportunity, predictive equality, equalized odds, ranges over all quintiles, Brier gap.", "group fairness metrics"],
  ["`bootstrap_fairness()`", "Week-block bootstrap of the fairness summary (2,000 resamples).", "uncertainty"],
  ["`reweighing_weights()`", "P(group) × P(outcome) / P(group, outcome) for each row.", "pre-processing mitigation"],
  ["`group_cost_weights()`", "Weight 2 on Q1 shock rows, 1 elsewhere.", "in-processing mitigation"],
  ["`group_thresholds()`, `miss_costs()`", "One cost-optimal threshold per quintile; miss costs with Q1 × 2.", "post-processing mitigation"],
  ["`total_cost()`", "Expected cost of errors with a miss cost per quintile.", "asymmetric costs"],
  ["`pareto_frontier()`", "Exact search of the cheapest quintile thresholds for each allowed recall gap, FPR gap or alert-rate ratio.", "Pareto frontier"],
  ["`diebold_mariano()`", "Mean weekly loss difference with a Newey–West standard error; one- and two-sided p-values.", "H5 test"],
];

const NB05 = [
  ["§1 Data and two new features", "Same rows and split as M3; evidence for the 26-week shock rate and the July window in the training years only.", "Figure A1"],
  ["§2 Validation design", "Why time-ordered folds instead of shuffled stratified K-fold; both classes in every fold for every quintile; leakage checklist.", "`m4_cv_folds.csv`"],
  ["§3 Models and search spaces", "How the forest and gradient boosting work, why they suit the problem, their grids; the within-year selection rule.", "grid sizes"],
  ["§4 Tuning results", "Top settings of each learner, the selected settings, the final-model rule, validation curves.", "`m4_cv_grid_*`, `m4_cv_summary.csv`, Figure A2"],
  ["§5 Comparison with M3", "M3 baselines as submitted against the five M4 learners on every metric; bootstrap intervals and the AUC gain over M3 KNN; ROC and PR curves.", "`m4_model_comparison.csv`, `m4_test_auc_*`, Figure A3"],
  ["§6 Ablation", "Final model with and without each new feature.", "`m4_feature_ablation.csv`"],
  ["§7 Leakage check", "Shuffled stratified K-fold against the expanding window, for both ensembles.", "`m4_cv_design_comparison.csv`"],
  ["§8 Threshold curves and costs", "Precision, recall, F1 and cost against the threshold; cost ratios 1 to 20.", "Figure A4, `m4_threshold_curve_*`, `m4_cost_ratio_sensitivity.csv`"],
  ["§9 Calibration", "Reliability curves and Brier scores.", "Figure A5, `m4_calibration.csv`"],
  ["§10 H4", "Signal × Q5 interactions (Wald and LR tests); pooled against quintile-own models.", "`m4_h4_*`"],
  ["§11 Feature importance", "Permutation importance for both ensembles and, for the final model, on Q1 and Q5 rows.", "Figure A6, `m4_permutation_importance*`"],
  ["§12–13 Saved models and summary", "Models, predictions, model card; findings.", "`models/m4_advanced/`"],
];

const NB06 = [
  ["§1 Sensitive attribute", "Quintile as socio-economic class; the alarm as the favourable outcome; base rates by quintile.", "`m4_base_rates_by_group.csv`"],
  ["§2 Group fairness metrics", "Definitions; the metrics for all five learners in 2021–24 and in the test period; the 80% rule.", "`m4_fairness_all_models.csv`"],
  ["§3 Final model in detail", "Rates by quintile; bootstrap intervals for every fairness metric; error rates by quintile.", "`m4_final_rates_by_group.csv`, `m4_fairness_bootstrap_final.csv`, Figure F1"],
  ["§4 H5", "Diebold–Mariano test of Brier loss Q1 against Q5, lag robustness, all learners.", "`m4_h5_diebold_mariano.csv`"],
  ["§5 Sources of disparity", "Shock drivers by quintile; recall by driver.", "`m4_shock_driver_mix_by_group.csv`, `m4_recall_by_driver.csv`"],
  ["§6 Mitigation", "Reweighing, group-weighted training cost, three kinds of quintile thresholds; accuracy and fairness of each.", "`m4_mitigation_policies.csv`"],
  ["§7 Pareto frontier", "Cheapest quintile thresholds for each allowed recall gap and alert-rate ratio.", "Figure F2, `m4_pareto_*`"],
  ["§8 Asymmetric thresholds", "Q1 miss cost 1 to 3; threshold curves by quintile.", "`m4_q1_cost_sensitivity.csv`, Figure F3"],
  ["§9–11 Policy, FATEN, living lab", "The recommended policy, the FATEN assessment and the living-lab plan with failure modes and safeguards.", "text"],
];

const FIGURES = [
  ["`figA1_rolling_shock_rate.png`", "The 26-week shock rate of Q1 and Q5 over time.", "High in 2022–23, near zero in early 2025: the feature tells the model which regime it is in."],
  ["`figA2_validation_curves_ensembles.png`", "Validation curves of the forest and gradient boosting.", "Training AUC rises with complexity while validation AUC flattens: the selected value sits where validation peaks."],
  ["`figA3_roc_pr_test.png`", "ROC and precision-recall curves of the M4 learners and M3 KNN on the test period.", "Higher and further left is better; the dot is the final model at its threshold."],
  ["`figA4_threshold_curves.png`", "Precision, recall, F1 and cost against the threshold, validation years and test.", "The cost curve's minimum moves between periods: the regime problem."],
  ["`figA5_calibration.png`", "Reliability curves.", "Points on the diagonal = calibrated; above = under-predicts, below = over-predicts."],
  ["`figA6_feature_importance.png`", "Permutation importance, both ensembles; final model on Q1 and Q5 rows.", "Longer bar = the model relies more on that feature."],
  ["`figF1_rates_by_quintile.png`", "Recall, false-positive rate and alert rate by quintile with bootstrap intervals.", "Equal heights = fair by that metric; overlapping intervals = gaps within noise."],
  ["`figF2_pareto_frontier.png`", "The fairness-accuracy trade-off and the mitigation policies.", "Left = fairer, down = cheaper; the curve is the best possible."],
  ["`figF3_threshold_curves_by_quintile.png`", "Cost of each quintile's errors at every threshold.", "Each curve's minimum is that quintile's best threshold; the dashed line weights a Q1 miss twice."],
];

module.exports = { STEPS, FILES, FUNCS, NB05, NB06, FIGURES };
