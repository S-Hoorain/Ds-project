// Section VI of the Milestone 4 manuscript (advanced models), used by tools/build_manuscript_m4.js.
module.exports = function sectionVI({ add, H1, H2, P, BUL, table, figure, nt, nf }, N) {
  add(H1("VI. Advanced Models and Final Model Selection"));

  add(
    H2("A. What Changed from the Baselines"),
    P("Milestone 3 left three problems, which were a weak signal (no cross-validated AUC reached 0.7), a selection rule that partly rewarded telling crisis years from calm ones, and an alarm threshold that did not carry over from the crisis years to the calm test period. Milestone 4 keeps the task, the rows, the chronological split, the folds and the cost rule unchanged, so every number is directly comparable, and changes four things (Table " + nt() + ")."),
    table("Changes from the Milestone 3 design.", ["Element", "Milestone 3", "Milestone 4", "Reason"], [
      ["Learners", "logistic regression, KNN, shallow tree", "the same three re-tuned, plus a random forest and gradient boosting", "ensembles average away the variance of single trees and capture interactions"],
      ["Features", "18", "20, adding the 26-week shock rate and a July window", "let the predicted level follow the regime, cover the whole first month of the fiscal year"],
      ["Grids", "as Table 15", "plus Gini or entropy for trees and Euclidean or Manhattan distance for KNN", "two defaults that a check after the M3 submission found not best"],
      ["Selection", "pooled out-of-fold AUC", "within-year AUC (mean of the four yearly AUCs)", "pooled AUC rewarded regime tracking and flattered the tree"],
      ["Final model", "none named", "best within-year AUC among learners that accept row weights", "pre- and in-processing mitigation retrain the model with weights"],
    ], [1300, 2000, 2900, 2826], ["l", "l", "l", "l"]),
    P("The **26-week shock rate** is the share of the quintile's last 26 weeks that were shock weeks. It rose above 40% in the 2022–23 crisis and fell to zero in early 2025 (Fig. " + nf() + "), so it tells the model which regime it is in. The **July window** marks rows whose following week ends in July, because budget measures, new taxes and tariff rebasing spread over the first month of the fiscal year and not only its first week. In the training years, rows followed by a July week had a shock rate of 25.5% against 16.5% for other rows. Both ideas came from the Milestone 3 test-period errors, so for these two features the 2025–26 period is a second look and not an untouched test. We therefore measure their contribution in cross-validation, which never uses the test period (Section VI-E), and treat the new weekly releases of Milestone 5 as the clean out-of-sample test."),
    figure("figA1_rolling_shock_rate.png", "Share of the past 26 weeks that were shock weeks (weekly SPI rise of at least 1%) for Q1 and Q5. The rate uses weeks up to the forecast week only. Shaded, the test period."),
  );

  add(
    H2("B. Architectures and Hyperparameter Search"),
    P("A **random forest** [17] grows many decision trees, each on a bootstrap sample of the training rows and choosing every split from a random subset of features, and averages their votes. It keeps what the tree does well, thresholds and interactions such as a falling rupee before the budget, while averaging away the variance that made the single Milestone 3 tree unstable. **Gradient boosting** [18] adds shallow trees one at a time, each fitted to the errors the earlier trees still make, and shrinks each by a learning rate. It can be held back in several ways (learning rate, depth, leaf size, an L2 penalty), which matters with 1,350 training rows. We use scikit-learn's histogram version, which bins each feature into at most 255 values to speed up the split search. Table " + nt() + " lists the search spaces. Every setting of every learner is trained on each fold's training weeks and scored on that fold's validation year, and settings are ranked by within-year AUC. In total the five grids hold " + N.nSettings + " settings and " + N.nFits + " model fits."),
    table("Search spaces and selected settings (within-year AUC, validation years 2021–24).", ["Learner", "Search space", "Selected setting"], N.gridRows,
      [1500, 4700, 2826], ["l", "l", "l"]),
  );

  add(
    H2("C. Validation and Leakage Control"),
    P("The brief asks for tuning with stratified K-fold cross-validation without leakage. In a weekly time series these two requirements conflict, because random stratified folds train on later years to predict earlier ones and place the five quintile rows of a week, which share every week-level signal, on both sides of the split. We therefore keep the expanding-window folds of Milestone 3 (Fig. 7) and check that they deliver what stratification is meant to deliver, namely that every validation year contains shock and calm rows, and does so for every quintile (between " + N.minShockRows + " and " + N.maxShockRows + " shock rows per quintile and year). Re-scoring the tuned ensembles with shuffled stratified K-fold shows the cost of ignoring time. It reports AUCs of " + N.leakRows + " for the random forest and gradient boosting, against " + N.leakOurs + " with our design. All other leakage channels are closed as in Milestone 3. The 26-week shock rate uses weeks up to the forecast week, fairness weights are computed on each fold's training rows, and thresholds, fairness constraints and hyperparameters are all chosen on the 2021–24 out-of-fold predictions."),
  );

  add(
    H2("D. Cross-Validated and Test-Period Performance"),
    P("The five learners are statistically tied in cross-validation (Table " + nt() + "). Their within-year AUCs span 0.635 to 0.683, while the year-to-year standard deviations are 0.03 to 0.10, and every learner finds 2021 the easiest validation year and 2024 the hardest. Re-tuning lifted the Milestone 3 learners more than ensembling added. KNN, now with the Manhattan distance and k = 250 neighbours weighted by distance, rose from 0.672 to 0.683, and the tree, now split by entropy, from 0.578 to 0.657. The random forest reached 0.678 with trees of depth 5 and leaves of at least 20 rows. Deeper trees and smaller leaves raised its training AUC towards 1 without improving validation. Gradient boosting scored lowest (0.635) despite preferring the slowest learning rate, because with a weak signal each added tree soon fits noise."),
    P("**Final model.** KNN has the highest within-year AUC, but it cannot be retrained with row weights, which the pre- and in-processing mitigations of Section VII need. Among the learners that can, the random forest is best. Its gap to KNN, 0.005, is one twelfth of KNN's year-to-year standard deviation, and the forest is steadier across years and has the best pooled AUC, Brier score and validation cost. The team chose this rule after the cross-validation results showed the tie, and we report it as such."),
    table("Milestone 3 baselines (as submitted) and Milestone 4 learners: cross-validation (2021–24) and test period (2025–26).",
      ["Model", "CV within-year AUC", "CV pooled AUC", "CV Brier", "τ", "Acc.", "Prec.", "Recall", "F1", "Test ROC-AUC", "Test PR-AUC", "Test Brier", "Cost / never"],
      N.compRows, [1550, 650, 620, 580, 470, 560, 560, 600, 520, 700, 650, 600, 620], null,
      "τ: alarm threshold minimising 1 × false alarms + 5 × missed shocks on 2021–24 out-of-fold predictions. Cost / never: test-period cost of errors relative to never raising an alarm (below 1 beats doing nothing). M3 rows reproduce the submitted models exactly.", 15),
    P("On the test period the forest matches but does not beat the best baseline. Its ROC-AUC is 0.674 against 0.679 for the Milestone 3 KNN (difference " + N.gainRF + ", 95% week-bootstrap interval " + N.gainRFci + "), and with 13 shock weeks no learner is clearly better than another (Fig. " + nf() + "). The tree has the highest test AUC (0.687), but it was among the weaker learners in the validation years, and preferring it now would mean choosing on the test period. At its threshold of 0.14 the forest caught 18 of the 35 shock rows with 111 false alarms (precision 0.14, recall 0.51, F1 0.22), against 20 caught with 133 false alarms for the Milestone 3 KNN. Accuracy again misleads, since logistic regression scores highest (0.86) because it rarely alerts."),
    figure("figA3_roc_pr_test.png", "Test-period ROC (left) and precision–recall (right) curves of the five Milestone 4 learners and the Milestone 3 KNN (dashed). Dot: the random forest at its threshold chosen on 2021–24. Grey: no skill."),
  );

  add(
    H2("E. Contribution of the New Features"),
    P(N.ablationText),
  );

  add(
    H2("F. Thresholds, Error Costs and Calibration"),
    P(N.thresholdText),
    figure("figA4_threshold_curves.png", "Threshold curves of the random forest. Precision, recall, F1 and the cost of errors relative to never alerting (1 per false alarm, 5 per missed shock) at every threshold, in the validation years (left) and the test period (right). Dotted, the threshold of 0.14 chosen on 2021–24."),
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
    figure("figA6_feature_importance.png", "Permutation importance on the validation years 2021–24 (mean drop in AUC when a feature is shuffled; four years, 10 shuffles). Left, both ensembles. Right, the random forest on Q1 rows and on Q5 rows. The test period is not used."),
  );
};
