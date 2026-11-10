"""Text cells of notebooks 05 and 06 (Milestone 4). Numbers quoted here come from the executed notebooks."""

T5, T6 = {}, {}

# ====================================================================== notebook 05
T5["intro"] = r"""
# 05 · Advanced Models and Final Model Selection (Milestone 4)

**Project:** An early-warning system for essential-price shocks across income quintiles in Pakistan (DS4SG, CS/SDP 312/314)

**Where Milestone 3 left us.** Three baseline learners (logistic regression, k-nearest neighbours and a shallow decision
tree) predicted, at the end of week *t*, whether week *t+1* would be a price-shock week (the group's SPI rises by at
least 1%) for each consumption quintile. They beat the naive benchmarks in the validation years, but no
cross-validated AUC reached 0.7, and an alarm threshold learned in the crisis years raised far too many false alarms
in the calm test period of 2025–26.

**What this notebook adds.**
* two ensemble learners, a random forest and gradient boosting, tuned with the same leakage-free validation as Milestone 3
* two new features that let the models follow the inflation regime
* a direct comparison with the Milestone 3 baselines on every metric of the brief
* threshold curves, the cost of errors and the calibration of the probabilities
* the test of hypothesis H4 (do the poorest and the richest quintiles need different warning signals?)
* the drivers of the final model, overall and separately for Q1 and Q5

The fairness audit, the bias mitigation and the ethics of the final model are in notebook 06.

| Rubric item (M4) | Section |
|---|---|
| At least two advanced or ensemble learners, compared with the Milestone 3 baselines | §3, §4, §5 |
| Systematic hyperparameter search with cross-validation and no leakage | §2, §3, §4, §7 |
| Accuracy, precision, recall, F1, ROC-AUC and PR-AUC, and the gain over Milestone 3 | §5, §6 |
| Threshold curves and asymmetric error costs | §8, §9 |
| Feature importance and research insights | §10, §11, §13 |

**Inputs:** `data/processed/master_features.csv` and the Milestone 3 models in `models/m3_baselines/`.
**Shared code:** `src/models/advanced.py` (new features, the five learners and their grids, fairness tools), which
reuses `src/models/baseline.py` from Milestone 3 unchanged.
**Outputs:** figures `reports/figures/figA1`–`figA6`, tables `reports/tables/m4_*.csv`, fitted models and predictions in
`models/m4_advanced/` (read by notebook 06).
"""

T5["data"] = r"""
## 1. Data and two new features

The rows, the target and the split are exactly those of Milestone 3, so every number can be compared directly.
One row is one SPI week and one quintile (Q1 to Q5). The target is 1 if the group's SPI rises by at least 1% in the
following week. Training covers the weeks up to 31 December 2024 and the test period the weeks of 2025–26.
"""

T5["new_features"] = r"""
**Why two new features.** The Milestone 3 error analysis pointed at two gaps.

* **Shock rate over the past 26 weeks** (`shock_rate_26w`), the share of this quintile's last 26 weeks that were shock
  weeks. The baselines had no way to tell a crisis year from a calm year, so a threshold learned on 2021–24 raised too
  many alarms in 2025–26. With this feature the predicted probability can fall when shocks have become rare and rise
  when they become common. Twenty-six weeks (half a year) is long enough to be stable and short enough to follow a
  change of regime within months. It uses weeks up to and including week *t* only.
* **Next week is in July** (`july_next_week`). The Milestone 3 fiscal-year flag marks only the one week that contains
  1 July. Budget measures, new taxes and tariff rebasing spread over the whole first month of the fiscal year.

**A note on the test period.** Both ideas came from the Milestone 3 test-period errors (thresholds that did not carry
over, and July shocks after the first week). The 2025–26 period is therefore a second look for these two features,
not an untouched test. We therefore check below that both features already carry information in
the training years alone, §6 measures how much each one changes the cross-validated scores (which never use the test
period), and Milestone 5's new weekly releases will be the clean out-of-sample test.
"""

T5["new_features_read"] = "NEW_FEATURES_READ"

T5["validation"] = r"""
## 2. Validation design: time-ordered folds instead of shuffled stratified K-fold

The brief asks for hyperparameter tuning with stratified K-fold cross-validation and no data leakage. Stratification
keeps the share of shock rows about the same in every fold, so that no fold is left without the rare class. In our
data a stratified K-fold would draw rows at random, which leaks in two ways. It would train on later years to predict
earlier ones, and it would put the five quintile rows of one week, which share every week-level signal, on both sides
of the split. In Milestone 3 this inflated the AUC by 0.05 to 0.14.

We therefore keep the Milestone 3 folds and check that they give what stratification is meant to give.

* **K = 4 expanding-window folds.** Fold *k* validates on calendar year 2020 + *k* and trains on every week before it,
  so a model never sees a week later than the ones it predicts.
* **Whole weeks** stay together, so sister quintile rows never sit on both sides.
* **Both classes in every fold.** The table below shows that every validation year contains shock rows and calm rows
  for every quintile, which also makes a fairness comparison by quintile possible in every fold.
* The folds are identical to Milestone 3, so the scores of the old and new models are directly comparable.
"""

T5["leakage"] = r"""
**Leakage checklist for Milestone 4**

| Possible leak | How it is closed |
|---|---|
| Training on weeks later than the ones predicted | expanding window, asserted above |
| Sister quintile rows of the same week on both sides | folds are built from whole weeks |
| Scaling with validation or test statistics | scalers sit inside each pipeline and are re-fitted on each fold's training rows (the ensembles need no scaling) |
| New features that peek at week *t+1* | the 26-week shock rate uses weeks up to *t*; July is a calendar fact known in advance |
| Fairness weights computed on validation rows | reweighing and group weights (notebook 06) are computed on each fold's training rows only |
| Thresholds, fairness constraints or hyperparameters chosen on the test period | all are chosen on the 2021–24 out-of-fold predictions |

Two exceptions are disclosed. The seven "momentum" items behind `momentum_spikes_4w` were chosen in Milestone 2 on all
training weeks, so inside cross-validation that choice has seen later folds (never the test period). And, as noted in
§1, the two new features were motivated by the Milestone 3 test-period errors.
"""

T5["models"] = r"""
## 3. Models and search spaces

|  | Random forest | Gradient boosting |
|---|---|---|
| **How it works** | grows many decision trees, each on a bootstrap sample of the training rows and choosing every split from a random subset of the features, then averages their votes | adds small trees one at a time, each fitted to the errors that the trees before it still make, and adds a shrunken copy of it to the model (the learning rate sets how much) |
| **Why it suits this problem** | it keeps what a tree does well (thresholds such as "the rupee fell by more than 8%" and interactions such as a falling rupee before the budget) while averaging away the variance that made the single Milestone 3 tree unstable | it builds the interactions gradually and can be held back in several ways (learning rate, tree depth, leaf size, an L2 penalty), which matters with only 1,350 training rows |
| **Main weakness** | less transparent than one tree, and its probabilities are averages of leaf shares, so they need a calibration check | many settings to tune, and it overfits quickly if the learning rate is high and the trees are deep |
| **Search space** | depth 3, 5, 8 or unlimited; minimum leaf 5, 20, 50 or 100 rows; features per split √20 or half; Gini or entropy; class weights none or balanced (128 settings, 300 trees each) | learning rate 0.01, 0.03 or 0.1; 100 or 300 trees; depth 2 or 3; minimum leaf 20, 50 or 100; L2 penalty 0 or 1; class weights none or balanced (144 settings) |

The implementation is scikit-learn's `RandomForestClassifier` and `HistGradientBoostingClassifier`. The second is the
usual gradient boosting algorithm with one speed-up: each feature is first sorted into at most 255 bins, so split
points are searched among bins instead of among every distinct value. With 1,350 rows this changes little.

**The Milestone 3 learners are re-tuned under the same protocol** with their Milestone 3 grids plus the two options our
after-submission check found missing: the split criterion of the tree (Gini or entropy) and the distance of KNN
(Euclidean or Manhattan). The three of them also get the two new features. Comparing them with the ensembles separates
the gain from the new features and the new selection rule from the gain from ensembling.

**Selection rule: within-year AUC.** Each setting is ranked by the mean of its four per-year validation AUCs. Milestone 3
ranked by the AUC of the pooled out-of-fold predictions. We found afterwards that the pooled AUC partly rewards telling
crisis years from calm years (the tree's pooled AUC was higher than three of its four yearly AUCs), while the
within-year order of the learners was the order the test period reproduced. The level of the probabilities, which the
pooled AUC was meant to protect, is handled by the new 26-week shock rate and checked directly through calibration
(§9) and the cost of one shared threshold (§8). Pooled AUC, PR-AUC and the Brier score are reported next to it. The
rule was fixed before any Milestone 4 model was fitted. **The final model is the learner with the highest within-year
AUC.**
"""

T5["tuning"] = r"""
## 4. Tuning results

Every setting is trained on each fold's training weeks and predicts that fold's validation year. The tables show the
three best settings of each learner. "train AUC" is the AUC on each fold's own training weeks, kept to see over- and
underfitting.
"""

T5["tuning_read"] = "TUNING_READ"

T5["compare"] = r"""
## 5. Comparison with the Milestone 3 baselines

The Milestone 3 models are loaded exactly as submitted (18 features, their settings and their thresholds) and checked
against their submitted cross-validated AUCs. Their out-of-fold predictions are rebuilt on the same folds. They are
compared with the five learners under the Milestone 4 protocol on every metric of the brief.

* **Cross-validated (2021–24):** within-year AUC (the new selection rule), pooled AUC, PR-AUC and Brier score.
* **Test period (2025–26):** accuracy, precision, recall, F1, ROC-AUC, PR-AUC, Brier score and the expected cost of errors
  relative to never raising an alarm, at each model's threshold. The threshold minimises the cost of errors on the
  2021–24 out-of-fold predictions, with a missed shock costing five false alarms, as in Milestone 3.

Accuracy is reported because the brief asks for it, but it cannot be used to choose an alarm model. Never raising an
alarm scores 92.3% on the test period while catching no shock.
"""

T5["compare_read"] = "COMPARE_READ"

T5["ablation"] = r"""
## 6. Where does the change come from?

The final model's selected setting is retrained four times on the same folds, with the 18 Milestone 3 features, with
each new feature added on its own, and with both. Cross-validated scores never use the test period, so this is the
cleanest evidence on the two new features.
"""

T5["ablation_read"] = "ABLATION_READ"

T5["leak_check"] = r"""
## 7. Leakage check: what would shuffled stratified K-fold have reported?

As in Milestone 3, the tuned ensembles are re-scored with two designs that ignore time. Shuffled stratified K-fold over
rows is the textbook default. The whole-weeks version keeps a week's five rows together but still lets later years
predict earlier ones.
"""

T5["leak_read"] = "LEAK_READ"

T5["thresholds"] = r"""
## 8. Threshold curves and asymmetric error costs

An alarm needs a cut-off on the predicted probability. As in Milestone 3, a missed shock is counted as five false
alarms (the ratio was justified in the Milestone 3 report, and ratios from 1 to 20 are shown below), and the threshold
is the value with the lowest cost of errors on the 2021–24 out-of-fold predictions. The curves show how precision,
recall, F1 and the cost change with the threshold, in the validation years and in the test period. Notebook 06 sets
a separate threshold for each quintile.
"""

T5["thresholds_read"] = "THRESHOLDS_READ"

T5["calibration"] = r"""
## 9. Calibration: do the probabilities mean what they say?

A probability of 0.2 should be followed by a shock about one time in five. We sort the predictions into eight groups
of equal size and compare the mean prediction with the observed shock rate in each group, and we report the Brier score
(the mean squared difference between the probability and the 0/1 outcome, lower is better). The Brier score of always
predicting the training shock rate is the reference. Calibration matters here for two reasons. A single threshold only
works across years if the probabilities keep their meaning, and hypothesis H5 (notebook 06) compares Q1 and Q5 on the
Brier score.
"""

T5["calibration_read"] = "CALIBRATION_READ"

T5["h4"] = r"""
## 10. Hypothesis H4: do the poorest and richest quintiles need different warning signals?

From the Milestone 2 manuscript: in a pooled logit for Q1 and Q5, P(shock next week) depends on the group's own history,
the controls, the six lead signals and the signals multiplied by a Q5 indicator. The coefficients δ of these six
interactions measure how much more (or less) each signal matters for Q5 than for Q1.

* **H0:** δ = 0 for all six interactions (the same signals work for both groups).
* **H1:** at least one δ ≠ 0.

Tested at the 5% level with the p-value approach on the training period. Milestone 2 planned a likelihood-ratio test.
As for H1 in Milestone 3, the likelihood-ratio test treats the rows of a week as independent, so the main test is a
**Wald test with standard errors clustered by week**, and the likelihood-ratio statistic is shown for reference. An
exploratory version adds interactions for the three component-momentum features, which Milestone 2's correlations
pointed at.

The out-of-sample side of H4 compares the final model trained on all five quintiles with the same model trained
separately on each quintile's rows.
"""

T5["h4_read"] = "H4_READ"

T5["importance"] = r"""
## 11. Feature importance: what drives the forecasts?

Permutation importance, as in Milestone 3. In each fold the model is trained on the training weeks, then one feature at
a time is shuffled in the validation year and the drop in AUC is recorded. A large drop means the model relies on the
feature. It is computed for both ensembles, and for the final model separately on the Q1 rows and the Q5 rows, to see
whether the poorest and richest quintiles are warned by different signals. The test period is not used.
"""

T5["importance_read"] = "IMPORTANCE_READ"

T5["save"] = r"""
## 12. Saved models and predictions

The five fitted pipelines are saved with `joblib` together with a model card (features, selected settings, thresholds,
cross-validated scores, final model) and the out-of-fold and test-period predictions that notebook 06 audits.
"""

T5["summary"] = "SUMMARY5"

# ====================================================================== notebook 06
T6["intro"] = r"""
# 06 · Fairness Audit, Bias Mitigation and Ethics (Milestone 4)

**Project:** An early-warning system for essential-price shocks across income quintiles in Pakistan (DS4SG, CS/SDP 312/314)

**The question.** An early warning is only useful for social protection if it works for the households that need
protection most. This notebook asks whether the final model of notebook 05 warns the poorest quintile (Q1) as well as
the richest (Q5), measures the gaps with the group fairness metrics of the brief, tests hypothesis H5 from Milestone 2,
finds where the gaps come from, and tries three ways of reducing them. It ends with an assessment against the FATEN
principles and with what would change in a real pilot.

| Rubric item (M4) | Section |
|---|---|
| Sensitive attribute | §1 |
| Demographic parity and disparate impact (80% rule), equalized odds, equal opportunity, predictive equality | §2, §3 |
| H5 (the model is less accurate for Q1), promised in Milestone 2 | §4 |
| Where the disparity comes from | §5 |
| Bias mitigation (pre-, in- and post-processing) | §6 |
| Fairness-accuracy trade-off (Pareto frontier) | §7 |
| Thresholds with asymmetric error costs across groups | §8 |
| Recommended policy, FATEN principles and living-lab deployment | §9, §10, §11 |

**Inputs:** the models, thresholds and predictions saved by notebook 05 in `models/m4_advanced/` (run notebook 05 first),
`data/processed/master_features.csv` and `data/processed/items_weekly_panel.csv`.
**Outputs:** figures `reports/figures/figF1`–`figF3` and tables `reports/tables/m4_*.csv`.
"""

T6["attribute"] = r"""
## 1. The sensitive attribute

* **Attribute: consumption quintile, a measure of socio-economic class.** PBS publishes the SPI separately for five
  groups of households ranked by monthly consumption expenditure. **Q1, the poorest fifth, is the unprivileged group and
  Q5, the richest fifth, the privileged group.** Q2 to Q4 are audited too.
* **What a positive prediction means here.** An alarm says "this group's prices will jump next week", and it is what
  would prepare a BISP top-up or other relief. The alarm is therefore the favourable outcome. A group that is warned
  less often, or whose real shocks are caught less often, is the one at a disadvantage. This is the reverse of a loan
  or policing model, where a positive prediction is the harm.
* **The unit is a quintile-week, not a person.** Each row is the price index of one fifth of urban households in one
  week. A missed Q1 shock means the poorest fifth of urban households met a price jump with no buffer.
* **Attributes we cannot audit.** The SPI covers 17 cities, so rural households are not in the data at all. Prices are
  national averages, so cities and provinces cannot be compared, and there is no information on gender or household
  type. §10 and §11 return to this.
* **Where the audit is run.** Mainly on the 2021–24 out-of-fold predictions, which give about 40 shock rows per quintile.
  The test period (6 to 9 shock rows per quintile) is a check. Every gap carries a bootstrap interval over whole weeks.
"""

T6["attribute_read"] = "ATTRIBUTE_READ"

T6["metrics"] = r"""
## 2. Group fairness metrics

All metrics compare the five quintiles at the alarm threshold of each model (one shared threshold, chosen on 2021–24 in
notebook 05). Q1 against Q5 is the main comparison, and the range over all five quintiles is shown too.

| Metric | Definition | Fair when | What a gap would mean here |
|---|---|---|---|
| Disparate impact ratio | alert rate of Q1 / alert rate of Q5 | between 0.8 and 1.25 (the 80% rule) | below 0.8, the poorest are warned disproportionately less often |
| Demographic parity difference | alert rate of Q1 − alert rate of Q5 | 0 | as above, as a difference |
| Equal opportunity difference | recall (TPR) of Q1 − recall of Q5 | 0 | negative, more of Q1's real shocks arrive without warning |
| Predictive equality difference | false-positive rate of Q1 − FPR of Q5 | 0 | positive, Q1's calm weeks are more often false alarms |
| Equalized odds gap | the larger of the absolute TPR and FPR differences | 0 | both kinds of error are shared unequally |

**Which one matters most.** A missed shock is the costly error (a missed shock costs five false alarms), and it falls on
the household, so **equal opportunity** is our main criterion. Predictive equality matters for trust and for the fiscal
cost of false alarms. Demographic parity ignores whether a shock actually came, but because the shock rate is almost
the same in every quintile (§1), a model that serves all groups alike should also roughly meet it.
"""

T6["audit_read"] = "AUDIT_READ"

T6["h5"] = r"""
## 4. Hypothesis H5: is the model less accurate for the poorest quintile?

From the Milestone 2 manuscript, with Brier loss *L* (the squared difference between the predicted probability and the
0/1 outcome, which rewards probabilities that are both sharp and calibrated):

* **H0:** E[*L*<sub>Q1</sub>] = E[*L*<sub>Q5</sub>]
* **H1:** E[*L*<sub>Q1</sub>] > E[*L*<sub>Q5</sub>] (one-sided)

**Test (Diebold–Mariano, planned in Milestone 2).** For every week, take the loss difference
*d*<sub>t</sub> = *L*<sub>Q1,t</sub> − *L*<sub>Q5,t</sub>. Under H0 its mean is zero. The test is a paired t-test over weeks,
except that the standard error of the mean uses the Newey–West formula, because weekly losses are autocorrelated (a bad
week tends to follow a bad week) and an ordinary standard error would be too small. We use 4 lags (one month) and
show 1 to 13 as a robustness check. 5% level, p-value approach.
"""

T6["h5_read"] = "H5_READ"

T6["drivers"] = r"""
## 5. Where does a disparity come from?

Most features are week-level signals that are the same for all five quintiles (the rupee, the calendar, component
inflation). Only the group's own SPI history, its recent shocks, its 26-week shock rate and the quintile indicators
differ between rows of the same week. A model built on these signals tends to raise one alarm for the whole week.
But shocks of different origin hit different quintiles. Milestone 3 (H3) found that food, and perishables above all,
widen the inflation gap against Q1, while motor fuel hits Q5 harder. Each shock below is labelled by the price
component with the largest upward impact on the SPI in the shock week, as in Milestone 3.
"""

T6["drivers_read"] = "DRIVERS_READ"

T6["mitigation"] = r"""
## 6. Bias mitigation: pre-, in- and post-processing

Three families of methods, each set up on the 2021–24 out-of-fold predictions only and then scored once on the test
period.

* **Pre-processing: reweighing.** Each combination of quintile and outcome gets the weight
  P(quintile) × P(outcome) / P(quintile, outcome), computed on each fold's training rows. In the weighted data the
  shock rate is the same in every quintile, so the model cannot learn that one quintile is "usually calm". The model is
  retrained with these weights.
* **In-processing: group-weighted training cost.** Q1's shock rows count twice in the model's training loss. While it
  learns, the model pays more for a missed Q1 shock than for any other error.
* **Post-processing: one threshold per quintile.** The model is unchanged and only the alarm threshold differs by group.
  Three versions are compared.
  * *Cost-based:* each quintile's threshold minimises its own cost of errors, with a missed Q1 shock costing ten false
    alarms (twice the usual five) and every other quintile's miss costing five.
  * *Equal opportunity:* the five thresholds with the lowest total cost whose recalls differ by at most 0.05.
  * *Demographic parity:* the five thresholds with the lowest total cost whose alert rates meet the 80% rule.

**Why a missed Q1 shock counts twice.** This is a value judgement, not an estimate. A Q1 household spends a larger share of
its budget on food and energy than richer households and has the least savings to absorb a jump, so it is the most likely to cope by
eating less or borrowing, which is hard to undo. The factor of 2 sits between treating all households alike (1) and an
extreme weight. §8 shows 1, 1.5, 2 and 3.

**Is it fair to use the quintile in the decision?** For decisions about individuals, using a protected attribute can
itself be discrimination. Here the quintile is the unit the policy acts on (BISP targets the poorest households), so
group-specific thresholds are explicit and transparent instead of hidden. The data never identify a person.
"""

T6["mitigation_read"] = "MITIGATION_READ"

T6["pareto"] = r"""
## 7. Fairness-accuracy trade-off: the Pareto frontier

How much accuracy does fairness cost? For a given amount of unfairness that we are willing to accept, we search for
the five quintile thresholds with the lowest expected cost of errors, on the 2021–24 out-of-fold predictions.

* **Equal opportunity:** the largest minus the smallest recall over the five quintiles may be at most ε, for
  ε = 0, 0.02, …, 0.60.
* **Demographic parity:** the smallest alert rate divided by the largest must be at least 1 − ε (ε = 0.2 is the 80% rule).

The cost is the sum of the five quintiles' costs, so the search is exact: for each possible lowest recall *L*, every
quintile takes its cheapest threshold with a recall between *L* and *L* + ε, and the best *L* wins. The resulting curve
is a **Pareto frontier**. Every point on it is a policy that cannot be made fairer without becoming costlier, or cheaper
without becoming less fair. Policies above the curve are wasteful. Accuracy is measured by the expected cost of errors,
because plain accuracy rewards never raising an alarm. Plain accuracy is in the tables too.
"""

T6["pareto_read"] = "PARETO_READ"

T6["asym"] = r"""
## 8. Asymmetric thresholds across groups

The cost-based quintile thresholds depend on how much more a missed Q1 shock is assumed to cost. The table shows the Q1
and Q5 thresholds, recalls and false-positive rates for a Q1 miss cost of 1, 1.5, 2 and 3 times a miss elsewhere. The
figure shows the threshold curve of every quintile, the cost of that quintile's errors at every threshold. Each curve
has its minimum at a different place, which is why one shared threshold cannot be optimal for every group.
"""

T6["asym_read"] = "ASYM_READ"
T6["recommendation"] = "RECOMMENDATION"
T6["faten"] = "FATEN"
T6["living_lab"] = "LIVING_LAB"
T6["summary"] = "SUMMARY6"

T6["final_detail"] = r"""
## 3. The final model in detail, with uncertainty

Rates for each quintile at the shared threshold, then 95% intervals for the fairness metrics from 2,000 bootstrap
resamples of whole weeks (the five quintile rows of a week are drawn together, because they share their signals).
"""

T6["living_lab"] = r"""
## 11. Living lab: how the system would behave in a real pilot

A living lab tests a system with its real users, in its real setting, while it is watched closely and can be changed.
For this model that means a pilot of about six months in which the weekly forecast goes to a social-protection desk
(BISP or a provincial social-protection authority) and staff decide what to do with it.

**The weekly cycle.** PBS releases the SPI → the model is re-run with the new week → quintile alarms and probabilities
go to the desk with the reason behind each alarm (which signals were on) → staff decide whether to prepare or bring
forward a top-up → the next release shows whether the shock came, and the result is logged.

**Stakeholders.** BISP and provincial social-protection staff (users), the Ministry of Finance (budget), PBS (data),
NEPRA, OGRA and the ECC (who set administered prices), beneficiary households and the civil-society groups that speak
for them, and an independent reviewer.

| Failure mode | What we saw in our data | Safeguard |
|---|---|---|
| The regime changes and the threshold no longer fits | a threshold chosen on 2021–24 over-alerted in calm 2025–26 (§8 of notebook 05) | track the alert rate against the realised shock rate every month, re-choose the threshold on recent weeks, retrain when they drift apart (Milestone 5) |
| The first wave of an administered price rise is missed | utility tariff and first petrol increases had no lead signal in Milestone 3 | an agreement that NEPRA, OGRA and the ECC notify the desk before a decision takes effect |
| One quintile is served worse | Q1's recall trails Q5's (§2, §3) | quintile thresholds (§6) and a fairness dashboard with recall and alert rate by quintile, reviewed monthly |
| Households outside the data | 17 cities only, no rural prices, 2015-16 weights | never use the alarm as the only trigger, add rural price data, re-weight the quintiles when PBS updates them |
| Data arrive late or are revised | revised SPI values were used in training | run the pilot on first releases and keep a record of every data version |
| Staff stop questioning the model, or stop listening to it | many false alarms per real shock | show the probability and its reasons, keep the decision with staff, report the alarm record openly |
| A public warning feeds expectations or hoarding | not testable in our data | keep alarms internal, publish results only with a delay |
| Pressure to silence alarms before a budget or election | not testable in our data | log every alarm and every decision so that overrides can be reviewed |

**Digital marginalization.** The households least visible to the data, rural families and those whose consumption the
2015-16 weights no longer describe, are the ones most likely to be left out by any system that only acts on what the
SPI measures. The model should therefore add to existing targeting, never replace it, and an alarm that does not
fire must never be read as "no help needed".
"""

T6["faten"] = r"""
## 10. FATEN principles: how does the final system measure up?

FATEN_TABLE
"""
