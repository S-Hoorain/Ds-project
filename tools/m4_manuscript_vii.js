// Section VII of the Milestone 4 manuscript (fairness audit and bias mitigation), used by tools/build_manuscript_m4.js.
module.exports = function sectionVII({ add, H1, H2, P, BUL, table, figure, nt, nf, cur }, N) {
  add(H1("VII. Algorithmic Fairness Audit and Bias Mitigation"));

  add(
    H2("A. Sensitive Attribute and Favourable Outcome"),
    P("The sensitive attribute is the **consumption quintile**, a measure of socio-economic class. PBS ranks households by monthly consumption expenditure and publishes the SPI for each fifth. **Q1, the poorest fifth, is the unprivileged group and Q5, the richest, the privileged group**, and Q2 to Q4 are audited as well. Two features of the setting shape the audit. First, the favourable outcome is the alarm, because an alarm is what would prepare a top-up, so a quintile that is warned less often, or whose real shocks are caught less often, is the one at a disadvantage. This is the reverse of a lending or policing model, where a positive prediction is the harm. Second, the unit is a quintile-week and not a person. A missed Q1 shock means that the poorest fifth of urban households met a price jump without a buffer. Rural households, cities, provinces and gender cannot be audited, because the SPI does not record them (Section VIII-C)."),
    P("Shock rates are almost equal across quintiles (Table " + nt() + "). In 2021–24 every quintile had between 38 and 44 shock rows out of 208, and in the test period between 6 and 9 out of 91. Most shocks hit several quintiles in the same week. Equal base rates matter for the choice of metric. When base rates differ, a model cannot be calibrated within groups and have equal error rates at the same time [19], [20], but with nearly equal base rates these criteria can hold together, so we can ask for all of them. They also make demographic parity, which ignores whether a shock came, a reasonable check here."),
    table("Shock rows by quintile.", ["Period", "Q1", "Q2", "Q3", "Q4", "Q5"], N.baseRows, [3000, 1200, 1200, 1200, 1200, 1226], null,
      "Shock row: the quintile's SPI rose by at least 1% in the following week. Rows per quintile: 270 (training), 208 (2021–24 validation years), 91 (test)."),
  );

  add(
    H2("B. Fairness Metrics"),
    P("We compute the group metrics of the brief at each learner's shared threshold. The **disparate impact ratio** is the alert rate of Q1 divided by that of Q5, and the four-fifths (80%) rule [21], [22] flags values below 0.8 (or above 1.25, if Q5 were disadvantaged). **Equal opportunity** compares recall (true-positive rates), **predictive equality** compares false-positive rates, and **equalized odds** requires both [23], [24]. Because a missed shock is the costly error and falls on the household, equal opportunity is our main criterion. Predictive equality matters for trust and for the fiscal cost of false alarms. The audit uses the 2021–24 out-of-fold predictions (about 40 shock rows per quintile) and repeats it on the test period, with 95% intervals from 2,000 bootstrap resamples of whole weeks."),
  );

  add(
    H2("C. Audit Results"),
    P(N.auditText),
    table("Group fairness metrics at each learner's shared threshold, validation years 2021–24 (test period in brackets).",
      ["Learner", "Disparate impact (Q1/Q5)", "Equal opportunity diff. (TPR Q1 − Q5)", "Predictive equality diff. (FPR Q1 − Q5)", "Recall range, all quintiles"],
      N.auditRows, [2000, 1700, 1800, 1800, 1726], null,
      "The 80% rule is met when the disparate impact ratio lies between 0.8 and 1.25. Differences are Q1 minus Q5, so a negative equal opportunity difference means Q1's shocks are caught less often.", 17),
    figure("figF1_rates_by_quintile.png", "Recall, false-positive rate and alert rate by quintile for the random forest at its shared threshold of 0.14. Circles, validation years 2021–24 (out-of-fold). Squares, test period. Lines, 95% intervals from 1,000 bootstrap resamples of whole weeks."),
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
    P("We compare three families of mitigation, each set up on the 2021–24 out-of-fold predictions only and scored once on the test period. **Pre-processing by reweighing** [25] gives each combination of quintile and outcome the weight P(quintile) × P(outcome) / P(quintile, outcome), computed on each fold's training rows, so that in the weighted data the shock rate is the same in every quintile. **In-processing by group-weighted training cost** counts Q1's shock rows twice in the forest's training loss, so that the model pays more for missing them while it learns. **Post-processing by quintile thresholds** [24] keeps the model and sets one alarm threshold per quintile. We compare three versions, which are cost-based thresholds in which a missed Q1 shock costs ten false alarms instead of five, the cheapest thresholds whose recalls differ by at most 0.05 (equal opportunity), and the cheapest thresholds whose alert rates meet the 80% rule (demographic parity)."),
    P("The double weight on a missed Q1 shock is a value judgement, not an estimate. A Q1 household spends a larger share of its budget on food and energy than richer households and has the least savings to absorb a jump, so it is the most likely to cope by eating less or borrowing, which is hard to undo. The factor of 2 sits between treating all households alike and an extreme weight, and Section VII-H varies it from 1 to 3. Using the quintile in the decision is explicit here, because the quintile is the unit the policy acts on and no person is identified."),
    table("Accuracy and fairness of the mitigation policies (random forest; validation years 2021–24, test period in brackets).",
      ["Policy", "Cost / never", "Accuracy", "Recall", "Recall Q1", "Recall Q5", "Disparate impact", "Recall range"],
      N.policyRows, [2500, 900, 900, 850, 850, 850, 1100, 1076], null,
      "Cost / never: cost of errors (1 per false alarm, 5 per missed shock) relative to never alerting. Recall range: largest minus smallest recall over the five quintiles.", 16),
    P(N.mitigationText),
  );

  add(
    H2("G. The Fairness–Accuracy Trade-off"),
    P("To map the trade-off we search, for every tolerance ε, for the five quintile thresholds with the lowest expected cost of errors such that the recalls of the five quintiles differ by at most ε (equal opportunity), or such that the smallest alert rate is at least 1 − ε times the largest (demographic parity). Because the total cost is the sum of the quintiles' costs, the search is exact. For each candidate lowest recall, every quintile takes its cheapest threshold whose recall lies within ε of it, and the best candidate wins. The resulting curve is a Pareto frontier, on which no policy can be made fairer without costing more, or cheaper without becoming less fair. We measure accuracy by the expected cost of errors, because plain accuracy rewards never raising an alarm, and report plain accuracy alongside."),
    figure("figF2_pareto_frontier.png", "Fairness–accuracy trade-off for the random forest, validation years 2021–24. Left, recall gap across the five quintiles against the cost of errors relative to never alerting. Right, smallest over largest alert rate (dotted line, the 80% rule). Black, the Pareto frontier of quintile thresholds. Markers, the mitigation policies of Table " + cur() + "."),
    P(N.paretoText),
  );

  add(
    H2("H. Asymmetric Thresholds Across Quintiles"),
    P(N.asymText),
    table("Quintile thresholds as the cost of a missed Q1 shock varies (random forest).",
      ["Q1 miss cost", "Period", "Threshold Q1", "Threshold Q5", "Recall Q1", "Recall Q5", "Cost / never"],
      N.asymRows, [1300, 1700, 1200, 1200, 1200, 1200, 1226], null,
      "Q1 miss cost: the cost of a missed Q1 shock as a multiple of a missed shock in any other quintile (5 false alarms). Cost / never at the uniform 5 : 1 cost, so the rows are comparable."),
  );

  add(
    H2("I. Recommended Operating Policy"),
    P(N.recommendText),
  );
};
