"""Text for the model, threshold and fairness sections of notebook.ipynb, filled from numbers.json
(collect_numbers.py reads the executed notebook's tables and printed lines)."""


def model_text(D):
    f3 = lambda x: f"{x:.3f}"
    f2 = lambda x: f"{x:.2f}"
    f1 = lambda x: f"{x:.1f}"
    pc = lambda x: f"{100 * x:.0f}%"
    cmp = {r["Model (grouped 5-fold CV on training patients)"]: r for r in D["t06_model_comparison"]}
    hold = {r["Model (holdout test patients)"]: r for r in D["t13_holdout"]}
    fin = {r["Unnamed: 0"]: r["Holdout value"] for r in D["t14_final_holdout_metrics"]}
    cm = D["t15_confusion_matrix"]
    TP, FN, FP, TN = cm[0]["Flagged"], cm[0]["Not flagged"], cm[1]["Flagged"], cm[1]["Not flagged"]
    thr = D["threshold"]
    rows = D["t12_thresholds"]
    at = lambda t: next(r for r in rows if abs(r["Threshold"] - t) < 1e-9)
    ch = {r["Unnamed: 0"]: r for r in D["t08_cleaning_choices"]}
    base = ch["Our cleaned features"]["CV AP"]
    leak = D["t07_leakage_check"]
    gaps = [abs(r["AP | Random rows (leaky)"] - r["AP | Grouped by patient"]) for r in leak]
    imp = D["t10_permutation_importance"]
    odds = {r["Unnamed: 0"]: r["Odds ratio"] for r in D["t09_lr_odds_ratios"]}
    cal = D["t11_calibration"]
    cal_gap = max(abs(r["Mean predicted (%)"] - r["Observed rate (%)"]) for r in cal)
    sub = D["t16_subgroups"]
    S = lambda v, g: next(r for r in sub if r["Variable"] == v and r["Group"] == g)
    rc = D["t17_race_input_check"]
    RC = lambda g, m: next(r for r in rc if r["Group"] == g and r["Model"].startswith(m))
    pr = D["printed"]
    GB, LR, RF, KNN, TREE = (cmp[m] for m in ["Gradient boosting", "Logistic regression", "Random forest",
                                               "K-nearest neighbours", "Decision tree"])
    a80, a60, a40, a0 = S("Age", "80 and over"), S("Age", "60-79"), S("Age", "40-59"), S("Age", "Under 40")
    fem, mal = S("Gender", "Female"), S("Gender", "Male")
    cau, afr, his, asi = S("Race", "Caucasian"), S("Race", "AfricanAmerican"), S("Race", "Hispanic"), S("Race", "Asian")
    unk = S("Race", "Unknown")
    od = lambda k: odds.get(k, float("nan"))
    import ast
    gbs = ast.literal_eval(GB["Best setting"])
    T = {}

    T["COMPARISON_MD"] = f"""
**Results.**
- Every model beats both baselines. The **one-feature rule** (prior inpatient stays) already lifts AP from
  {f3(cmp['No-skill baseline']['AP'])} to **{f3(cmp['Prior-inpatient-visits rule']['AP'])}**, which shows how much of the
  signal sits in that single variable.
- **Logistic regression ({f3(LR['AP'])})**, the **decision tree ({f3(TREE['AP'])})** and **KNN ({f3(KNN['AP'])})** are close to
  each other. KNN is the weakest. Its best k was 400, the largest we tried, so it works best when it averages over a big
  neighbourhood, close to a smoothed average rate. With {pr['onehot_columns']} columns, most of them 0/1 and all weighted
  equally, the distance between two stays is not very informative (Unit 11 notes that KNN treats every feature as equally
  important unless we weight them).
- For the **decision tree**, Gini and entropy give almost the same result at depth 8, and depth 8 beat both shallower
  trees (under-fitting) and deeper trees (over-fitting).
- The two **ensembles** are best. **Gradient boosting ({f3(GB['AP'])}, AUC {f3(GB['AUC'])})** is ahead of the random forest
  ({f3(RF['AP'])}) and has a small spread across folds (±{f3(GB['AP sd'])}). Many boosting settings score within 0.003 of each
  other, so the exact setting matters little.
- All AUCs are between 0.64 and 0.68. This is modest but typical for readmission prediction from administrative records,
  because much of what causes a return (support at home, whether medicines are taken) is not in the data.
"""

    T["LEAK_MD"] = f"""
**What we expected.** The random-row split should look better, because a model could partly recognise returning patients.

**What we found.** The difference is tiny, at most {max(gaps):.3f} in AP, which is smaller than the spread between folds.
This holds even for the 1-nearest-neighbour model, which simply copies the label of the most similar training stay. A
patient's stays look quite different from each other (different diagnoses, lengths of stay, lab counts), and we use no
patient-level feature, so nothing in the inputs reliably identifies a person.

So with our features, grouping by patient matters less than we expected. We still use it because it is the only design
that matches how the model will be used (on new patients) and how it is evaluated (on a patient-disjoint held-out set).
The real leakage danger was the patient-level feature from Section 1.2, which we did not build.
"""

    T["CHOICES_MD"] = f"""
- **Race as an input** changes AP by only {ch['Race added as an input']['AP change']:+.4f}, less than the spread between folds,
  so leaving it out costs nothing measurable (see also Section 9).
- **All 26 raw discharge codes** score {f3(ch['Raw 26 discharge codes instead of 12 groups']['CV AP'])} against {f3(base)} for our
  12 groups, so grouping by meaning loses almost nothing and avoids codes with only a handful of stays.
- **3-digit diagnosis codes** ({f3(ch['3-digit diagnosis codes instead of 9 groups']['CV AP'])}) do slightly worse than the 9
  disease groups. More detail adds rare levels faster than it adds information.
- **Leaving out payer_code** lowers AP to {f3(ch['payer_code left out']['CV AP'])}, so the payer (including "Unknown") carries a
  little information and we keep it.

An earlier version of our grouping put rehab facilities (code 22, 28% readmitted) together with long-term care hospitals
(code 23, 7%). This check showed the raw codes doing better, which led us to separate the two destinations.
"""

    T["IMPORTANCE_MD"] = f"""
Both models point to the same drivers.
- For **gradient boosting**, the **discharge destination** and the number of **prior inpatient stays** are by far the most
  important features. Shuffling either one lowers holdout AP by about {f2(imp[0]['Drop in AP (mean)'])}, about a quarter of
  the model's AP. Next come the total number of prior visits, the primary diagnosis group and the payer code, each with
  an effect about six times smaller.
- In **logistic regression**, discharge to a **psychiatric hospital** (odds ratio {od('discharge_group_Psychiatric hospital'):.1f}),
  a **rehab facility** ({od('discharge_group_Rehab facility'):.1f}) or **another hospital**
  ({od('discharge_group_Hospital transfer'):.1f}) raises the odds of early readmission, and so does each extra standard
  deviation of (log) prior inpatient stays ({od('log_number_inpatient'):.2f}). Stays that ended in **death**
  ({od('discharge_group_Expired'):.2f}) or **hospice** ({od('discharge_group_Hospice'):.2f}) have much lower odds, as expected.

Medication and lab-test features add little once these are known.
"""

    T["CHOICE_MD"] = f"""
We choose **gradient boosting**.
- It has the best average precision, the primary held-out metric ({f3(GB['AP'])} in cross-validation), together with the
  best AUC and Brier score, and a small spread across folds.
- It finds interactions on its own (for example, prior visits may matter more for some discharge destinations), which a
  linear model can only do with hand-made terms.
- **What we give up** is a readable formula. Logistic regression is {f3(GB['AP'] - LR['AP'])} lower in AP (about
  {100 * (GB['AP'] - LR['AP']) / GB['AP']:.0f}% worse), but each coefficient is an odds ratio. We keep it as our
  **interpretable reference**, and we explain the boosting model with permutation importance (Section 4.3) and the
  subgroup checks (Section 9).
- The random forest is close ({f3(RF['AP'])}) but slightly worse on every measure, and its saved file would be much larger.

The chosen setting is a learning rate of {gbs['learning_rate']}, {gbs['max_iter']} trees, at most {gbs['max_leaf_nodes']}
leaves per tree and at least {gbs['min_samples_leaf']} stays per leaf. scikit-learn switches on early stopping by default for data
this size, which holds out a random 10% of rows that is **not** grouped by patient. We turned it off and tuned the number
of trees on our own grouped folds instead, which also makes the model fully repeatable.
"""

    T["CALIB_MD"] = f"""
**Calibration.** For gradient boosting, the average predicted probability in each of the 10 groups is within
{cal_gap:.1f} percentage points of the share that was really readmitted (for example {f1(cal[-1]['Mean predicted (%)'])}%
predicted vs {f1(cal[-1]['Observed rate (%)'])}% observed in the highest-risk group). The probabilities can therefore be read
as real risks. This matters because the held-out evaluation includes the Brier score, and because the threshold of
{thr} then really means "about a {100 * thr:.0f}% chance".

**Why we did not use class weights.** Re-weighting the rare class is a common fix for imbalance. It barely changes the
ranking (AP {f3(pr['bal_ap'])} vs {f3(pr['lr_oof_ap'])}, AUC {f3(pr['bal_auc'])} vs {f3(pr['lr_oof_auc'])}), but it pushes every
probability up. The average prediction becomes {pc(pr['bal_mean'])} when the real rate is {pc(pr['real_rate'])}, and the Brier
score more than doubles ({f3(pr['bal_brier'])} vs {f3(pr['lr_oof_brier'])}). We handle the imbalance with the **threshold**
(Section 7) instead and keep honest probabilities.
"""

    T["THRESHOLD_INTRO_MD"] = """
A threshold turns a probability into a yes/no decision. Stays with a probability at or above the threshold are
flagged for extra follow-up. The two kinds of error do not cost the same.
- **Missing a patient who comes back (false negative).** The patient has another hospital stay, with the health risk
  and cost of a new admission.
- **An unneeded follow-up (false positive).** A nurse's phone call, a medication check or an earlier clinic appointment
  for someone who would have been fine. This uses staff time but does little harm.

We use the cost-sensitive view of errors from Unit 10. Each error gets a cost, and we pick the threshold with the
**lowest total cost** on the **out-of-fold predictions of the training patients** (the holdout patients are not used).
As a team we judged that **missing a readmission is about 7 times as costly as an unneeded follow-up**. A follow-up is
cheap, but it does not prevent every readmission, so the ratio should not be extreme. Because the ratio is a
judgement, we also show 3, 5 and 10.
"""

    a = at(thr)
    same_f1 = abs(pr["f1_best_threshold"] - thr) < 1e-9
    T["THRESHOLD_MD"] = f"""
**Result.** With a cost ratio of 7, the lowest total cost is at a threshold of **{thr}**. At this point the model flags
**{f1(a['Flagged (%)'])}%** of stays and catches **{pc(a['Recall'])}** of early readmissions, and about **1 in
{1 / a['Precision']:.0f}** flagged stays is a true early readmission (precision {f3(a['Precision'])}, against 0.11 if we picked
patients at random).
- The default 0.5 would flag almost nobody ({f1(at(0.5)['Flagged (%)'])}% of stays) and catch under 1% of readmissions.
  With 11% positives, a risk above 50% is rare.
- The highest F1 is at {pr['f1_best_threshold']}, so the cost-based choice {'is also the F1-best point' if same_f1 else 'sits on the flat top of the F1 curve'}
  (F1 {f3(a['F1'])}).
- If a miss counted only 5 times an alarm, the best threshold would be {pr['cost5_threshold']} and only about a third of the
  early readmissions would be caught. At 10 times it would be {pr['cost10_threshold']}, with about half of all stays
  flagged. We chose the middle option because flagging about a third of patients is a workload a discharge team can
  realistically follow up, while still catching more than half of the early returns.
"""

    T["HOLDOUT_MD"] = f"""
**Holdout results (20% of patients, never used before).**
- Gradient boosting reaches **AP {f3(fin['Average precision'])}, AUC {f3(fin['ROC-AUC'])} and Brier {f3(fin['Brier score'])}**.
  At the threshold of {thr} it flags {f1(fin['Flagged (%)'])}% of stays, with **precision {f3(fin['Precision'])}, recall
  {f3(fin['Recall'])} and F1 {f3(fin['F1'])}**. Of the {TP + FN:,} early readmissions it catches {TP:,} and misses {FN:,}, and it
  flags {FP:,} stays that were not readmitted early.
- These numbers are **very close to the cross-validation numbers** (CV AP {f3(GB['AP'])}, and out-of-fold recall
  {f3(a['Recall'])} and precision {f3(a['Precision'])} at the same threshold). A large drop would have warned us of over-fitting
  or leakage, and there is none. The small gain comes from fitting on all training patients (each CV model saw only 80%
  of them) and from chance in which patients ended up in the holdout.
- The two ensembles stay on top, and gradient boosting stays first. Logistic regression and the decision tree swap places
  ({f3(hold['Logistic regression']['AP'])} and {f3(hold['Decision tree']['AP'])}), a difference within the noise. KNN gains the
  most ({f3(KNN['AP'])} → {f3(hold['K-nearest neighbours']['AP'])}), because its predictions depend directly on how many stored
  training stays it can compare with.

We expect the hidden held-out result to be in the same range, since our holdout imitates it.
"""

    T["FAIRNESS_MD"] = f"""
**Findings (holdout patients).**
- **Gender.** The model works about equally well for women and men (AUC {f3(fem['AUC'])} and {f3(mal['AUC'])}, AP
  {f3(fem['AP'])} and {f3(mal['AP'])}). Women's early readmissions are caught a little more often (recall {f2(fem['Recall'])} vs
  {f2(mal['Recall'])}), with slightly more false alarms ({f2(fem['False alarm rate'])} vs {f2(mal['False alarm rate'])}).
- **Age** shows the clearest difference. The model ranks patients best aged 40 to 59 (AUC {f3(a40['AUC'])}) and under 40
  ({f3(a0['AUC'])}) and worst at 80 and over ({f3(a80['AUC'])}) and 60 to 79 ({f3(a60['AUC'])}). Patients aged 80 and over get
  the **most false alarms** ({pc(a80['False alarm rate'])} of their other stays are flagged, against {pc(a0['False alarm rate'])}
  under 40), because almost everyone that age has a raised predicted risk, and patients aged 60 to 79 have the **lowest
  recall** ({f2(a60['Recall'])}). For older patients, risk seems to depend more on things the data do not record, such as
  frailty or support at home.
- **Race.** Caucasian and African American patients, the two large groups, have similar AUC ({f3(cau['AUC'])} and
  {f3(afr['AUC'])}) and recall ({f2(cau['Recall'])} and {f2(afr['Recall'])}). But the model **under-estimates risk for African
  American patients** (mean prediction {f1(afr['Mean predicted (%)'])}% against {f1(afr['Rate (%)'])}% observed) and for
  **Hispanic patients** ({f1(his['Mean predicted (%)'])}% against {f1(his['Rate (%)'])}%, though from only
  {his['Readmitted <30']} readmissions). The Asian ({asi['Stays']} stays, {asi['Readmitted <30']} readmissions), Other and
  Unknown groups are too small to judge. For the Asian group, one patient more or less changes recall by
  {100 / asi['Readmitted <30']:.0f} points. The Unknown-race group has a low recall ({f2(unk['Recall'])}), but it rests on only
  {unk['Readmitted <30']} readmissions.

**Which groups have higher error rates?** Older patients (weaker ranking, many false alarms for those 80 and over, the
lowest recall for those 60 to 79) and African American and Hispanic patients, whose risk is under-estimated. The gaps
are modest next to the overall limits of the model (AUC {f3(fin['ROC-AUC'])} for everyone), but they mean one threshold
does not serve every group equally. We did not set separate thresholds per group, since race-based rules raise their own
fairness problems and several groups are too small to tune on. A hospital using the model should keep checking recall by
group.
"""

    aw, ar = RC("AfricanAmerican", "Without"), RC("AfricanAmerican", "With race")
    hw, hr = RC("Hispanic", "Without"), RC("Hispanic", "With race")
    T["RACE_MD"] = f"""
**Did leaving race out help or hurt?** It makes almost no difference either way. Overall holdout AP is
{f3(pr['hold_ap_norace'])} without race and {f3(pr['hold_ap_race'])} with it. For African American patients recall is
{f3(aw['Recall'])} without race and {f3(ar['Recall'])} with it (a difference of about
{abs(ar['Recall'] - aw['Recall']) * afr['Readmitted <30']:.0f} patients), and the mean prediction stays below the observed
rate either way ({f1(aw['Mean predicted (%)'])}% and {f1(ar['Mean predicted (%)'])}% against {f1(aw['Observed rate (%)'])}%). For
Hispanic patients recall is {f3(hw['Recall'])} without and {f3(hr['Recall'])} with race. Adding race would therefore not fix
the under-estimation and would not make the model clearly more accurate, so leaving it out costs nothing measurable,
and the decision about who gets follow-up does not depend on a social category. Leaving race out does not guarantee
fairness either, because other inputs (payer code, for example) can partly stand in for it, which is why we check the
results by group.
"""

    T["CLOSING_MD"] = f"""
## Summary
- **Target.** Readmission within 30 days, 11.1% of stays, judged by average precision, ROC-AUC and the Brier score.
- **Cleaning.** One function, `clean()` in `predict.py`, shared by the notebook and the prediction script. Missing values
  become "Unknown" or "Not tested", codes are grouped by meaning (ICD-9 chapters, IDS_mapping.csv), skewed counts are
  logged, and race is not an input.
- **Validation.** Split by patient, a 20% holdout plus grouped 5-fold cross-validation on the rest.
- **Model.** Gradient boosting, CV AP {f3(GB['AP'])}, holdout AP {f3(fin['Average precision'])}, AUC {f3(fin['ROC-AUC'])},
  Brier {f3(fin['Brier score'])}.
- **Threshold.** {thr} (miss = 7 × unneeded follow-up). On the holdout it gives precision {f3(fin['Precision'])}, recall
  {f3(fin['Recall'])} and F1 {f3(fin['F1'])}.
- **Fairness.** Similar for women and men, weaker for older patients, and risk is under-estimated for African American
  and Hispanic patients.
"""
    return T
