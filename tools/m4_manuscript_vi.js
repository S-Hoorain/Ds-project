// Section VI of the Milestone 4 manuscript (advanced models), used by tools/build_manuscript_m4.js.
module.exports = function sectionVI({ add, H1, H2, P, BUL, table, figure, nt, nf }, N) {
  add(H1("VI. Advanced Models and Final Model Selection"));

  add(
    H2("A. What Changed from the Baselines"),
    P("Milestone 3 left a weak signal (no cross-validated AUC reached 0.7), a selection rule that partly rewarded telling crisis years from calm ones, and a threshold that failed in the calm test period. Milestone 4 keeps the task, rows, split, folds and cost rule, so every number stays comparable, and changes the elements in Table " + nt() + "."),
    table("Changes from the Milestone 3 design.", ["Element", "Milestone 3", "Milestone 4", "Reason"], [
      ["Learners", "logistic regression, KNN, shallow tree", "the same, re-tuned, plus a random forest and gradient boosting", "ensembles reduce the variance of single trees"],
      ["Features", "18", "20, adding a 26-week shock rate and a July window", "follow the regime, cover the fiscal-year start"],
      ["Grids", "as Table 15", "plus Gini or entropy (trees), Euclidean or Manhattan (KNN)", "two M3 defaults found not best"],
      ["Selection", "pooled out-of-fold AUC", "within-year AUC (mean of the four yearly AUCs)", "pooled AUC rewarded regime tracking"],
      ["Final model", "none named", "best within-year AUC among learners that accept row weights", "mitigation retrains with weights"],
    ], [1300, 2000, 2900, 2826], ["l", "l", "l", "l"]),
    P("The **26-week shock rate**, the share of the quintile's last 26 weeks that were shock weeks, rose above 40% in the 2022–23 crisis and fell to zero in early 2025 (Fig. " + nf() + "), so it tells the model which regime it is in. The **July window** marks rows whose following week ends in July, when budget measures spread over the first month of the fiscal year (shock rate 25.5% against 16.5% for other training rows). Both ideas came from the Milestone 3 test-period errors, so the test period is not an untouched test for them, and we judge them in cross-validation (Section VI-E)."),
    figure("figA1_rolling_shock_rate.png", "Share of the past 26 weeks that were shock weeks, Q1 and Q5. Shaded, the test period."),
  );

  add(
    H2("B. Architectures and Hyperparameter Search"),
    P("A **random forest** [17] averages many decision trees, each grown on a bootstrap sample of rows with every split chosen from a random subset of features, which keeps the tree's thresholds and interactions while averaging away its variance. **Gradient boosting** [18] adds shallow trees one at a time, each fitted to the remaining errors and shrunk by a learning rate (scikit-learn's histogram version). Every setting in Table " + nt() + " is trained on each fold's training weeks, scored on its validation year and ranked by within-year AUC (" + N.nSettings + " settings, " + N.nFits + " fits)."),
    table("Search spaces and the settings selected by within-year AUC (validation years 2021–24).", ["Learner", "Search space", "Selected setting"], N.gridRows,
      [1500, 4700, 2826], ["l", "l", "l"]),
  );

  add(
    H2("C. Validation and Leakage Control"),
    P("The brief asks for stratified K-fold cross-validation without leakage. In a weekly series the two conflict, because random folds train on later years to predict earlier ones and split the five quintile rows of a week, which share every week-level signal. We keep the expanding-window folds of Milestone 3 (Fig. 7), and every validation year still has shock and calm rows in every quintile (" + N.minShockRows + " to " + N.maxShockRows + " shock rows per quintile and year). Shuffled stratified K-fold would report AUCs of " + N.leakRows + " for the ensembles against " + N.leakOurs + " with our design. Features use past weeks only, fairness weights use each fold's training rows, and every threshold and hyperparameter is chosen on the 2021–24 out-of-fold predictions."),
  );

  add(
    H2("D. Cross-Validated and Test-Period Performance"),
    P("The five learners are statistically tied in cross-validation (Table " + nt() + "), with within-year AUCs of 0.635 to 0.683 against year-to-year standard deviations of 0.03 to 0.10. Re-tuning helped more than ensembling. KNN (Manhattan distance, k = 250) rose from 0.672 to 0.683 and the tree (entropy) from 0.578 to 0.657, while the forest reached 0.678. Gradient boosting scored lowest (0.635), because with a weak signal each added tree soon fits noise."),
    P("**Final model.** KNN scores highest but cannot be retrained with row weights, which the mitigations of Section VII need. Among the learners that can, the random forest is best, 0.005 below KNN (one twelfth of KNN's year-to-year standard deviation), with the best pooled AUC, Brier score and validation cost. The team chose this rule after the tie appeared."),
    table("Milestone 3 baselines (as submitted) and Milestone 4 learners, cross-validation 2021–24 and test period 2025–26.",
      ["Model", "CV within-year AUC", "CV pooled AUC", "CV Brier", "τ", "Acc.", "Prec.", "Recall", "F1", "Test ROC-AUC", "Test PR-AUC", "Test Brier", "Cost / never"],
      N.compRows, [1550, 650, 620, 580, 470, 560, 560, 600, 520, 700, 650, 600, 620], null,
      "τ: threshold minimising 1 × false alarms + 5 × missed shocks on 2021–24 out-of-fold predictions. Acc. to F1 at τ in the test period. Cost / never: test cost of errors relative to never alerting.", 15),
    P("On the test period the forest matches but does not beat the best baseline (ROC-AUC 0.674 against 0.679 for the Milestone 3 KNN, difference " + N.gainRF + ", 95% week-bootstrap interval " + N.gainRFci + "), and with 13 shock weeks no learner is clearly better (Fig. " + nf() + "). At its threshold of 0.14 the forest caught 18 of 35 shock rows with 111 false alarms. Accuracy misleads again, as logistic regression scores highest (0.86) because it rarely alerts."),
    figure("figA3_roc_pr_test.png", "Test-period ROC (left) and precision–recall (right) curves. Dashed, the Milestone 3 KNN. Dot, the forest at its threshold."),
  );

  add(
    H2("E. Contribution of the New Features"),
    P(N.ablationText),
  );

  add(
    H2("F. Thresholds, Error Costs and Calibration"),
    P(N.thresholdText),
    figure("figA4_threshold_curves.png", "Precision, recall, F1 and relative cost of the random forest at every threshold, 2021–24 (left) and test period (right). Dotted, the threshold of 0.14."),
    P(N.calibrationText),
  );

  add(
    H2("G. Hypothesis H4: Quintile-Specific Signals"),
    P(N.h4Text),
    table("Hypothesis H4 (training period, Q1 and Q5 rows, 5% level).", ["Test", "Statistic", "df", "p", "Decision"], N.h4Rows,
      [3800, 1300, 800, 1200, 1926], ["l", "c", "c", "c", "l"]),
  );

  add(
    H2("H. Feature Drivers"),
    P(N.importanceText),
    figure("figA6_feature_importance.png", "Permutation importance on the validation years (mean drop in AUC, 10 shuffles). Left, both ensembles. Right, the forest on Q1 and Q5 rows."),
  );
};
