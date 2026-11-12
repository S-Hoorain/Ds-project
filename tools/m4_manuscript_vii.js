// Section VII of the Milestone 4 manuscript (fairness audit and bias mitigation), used by tools/build_manuscript_m4.js.
module.exports = function sectionVII({ add, H1, H2, P, BUL, table, figure, nt, nf, cur }, N) {
  add(H1("VII. Algorithmic Fairness Audit and Bias Mitigation"));

  add(
    H2("A. Sensitive Attribute and Favourable Outcome"),
    P("The sensitive attribute is the **consumption quintile**, a measure of socio-economic class. **Q1, the poorest fifth, is the unprivileged group and Q5 the privileged group**, and Q2 to Q4 are audited as well. The favourable outcome is the alarm, which would prepare a top-up, so a quintile whose shocks are caught less often is at a disadvantage, the reverse of lending or policing. The unit is a quintile-week, not a person, and rural households and gender cannot be audited because the SPI does not record them."),
    P("Shock rates are almost equal across quintiles (Table " + nt() + "). With unequal base rates a model cannot be calibrated within groups and have equal error rates at once [19], [20], but with nearly equal ones we can ask for all these criteria, and demographic parity is a reasonable check."),
    table("Shock rows by quintile.", ["Period", "Q1", "Q2", "Q3", "Q4", "Q5"], N.baseRows, [3000, 1200, 1200, 1200, 1200, 1226], null,
      "Shock row: SPI rise of at least 1% the following week. Rows per quintile: 270 (training), 208 (2021–24), 91 (test)."),
  );

  add(
    H2("B. Fairness Metrics"),
    P("We compute the brief's metrics at each learner's shared threshold. The **disparate impact ratio** is Q1's alert rate over Q5's, and the four-fifths (80%) rule [21], [22] flags values below 0.8 (or above 1.25). **Equal opportunity** compares recall, **predictive equality** compares false-positive rates and **equalized odds** requires both [23], [24]. A missed shock is the costly error, so equal opportunity is our main criterion. Intervals come from 2,000 bootstrap resamples of whole weeks."),
  );

  add(
    H2("C. Audit Results"),
    P(N.auditText),
    table("Group fairness metrics at each learner's shared threshold, 2021–24 (test period in brackets).",
      ["Learner", "Disparate impact (Q1/Q5)", "Equal opportunity diff.", "Predictive equality diff.", "Recall range"],
      N.auditRows, [2000, 1700, 1800, 1800, 1726], null,
      "Differences are Q1 minus Q5, so a negative equal opportunity difference means Q1's shocks are caught less often. Recall range: largest minus smallest quintile recall.", 17),
    figure("figF1_rates_by_quintile.png", "Recall, false-positive rate and alert rate by quintile, random forest at 0.14. Circles, 2021–24. Squares, test period. Lines, 95% intervals (1,000 week resamples)."),
  );

  add(
    H2("D. Hypothesis H5: Is the Model Less Accurate for the Poorest?"),
    P(N.h5Text),
  );

  add(
    H2("E. Where the Disparity Comes From"),
    P(N.driversText),
  );

  add(
    H2("F. Bias Mitigation"),
    P("Each mitigation is set up on the 2021–24 out-of-fold predictions and scored once on the test period. **Pre-processing by reweighing** [25] weights each quintile and outcome pair by P(quintile) × P(outcome) / P(quintile, outcome) on each fold's training rows, so the weighted shock rate is equal across quintiles. **In-processing** counts Q1's shock rows twice in the forest's training loss. **Post-processing** [24] sets one threshold per quintile, either cost-based with a missed Q1 shock costing ten false alarms instead of five, or the cheapest thresholds whose recalls differ by at most 0.05 (equal opportunity) or whose alert rates meet the 80% rule (demographic parity). The double weight on Q1 is a value judgement. Q1 households spend the largest share of their budget on food and energy and have the least savings, so a missed shock is the most likely to mean eating less or borrowing (Section VII-H varies the weight from 1 to 3)."),
    table("Accuracy and fairness of the mitigation policies (random forest, 2021–24, test period in brackets).",
      ["Policy", "Cost / never", "Accuracy", "Recall", "Recall Q1", "Recall Q5", "Disparate impact", "Recall range"],
      N.policyRows, [2500, 900, 900, 850, 850, 850, 1100, 1076], null,
      "Cost / never: cost of errors (1 per false alarm, 5 per missed shock) relative to never alerting.", 16),
    P(N.mitigationText),
  );

  add(
    H2("G. The Fairness–Accuracy Trade-off"),
    P("For every tolerance ε we find the five quintile thresholds with the lowest expected cost such that the quintiles' recalls differ by at most ε (equal opportunity), or the smallest alert rate is at least 1 − ε times the largest (demographic parity). Because the total cost is a sum over quintiles, the search is exact, and the result is a Pareto frontier on which no policy can be made fairer without costing more. Accuracy is measured by the expected cost of errors, because plain accuracy rewards never alerting."),
    figure("figF2_pareto_frontier.png", "Fairness–accuracy trade-off for the random forest, 2021–24. Left, recall gap against relative cost. Right, smallest over largest alert rate (dotted, the 80% rule). Black, the Pareto frontier. Markers, the policies of Table " + cur() + "."),
    P(N.paretoText),
  );

  add(
    H2("H. Asymmetric Thresholds Across Quintiles"),
    P(N.asymText),
    table("Quintile thresholds as the cost of a missed Q1 shock varies (random forest, 2021–24, test period in brackets).",
      ["Q1 miss cost", "Threshold Q1", "Threshold Q5", "Recall Q1", "Recall Q5", "Cost / never"],
      N.asymRows, [1500, 1500, 1500, 1500, 1500, 1526], null,
      "Q1 miss cost as a multiple of a missed shock elsewhere. Cost / never at the uniform 5 : 1 cost."),
  );

  add(
    H2("I. Recommended Operating Policy"),
    P(N.recommendText),
  );
};
