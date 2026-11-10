"""Interpretation cells of notebooks 05 and 06, quoting the executed notebooks (run of 2026-11-10).
Imported by build_m4_notebooks.py after nb_text_m4, so these texts fill the result cells."""

from nb_text_m4 import T5, T6

# ====================================================================== notebook 05
T5["new_features_read"] = r"""
**Reading the evidence (training years only)**
* Rows followed by a July week had a shock rate of **25.5%**, against 16.5% for all other rows, so the July effect is not
  only a test-period pattern. The one-week fiscal-year flag stays in the model too, because the week that contains
  1 July is still the riskiest single week (14 of its 25 training rows were followed by a shock).
* The 26-week shock rate separates calm and turbulent periods. Rows with a rate below 10% were followed by a shock
  **11.2%** of the time, rows between 10% and 20% **15.7%** of the time, and rows above 20% **23.5%** of the time.
* Figure A1 shows the regimes. The rate climbed above 40% in the 2022–23 crisis and fell to zero in early 2025. It
  overlaps with the shocks of the past four weeks (correlation 0.47) but looks much further back.
"""

T5["tuning_read"] = r"""
**Reading the tuning results**
* **Random forest.** The best setting grows trees of depth 5 with leaves of at least 20 rows, about four features per
  split (√20), the Gini criterion and no class weights. Its within-year AUC is **0.678** (SD 0.060 across the four
  years) and its pooled AUC 0.651. Figure A2 shows where overfitting starts. Leaves of 5 rows push the training AUC to
  0.97 but validate at 0.656, while leaves of 20 validate at 0.678 and larger leaves underfit (0.66). Depth hardly
  matters once leaves are 20 rows (0.670 to 0.678), and 9 of the 128 settings are within 0.01 of the best, so the forest
  is not sensitive to the exact choice. Gini beat entropy for the forest (0.678 against 0.663).
* **Gradient boosting** prefers the slowest learning: a learning rate of 0.01 with 300 trees of depth 2 and leaves of
  50 rows, within-year AUC **0.635**. Faster learning overfits clearly. At a learning rate of 0.1 with 300 trees the
  training AUC reaches 0.996 while the validation AUC falls to 0.582. With a weak signal, each tree that corrects the
  last one's errors soon starts to fit noise.
* **The re-tuned Milestone 3 learners.** KNN now uses the Manhattan distance with k = 250 neighbours weighted by
  distance (0.683; the best Euclidean setting reaches 0.661). The tree now splits by entropy, but most of its rise from
  0.578 to 0.657 comes from the new selection rule, because the best Gini tree under the within-year rule already
  reaches 0.653. Logistic regression keeps its Milestone 3 setting and scores 0.640. KNN's training AUC of 1.0 is not
  overfitting in itself. With distance weights, every training row is its own nearest neighbour.
* **The five learners are statistically tied.** Their within-year AUCs span 0.635 to 0.683, while the year-to-year SDs
  are 0.03 to 0.10. Every learner finds 2021 the easiest validation year, and 2022 or 2024 the hardest.
* **Final model: the random forest.** KNN has the highest within-year AUC (0.683), but it cannot be retrained with row
  weights, which the pre- and in-processing bias mitigations of notebook 06 need. Among the learners that can, the
  forest is best (0.678). The gap to KNN (0.005) is about one twelfth of KNN's year-to-year SD. The forest is also
  steadier across years and has the best pooled AUC, the best Brier score and the lowest validation cost at its
  threshold.
"""

T5["compare_read"] = r"""
**Reading the comparison**
* **In cross-validation the gains come from re-tuning, not from ensembling.** The best Milestone 3 baseline (KNN) had a
  within-year AUC of 0.672. The random forest reaches 0.678 and the re-tuned KNN 0.683, differences far smaller than the
  year-to-year SD. The forest, KNN and gradient boosting have Brier scores of 0.152 to 0.155, slightly better than
  predicting the average shock rate (0.158).
* **On the test period the forest matches, but does not beat, the best baseline.** Its ROC-AUC is 0.674 against 0.679
  for the Milestone 3 KNN. The bootstrap interval of the difference runs from −0.10 to +0.11 and is centred on zero. With
  13 shock weeks, no learner is clearly better than another. The decision tree has the highest test AUC (0.687), but it
  was among the weaker learners in the validation years, and choosing it now would mean choosing on the test period.
* **At its threshold of 0.14 the forest caught 18 of the 35 shock rows** (recall 0.51) with 111 false alarms (precision
  0.14, F1 0.22). The Milestone 3 KNN caught 20 with 133 false alarms (F1 0.21).
* **The cost of errors is still above "never alert" in the test period** (1.12 for the forest, 1.19 for the Milestone 3
  KNN). Only logistic regression stays just below (0.98), because its probabilities sit near 0.5 and it rarely alerts.
  §8 explains why no threshold could have done better in 2025–26.
* **Accuracy misleads again.** Logistic regression has the highest accuracy of the five (0.86) because it alerts least,
  and the tree the lowest (0.28) because its threshold of 0.02 alerts in four test weeks out of five.
"""

T5["ablation_read"] = r"""
**Reading the ablation**
* **The new features did not improve the ranking.** With the 18 Milestone 3 features the forest's within-year AUC is
  0.684. Adding the 26-week shock rate lowers it to 0.676, the July window leaves it at 0.684, and both give 0.678.
  These differences are about a tenth of the year-to-year SD, so the new features have no clear effect on ranking.
* With both features the forest is steadier across years (SD 0.060 against 0.073), and its pooled Brier score is
  unchanged (0.152).
* In the test period the July window alone lowered the cost of errors (1.04 against 1.12), but this is the period that
  suggested the feature, so we do not count it as evidence.
* The 26-week rate was meant to fix the threshold problem. §8 and §9 show that it did not. The features stay in the
  model as designed, because dropping them now would be a choice made after seeing the test period. Milestone 5, with
  new weeks, will decide whether to keep them.
"""

T5["leak_read"] = r"""
**Reading the leakage check.** Shuffled stratified K-fold over rows reports within-fold AUCs of **0.830** for the
forest and **0.799** for gradient boosting, against 0.678 and 0.635 with our design. That is 0.15 to 0.16 too
optimistic, a larger inflation than for the Milestone 3 baselines (0.05 to 0.14), because flexible ensembles find the
sister quintile rows of the same week and copy their outcome. Keeping a week's rows together removes most of the gap
(0.693 and 0.651), and the rest comes from training on later years. The time-ordered folds are the only design here
without leakage.
"""

T5["thresholds_read"] = r"""
**Reading the threshold curves and costs**
* **Validation years (2021–24).** At the threshold of 0.14 the forest catches 72% of shock rows with a precision of
  0.28, and the cost of its errors is 0.65 of the cost of never alerting.
* **Why no threshold works in the test period.** With a missed shock costing five false alarms, an alarm pays off only
  if more than one alarm in six is right (precision above 1/6 = 0.167). In 2021–24, when 19.5% of rows were followed by a
  shock, the forest's alarms cleared that bar easily. In 2025–26 only 7.7% were, and the forest's precision never rose
  above 0.153 at any threshold that raised at least ten alarms. The best policy in the test period was therefore never
  to alert. Its most confident alarms were also wrong, since every test row with a probability of 0.26 or more was a calm
  week.
* **Cost ratios.** At 2 : 1 to 5 : 1 the forest beats the cheaper trivial policy in 2021–24 (0.79 to 0.93 of its cost)
  but not in the test period at any ratio (1.00 to 1.20), much like the Milestone 3 KNN. A threshold learned in a
  crisis regime still does not transfer to a calm one. Milestone 5 will re-choose the threshold on recent weeks.
"""

T5["calibration_read"] = r"""
**Reading the calibration**
* **Validation years.** The forest's mean prediction is 0.170 against an observed rate of 0.195, so it under-predicts
  slightly. Its Brier score (0.152) is a little better than always predicting the average rate (0.158).
* **Test period.** The mean prediction falls to 0.114, but the observed rate fell much further, to 0.077, so the forest
  over-predicts by about half. This is the threshold problem of §8 seen from the probabilities' side. The 26-week shock
  rate pulled the level down by a third while shocks fell by 60%.
* Logistic regression is not calibrated (mean prediction 0.50, Brier 0.247), because balanced class weights and heavy
  shrinkage keep its probabilities near 0.5. KNN, the tree and gradient boosting behave like the forest.
"""

T5["h4_read"] = r"""
**Decision on H4**
* **We fail to reject H0 at the 5% level.** The week-clustered Wald test gives χ²(6) = 11.8, p = 0.067, and the
  likelihood-ratio test χ²(6) = 5.7, p = 0.45. Here the clustered statistic is larger than the unclustered one. The Q1
  and Q5 rows of a week move together, so the difference between the two groups is estimated more precisely than
  independent rows would suggest.
* **One interaction stands out.** A fuel-price review next week raises Q5's shock odds more than Q1's (coefficient 0.90,
  p = 0.017). This fits H3 in Milestone 3, where motor fuel weighed more on richer households. The exploratory
  component interactions are not significant (χ²(3) = 3.2, p = 0.36).
* **Out of sample, pooling wins.** The forest trained on all five quintiles ranks each quintile's weeks better than a
  forest trained on that quintile alone, in the validation years for Q2 to Q5 and in the test period for all five. Five
  times more rows matter more than group-specific signals. Q1 is the only quintile whose own model does slightly better
  in the validation years (0.666 against 0.656), and it does worse in the test period (0.568 against 0.629).
* **But the pooled model does not serve the quintiles equally.** It ranks Q5's weeks best (within-year AUC 0.714) and
  Q1's worst (0.656). Notebook 06 follows this up as hypothesis H5.
"""

T5["importance_read"] = r"""
**Reading the drivers**
* **The forest relies on recent price momentum and the rupee.** Its leading features are the 4-week SPI change, the
  8-week rupee change, this week's SPI change, the shocks of the past four weeks and the momentum-item spikes. Gradient
  boosting leans most on the momentum spikes. These are the Milestone 3 drivers again.
* **Two features have negative importance.** Shuffling utility-tariff inflation or the 26-week shock rate slightly
  raises the forest's validation AUC, so in these years they added noise rather than signal (the ablation agrees).
* **Every leading signal matters more for Q5 than for Q1.** For the forest the 4-week SPI change is worth 0.041 of AUC on
  Q5 rows against 0.018 on Q1 rows, the rupee 0.027 against 0.011, motor-fuel inflation 0.013 against nothing, and
  perishables inflation 0.019 against 0.004. Only this week's SPI change and the fuel-review flag matter a little more
  for Q1. The signals in our data describe the shocks of the richest quintile better than those of the poorest, which
  is why the forest ranks Q1's weeks worse (§10).
"""

T5["summary"] = r"""
## 13. Summary of Milestone 4 modelling

**Findings**
1. **Two ensembles were built and tuned without leakage.** A random forest (128 settings) and gradient boosting
   (144 settings) were tuned by grid search on the same expanding-window folds as Milestone 3, together with the three
   re-tuned baselines. Selection used the within-year AUC.
2. **The learners are statistically tied.** Within-year AUCs run from 0.635 (gradient boosting) to 0.683 (KNN). The
   **random forest** (0.678) is the final model, because it is the best learner that can be retrained with the row
   weights the bias mitigations need.
3. **Ensembling did not beat the best baseline.** On the test period the forest's AUC (0.674) equals the Milestone 3
   KNN's (0.679) within noise. The limit is the weak signal, not the model's flexibility.
4. **Shuffled stratified K-fold would have reported an AUC of 0.83** for the forest, 0.15 more than the time-ordered design.
5. **The threshold problem remains.** In the calm test period no threshold beats never alerting, because the forest's
   alarms are right less than one time in six, and the probabilities over-predict by about half.
6. **The new features did not improve the ranking** in cross-validation.
7. **H4 is not supported** (p = 0.067). Only fuel reviews matter more for Q5. A pooled model beats quintile-own models.
8. **The pooled forest ranks Q5's weeks better than Q1's** (AUC 0.714 against 0.656), and its leading signals carry more
   information about Q5's shocks. This is the starting point of the fairness audit in notebook 06.

**What this means for the early-warning system.** A more flexible model does not find signal that is not in the data.
The useful gains are elsewhere: lead information on administered prices and perishable supplies, a threshold that
follows the regime (Milestone 5), and quintile-specific decisions (notebook 06).
"""

# ====================================================================== notebook 06
T6["attribute_read"] = r"""
**Reading the base rates.** Every quintile has almost the same shock rate. In the validation years each had between 38
and 44 shock rows out of 208 (18% to 21%), and in the test period between 6 and 9 out of 91. Most shocks hit several
quintiles in the same week, but not all. Of the 62 training weeks followed by a shock somewhere, 27 hit all five
quintiles, 17 hit Q1 but not Q5, and 14 hit Q5 but not Q1. Equal base rates matter for the audit in two ways.
* A model can only be calibrated within groups and have equal error rates at the same time when the groups' base rates
  are equal. Here they nearly are, so we can ask for all the criteria together.
* Demographic parity, which ignores whether a shock came, is a reasonable check here, because a fair model should warn
  groups with the same shock rate equally often.
"""

T6["audit_read"] = r"""
**Reading the audit**
* **Demographic parity holds for every learner.** In 2021–24 the disparate impact ratio lies between 0.96 and 1.05, well
  inside the 80% rule. For the forest it is 1.05 (95% interval 0.98 to 1.13), so Q1 is warned as often as Q5, or
  slightly more. The reason is built into the data, as most signals are week-level and the same for every quintile.
* **Equal opportunity leans against Q1 in every learner.** Q1's recall is below Q5's in all five learners in 2021–24,
  by 2.6 points for the forest and up to 13.2 points for logistic regression. For the forest the gap is small and its
  interval is wide (−0.18 to +0.12). The largest recall gap of the forest is between Q4 (0.64) and Q5 (0.76), not between
  Q1 and Q5.
* **Predictive equality nearly holds.** Q1's calm weeks are falsely alarmed slightly more often (FPR 0.46 against 0.42,
  interval −0.01 to +0.08).
* **The bigger difference is in ranking, not at the threshold.** Over the four validation years the forest's AUC within
  each group is 0.64 for Q1 and 0.72 for Q5, and its Brier loss is 0.148 against 0.136. The shared threshold hides this, because it happens to sit
  where the two groups' recalls are similar.
* **The test period cannot settle fairness.** With 6 to 9 shock rows per quintile, one shock moves a quintile's recall by
  11 to 17 points. The forest caught 4 of 7 Q1 shocks and 3 of 6 Q5 shocks, and the bootstrap interval of the
  equal-opportunity gap runs from −0.55 to +0.66.
"""

T6["h5_read"] = r"""
**Decision on H5.** The direction is as Milestone 2 expected. The forest's Brier loss is higher for Q1 than for Q5,
in the validation years (0.148 against 0.136) and in the test period (0.074 against 0.062). But the weekly
differences are noisy. The mean difference is 0.012 with a Newey–West standard error of 0.018 (t = 0.66, one-sided
p = 0.26) in 2021–24, and p = 0.33 in the test period. **We fail to reject H0.** The result does not depend on the
number of lags (1 to 13, p = 0.24 to 0.28). All five learners show the same direction. Only logistic regression's gap
is significant (p = 0.014), and it is tiny (0.002), because its probabilities sit near 0.5 for every row. The final
model is somewhat less accurate for the poorest quintile, but with four years of weekly data the gap cannot be told
apart from chance.
"""

T6["drivers_read"] = r"""
**Reading the sources**
* **Q1's shocks come from different places than Q5's.** In 2021–24, 42% of Q1's shock rows were driven by perishables
  (tomatoes, onions, chicken and similar), against 24% of Q5's. Motor fuel drove 29% of Q5's shocks but only 16% of
  Q1's. This is the rotating burden of Milestones 2 and 3, now seen from the shocks' side.
* **The forest catches fuel shocks best and perishable shocks worst.** Its recall is 0.88 for motor-fuel shocks and 0.89
  for staple-food shocks, but 0.69 for utility-tariff shocks and 0.62 for perishable shocks. In the test period the order
  is the same (perishables 0.46, utility tariffs 0.30).
* **This is the mechanism behind the gaps.** The poorest quintile is exposed most to exactly the shocks that have no
  lead signal in our data (supply shocks to perishables and administered tariff decisions). That explains why the forest
  ranks Q1's weeks worse (§3) and why its signals carry less information for Q1 (notebook 05, §11). A different
  threshold can rebalance who receives alarms, but it cannot create the missing signal. That needs new data, such as
  wholesale perishable prices or the tariff calendar (Milestone 5).
"""

T6["mitigation_read"] = r"""
**Reading the mitigation results**
* **Pre-processing (reweighing) changes almost nothing, and what it changes goes the wrong way.** Because the shock rate
  is nearly the same in every quintile, the weights are close to 1 (0.91 to 1.13). The retrained forest widened the Q1–Q5
  recall gap in 2021–24 (−0.08 against −0.03) and raised the cost of errors (0.663 against 0.651). Reweighing corrects
  unequal base rates, and our audit found none, so this is the expected result.
* **In-processing (Q1 shocks counted twice in training) evens out recall in 2021–24** (Q1 0.74, Q5 0.71) at a slightly
  higher cost (0.671). In the test period it had the lowest cost of any policy (1.07) but caught only 2 of Q5's 6
  shocks, so it moved the imbalance instead of removing it.
* **Post-processing works best in the validation years.** The equal-opportunity thresholds cut the largest recall gap
  between any two quintiles from 0.13 to 0.05 and lower the cost of errors (0.637 against 0.651). The shared threshold
  was neither the fairest nor the cheapest choice. The cost-based thresholds with a Q1 miss counted twice raise Q1's
  recall to 0.89 (Q5 0.87). They do it with many more false alarms for Q1 (FPR 0.71 against 0.51), so the disparate
  impact ratio rises to 1.29, deliberately in Q1's favour. The demographic-parity thresholds have the lowest cost
  (0.632) but let Q1's recall fall 13 points below Q5's. Meeting the 80% rule alone does not protect the poorest.
* **None of the gains carries over cleanly to the test period.** Every policy costs more than never alerting there
  (1.07 to 1.23), for the reason given in notebook 05 §8. With 6 to 9 shocks per quintile, test-period fairness gaps are
  too noisy to rank the policies.
"""

T6["pareto_read"] = r"""
**Reading the trade-off**
* **Fairness is cheap until it has to be perfect.** Allowing the five recalls to differ by up to 0.04 costs 0.643 of
  never alerting, which is cheaper than the shared threshold (0.651, recall gap 0.13). From a gap of 0.05 the frontier is
  flat at 0.632 to 0.637. Only exact equality is expensive. A gap of 0.02 costs 0.711, and a gap of zero is reachable
  only by alerting almost every week (0.819).
* **The shared threshold lies above the frontier.** Quintile thresholds exist that are both fairer and cheaper. This is
  the main practical result of the audit.
* **Demographic parity is almost free.** Its frontier is nearly flat. An alert-rate ratio of 0.95 costs 0.648 and the
  80% rule costs nothing extra (0.632), because the forest already warns all quintiles at similar rates. Only exact
  parity is expensive (0.825).
* **The frontier is drawn on the validation years.** On the test period the frontier thresholds for tolerances of 0.04
  and more cost 1.13 to 1.15 of never alerting, and their recall gaps scatter between 0.13 and 0.27, so the trade-off has to be re-estimated whenever the
  regime changes.
"""

T6["asym_read"] = r"""
**Reading the asymmetric thresholds**
* With equal miss costs for every quintile, the cost-optimal thresholds already differ (Q1 0.14, Q5 0.12). The best
  shared threshold is a compromise between them.
* Counting a missed Q1 shock 1.5 or 2 times as much lowers Q1's threshold to 0.09. Q1's recall rises from 0.74 to 0.89,
  at the price of a false-positive rate of 0.71 for Q1, and the total cost at the uniform 5 : 1 rate rises only from
  0.632 to 0.643.
* At 3 times, Q1's best threshold drops to 0.01, which means alerting for Q1 every week. A weight that high turns the
  early warning into a standing top-up for the poorest quintile.
* Figure F3 shows why the thresholds differ. Each quintile's cost curve has its minimum in a different place, and Q1's
  curve becomes flat and low at small thresholds once its misses count twice.
"""

T6["recommendation"] = r"""
## 9. Recommended operating policy

1. **Model:** the random forest of notebook 05, retrained on all available weeks.
2. **Thresholds:** one per quintile, set as the cheapest thresholds whose recalls differ by at most 0.05 (equal
   opportunity). In the validation years this was fairer than one shared threshold (recall gap 0.05 against 0.13) and
   cheaper (0.637 against 0.651 of the cost of never alerting).
3. **If the agency decides to give the poorest priority,** the cost-based thresholds with a missed Q1 shock counted twice
   are the equity option. They raise Q1's recall to about 0.89 at the price of more Q1 false alarms. This is a policy
   choice for the agency and the people affected, not a modelling result.
4. **Re-choose the thresholds on recent weeks** whenever the alert rate and the realised shock rate drift apart. In
   2025–26 no fixed threshold beat silence, so this step matters more than the choice between the policies above.
   Milestone 5 will test how quickly re-chosen thresholds recover.
5. **Monitor recall, false-positive rate and alert rate by quintile every month**, with the definitions of §2.
"""

T6["faten"] = r"""
## 10. FATEN principles: how does the final system measure up?

| Principle | What it asks here | Evidence from this audit | Remaining risk | Safeguard |
|---|---|---|---|---|
| **Fairness** | errors shared equally across quintiles | demographic parity holds (ratio 1.05), Q1's recall is 2.6 points below Q5's, and quintile thresholds cut the largest recall gap to 0.05 | the forest ranks Q1's weeks worse (AUC 0.64 against 0.72), and gaps cannot be measured in a calm year | quintile thresholds, monthly fairness dashboard |
| **Autonomy** | people and officials keep control over decisions | the model informs a decision by staff and never sets anyone's eligibility. It uses no personal data | staff may defer to the model (automation bias) | show the probability and its reasons, keep the decision and any override with staff |
| **Trust** | the system is transparent and reliable | open features, thresholds and error analysis. Calibrated in the validation years (Brier 0.152 against 0.158) | in 2025–26 alarms were right less than one time in six, and repeated false alarms erode trust | publish the alarm record, re-choose thresholds by regime (Milestone 5) |
| **Equity** | support follows need, not only equal numbers | a Q1 miss can be weighted twice, which raises Q1's recall to 0.89 | the households in greatest need (rural, outside the 2015-16 weights) are not in the data | the weight is set by the agency with those affected, and rural price data are added |
| **Non-maleficence** | the system does no harm | false alarms are transfers, not losses, and misses are the costly error | a public warning could feed hoarding, and "no alarm" could be misread as "no need" | alarms stay internal, and the alarm adds to targeting, never replaces it |
"""

T6["summary"] = r"""
## 12. Summary of the fairness audit

1. **Sensitive attribute:** consumption quintile (Q1 unprivileged, Q5 privileged). The favourable outcome is an alarm.
2. **Demographic parity holds** for every learner (disparate impact 0.96 to 1.05, 80% rule met), because most signals are
   shared by all quintiles.
3. **Equal opportunity leans slightly against Q1** in every learner (forest: −2.6 points, not significant). The larger
   difference is in ranking: the forest's AUC is 0.64 for Q1 and 0.72 for Q5.
4. **H5 is not supported at the 5% level** (Brier 0.148 against 0.136, p = 0.26), although the direction is as expected.
5. **Mechanism:** Q1's shocks are more often perishable-driven (42% against 24% for Q5), and perishable and tariff shocks
   are the ones the model catches least (recall 0.62 and 0.69, against 0.88 for fuel).
6. **Mitigation:** reweighing does nothing useful here, because base rates are already equal. Group-weighted training moves
   the imbalance. **Quintile thresholds** are fairer and cheaper than one shared threshold in the validation years.
7. **Trade-off:** fairness is cheap until it must be exact. The shared threshold lies above the Pareto frontier.
8. **Test period:** with 6 to 9 shocks per quintile, fairness cannot be measured precisely, and no policy beats never
   alerting at 5 : 1. Re-choosing the thresholds by regime is the next step (Milestone 5).
"""
