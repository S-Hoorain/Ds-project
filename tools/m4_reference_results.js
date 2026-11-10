// Headline results, rubric map, outside methods and limitations of the Milestone 4 reference
// (used by tools/build_m4_reference_doc.js). Numbers from notebooks 05 and 06 (run of 2026-11-10).

const HEADLINE = {
  paragraph: "We added two ensemble learners (a random forest and gradient boosting) to the three Milestone 3 baselines, re-tuned all five under one leakage-free protocol (expanding-window folds, within-year AUC), and compared them with the submitted baselines on every metric of the brief. The random forest became the final model. We then audited it for fairness across the five consumption quintiles (Q1 poorest, the unprivileged group; Q5 richest, the privileged group), tested hypotheses H4 and H5 from Milestone 2, traced the source of the gaps, tried pre-, in- and post-processing mitigation, mapped the fairness-accuracy trade-off as a Pareto frontier, and assessed the system against the FATEN principles and a living-lab pilot.",
  bullets: [
    "**The five learners are statistically tied** in cross-validation (within-year AUC 0.635 to 0.683, year-to-year SD 0.03 to 0.10). KNN scored highest (0.683) but cannot take row weights; the **random forest** (0.678) is the final model.",
    "**Ensembling did not beat the best baseline.** Test AUC 0.674 for the forest against 0.679 for the M3 KNN (difference −0.005, interval −0.10 to +0.11). The limit is the weak signal, not model flexibility.",
    "**Shuffled stratified K-fold would have reported AUC 0.83** for the forest (0.15 too optimistic): our time-ordered folds are the leakage-free design.",
    "**The threshold problem remains:** in 2025–26 (7.7% shock rate) the forest's alarms were never right more than one time in six, the break-even precision at 5 : 1, so no threshold beat 'never alert'. The probabilities over-predicted by about half.",
    "**The new features did not improve ranking** in cross-validation (0.684 without, 0.678 with).",
    "**H4 not supported** (Wald p = 0.067); only fuel reviews matter more for Q5. A pooled model beats quintile-own models.",
    "**Fairness:** demographic parity holds (disparate impact 1.05, 80% rule met); Q1's recall is 2.6 points below Q5's (not significant); the forest ranks Q1's weeks worse (AUC 0.64 against 0.72). **H5 not supported** (Brier 0.148 vs 0.136, p = 0.26).",
    "**Mechanism:** 42% of Q1's shocks are perishable-driven against 24% of Q5's, and perishable shocks are caught least (recall 0.62 against 0.88 for fuel).",
    "**Mitigation:** reweighing changes nothing useful (base rates already equal); quintile thresholds with a recall gap of at most 0.05 are both fairer and cheaper than one shared threshold in 2021–24 (gap 0.05 vs 0.13, cost 0.637 vs 0.651). Nothing transfers cleanly to the calm test period.",
  ],
};

const RUBRIC = [
  ["Advanced algorithms (at least two)", "30%", "`make_models()`; nb05 §3–4", "Random forest and gradient boosting (Week 12 ensembles), plus the three M3 learners re-tuned."],
  ["Systematic tuning with stratified CV, no leakage", "30%", "`tune()`; nb05 §2, §4, §7", "Grid search over 48–196 settings per learner on expanding-window folds that contain both classes for every quintile; shuffled stratified K-fold shown to inflate AUC by 0.15."],
  ["Comparison with M3 baselines", "30%", "nb05 §5–6; manuscript Table 27", "Accuracy, precision, recall, F1, ROC-AUC, PR-AUC, Brier, cost; bootstrap interval of the AUC gain; feature ablation."],
  ["Sensitive attributes", "35%", "nb06 §1; manuscript VII-A", "Consumption quintile (socio-economic class); Q1 unprivileged, Q5 privileged; the alarm is the favourable outcome."],
  ["Demographic parity, disparate impact (80% rule)", "35%", "`fairness_summary()`; nb06 §2–3", "Ratio 0.96–1.05 for every learner; met."],
  ["Equalized odds, equal opportunity, predictive equality", "35%", "nb06 §2–3, Figure F1", "TPR and FPR by quintile with week-bootstrap intervals; Q1's recall slightly below Q5's."],
  ["Fairness–accuracy trade-off", "35%", "`pareto_frontier()`; nb06 §7, Figure F2", "Exact frontier of quintile thresholds; the shared threshold lies above it."],
  ["Bias mitigation (pre/in/post)", "20%", "nb06 §6", "Reweighing; Q1 shocks weighted twice in training; quintile thresholds (cost-based, equal opportunity, 80% rule)."],
  ["Asymmetric thresholds across groups", "20%", "nb06 §8, Figure F3", "Q1 miss cost 1, 1.5, 2, 3 × a miss elsewhere; thresholds and recalls by quintile."],
  ["FATEN and living lab", "15%", "nb06 §10–11; manuscript VIII", "Five principles assessed with evidence, risk and safeguard; pilot design, eight failure modes and safeguards."],
  ["Notebook and PDF quality", "15%", "nb05, nb06; manuscript PDF", "Both notebooks run top to bottom; every manuscript number comes from their tables."],
];

const BEYOND = [
  ["Diebold–Mariano test (planned in M2)", "H5 compares the forecast losses of Q1 and Q5 week by week, and weekly losses are autocorrelated.", "A paired t-test over weeks (Unit 07) with a Newey–West standard error."],
  ["Newey–West (HAC) standard errors (from M3)", "Used inside the Diebold–Mariano test.", "Widens the standard error when nearby weeks are correlated, so p-values are not too optimistic."],
  ["Week-clustered Wald test (from M3)", "H4 compares Q1 and Q5 rows of the same week, which are not independent.", "Count each week as one block of evidence."],
  ["Permutation importance (from M3)", "Ensembles have no coefficients; we also need importance on Q1 and Q5 rows separately.", "Shuffle one feature in the validation year and record the drop in AUC."],
  ["Reweighing (Kamiran and Calders, 2012)", "The brief asks for a pre-processing mitigation; this is the standard one.", "Weight each (group, outcome) cell so group and outcome become independent."],
  ["Exact Pareto search over quintile thresholds", "The brief asks for a Pareto frontier of fairness against accuracy.", "For each allowed gap, try every lowest recall and give each quintile its cheapest threshold in range."],
  ["HistGradientBoostingClassifier", "Gradient boosting is a Week 12 topic; this is scikit-learn's fast version, also used in Assignment 2.", "The same algorithm with features binned into at most 255 values."],
];

const LIMITS = [
  "**The test period is a second look.** M3 already examined 2025–26, and the two new features were inspired by its errors. Milestone 5's new weekly releases are the clean out-of-sample test.",
  "**A weak signal.** No learner reaches a within-year AUC of 0.7; ensembles do not add skill over a re-tuned KNN.",
  "**Thresholds do not transfer across regimes.** In the calm test period no threshold beats never alerting at 5 : 1. Re-choosing thresholds on recent weeks is the main task of Milestone 5.",
  "**Small groups in the test period.** 6 to 9 shock rows per quintile; fairness gaps there are too noisy to rank mitigation policies.",
  "**Missing lead signals for the poorest's shocks.** Perishable supply shocks and tariff decisions drive Q1's shocks and have no lead feature; wholesale prices and the NEPRA/OGRA calendar are the M5 candidates.",
  "**Who the data cannot see.** Urban only (17 cities), 2015-16 weights, no gender or province: these groups cannot be audited.",
  "**Value judgements.** The 5 : 1 cost ratio and the double weight on a missed Q1 shock are choices for the agency and the people affected, shown with sensitivities.",
  "**Final-model rule decided after seeing the CV tie** (KNN 0.683 vs forest 0.678), and disclosed as such.",
  "**M5 plan:** add new weekly releases, retrain week by week (walk-forward), re-choose thresholds on recent weeks and measure how fast they recover after a regime change; test the tariff calendar and perishable lead data; repeat the fairness audit on the new weeks.",
];

module.exports = { HEADLINE, RUBRIC, BEYOND, LIMITS };
