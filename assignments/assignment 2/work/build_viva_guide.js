// Builds the Assignment 2 viva guide (team use only, not submitted):
//   node build_viva_guide.js "../A2_Viva_Guide.docx"
// Numbers come from numbers.json (collect_numbers.py, from the notebook's exported tables)
// plus a few development checks typed in DEV below.
const fs = require("fs");
const path = require("path");
const { makeHelpers } = require("./docx_helpers");
const H = makeHelpers({ body: 21, small: 17, cap: 18, line: 252, h1: 28, h2: 23, h3: 21 });
const { P, H1, H2, H3, BUL, table, build, AlignmentType, Paragraph } = H;

const OUT = process.argv[2] || "../A2_Viva_Guide.docx";
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "numbers.json"), "utf8"));
const f3 = (x) => Number(x).toFixed(3), f2 = (x) => Number(x).toFixed(2), f1 = (x) => Number(x).toFixed(1);
const pct = (x) => `${(100 * x).toFixed(0)}%`;
const comma = (x) => Number(x).toLocaleString("en-US");

// ---------------------------------------------------------------- numbers
const cmp = Object.fromEntries(D.t06_model_comparison.map((r) => [r["Model (grouped 5-fold CV on training patients)"], r]));
const hold = Object.fromEntries(D.t13_holdout.map((r) => [r["Model (holdout test patients)"], r]));
const fin = Object.fromEntries(D.t14_final_holdout_metrics.map((r) => [r["Unnamed: 0"], r["Holdout value"]]));
const cm = D.t15_confusion_matrix;      // rows: Actually readmitted <30, Not readmitted <30
const TP = cm[0]["Flagged"], FN = cm[0]["Not flagged"], FP = cm[1]["Flagged"], TN = cm[1]["Not flagged"];
const thr = D.threshold;
const thrRows = D.t12_thresholds;
const thrAt = (t) => thrRows.find((r) => Math.abs(r.Threshold - t) < 1e-9);
const leak = D.t07_leakage_check;
const choices = Object.fromEntries(D.t08_cleaning_choices.map((r) => [r["Unnamed: 0"], r]));
const sub = D.t16_subgroups;
const subRow = (v, g) => sub.find((r) => r.Variable === v && r.Group === g);
const race = D.t17_race_input_check;
const odds = D.t09_lr_odds_ratios;
const imp = D.t10_permutation_importance;
const GB = cmp["Gradient boosting"], LR = cmp["Logistic regression"];
const DEV = D.dev || {};

// ---------------------------------------------------------------- document
const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));
const card = (title, o) => {
  add(H3(title));
  add(P(`**Say this first.** ${o.say}`));
  if (o.detail) add(P(`**Detail.** ${o.detail}`));
  if (o.alts) { add(P("**Other options and what happened.**", { after: 20 })); o.alts.forEach((a) => add(BUL(a))); }
  if (o.why) add(P(`**Why not the others.** ${o.why}`));
  if (o.show) add(P(`**Show it.** ${o.show}`, { after: 140 }));
};

add(
  new Paragraph({ children: H.runs("Assignment 2 Viva Guide", { size: 34, bold: true }), alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: H.runs("Predicting Early Hospital Readmission (Diabetes Dataset)", { size: 24, italics: true }), alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
  new Paragraph({ children: H.runs("Syeda Hoorain Imran (08704)  ·  Munib Sattar (09239)  ·  team use only, not part of the submission", { size: 20 }), alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
);

// ================================================================ 1
add(H1("1. How to use this guide"));
add(P("The grade is the report grade multiplied by the viva factor V. V = 1 needs **full code ownership**, meaning both of us can explain the code, how we split the data, how we cleaned the features and why the models performed as they did. Every decision below is written as a card that you can answer from."));
add(P("**Answer in four steps.**", { after: 20 }));
add(H.NUM("**Short answer.** One sentence, the decision itself."));
add(H.NUM("**Reason.** Why, in plain words."));
add(H.NUM("**Evidence.** The number, and where it is in the notebook (section number)."));
add(H.NUM("**Limitation.** What could still be wrong. Examiners like hearing that we know the limits."));
add(P("**Tags for the alternatives.** *[notebook]* means the check is in the submitted notebook and can be shown. *[development]* means we tried it while building the model but it is not in the notebook (say so honestly, these runs still had race as an input). *[not tried]* means we did not test it.", { before: 60 }));

// ================================================================ 2
add(H1("2. The package at a glance"));
add(table("Files in group_XX.zip.", ["File", "What it is", "Who runs it"], [
  ["`notebook.ipynb`", "Exploration, cleaning, grouped validation, 5 models + 2 baselines, threshold, subgroup checks, saves the final model", "Us (the instructor may re-run it, about 20 to 30 minutes)"],
  ["`report.pdf`", "4–5 page executive summary", "Read by the instructor"],
  ["`predict.py`", "`clean()` (all cleaning), `predict_proba(df)` and the command line `--input/--output`", "Instructor, on the hidden patients"],
  ["`model/pipeline.joblib`", "Fitted scikit-learn Pipeline (imputer, scaler, one-hot encoder, gradient boosting)", "Loaded by `predict.py`"],
  ["`threshold.json`", `{"threshold": ${thr}}`, "Instructor applies it to our probabilities"],
  ["`requirements.txt`", "Pinned versions (Python 3.13.3, numpy 2.2.6, pandas 2.3.3, scikit-learn 1.7.2, joblib 1.5.2)", "Instructor installs them"],
  ["`README.md`", "Language, how to run, team members", "Instructor"],
], [2000, 5200, 2600], "lll"));
add(P("**What happens to one raw row in predict.py.**", { after: 20 }));
[
  "`pd.read_csv` reads the hidden file. Blank glucose and A1c cells become NaN, `?` stays as the text `?`.",
  "`clean()` builds the " + D.printed.n_features + " model inputs. It replaces `?`, blanks and `None` by one label, groups the ID codes, diagnoses and specialties, turns age into years, takes log(1 + x) of the visit counts and counts the diabetes drugs. Missing columns are added as empty, unseen codes become \"Unknown\" or \"Other\".",
  "The saved pipeline fills any numeric gap with the training median, z-scores the numbers, one-hot encodes the categories (a level never seen in training goes to the \"infrequent\" column) and runs the gradient-boosting model.",
  "`predict_proba` returns the probability of class 1, clipped to [0, 1], with no NaN, one per row in the same order.",
  `The instructor compares it with ${thr}. At or above means "flag for extra follow-up".`,
].forEach((t) => add(H.NUM(t, "numbers2")));

// ================================================================ 3
add(H1("3. Decision cards"));
add(H2("3.1 The target and its framing"));
card("Why early (30-day) readmission?", {
  say: "It is a problem staff can act on before the patient leaves, and 30 days is the usual window hospitals are measured on. Most avoidable returns (medicine problems, no follow-up visit) happen soon after discharge.",
  detail: `${comma(9053)} of ${comma(81281)} stays (11.1%) are early readmissions. ">30" stays count as 0 even though those patients also came back. The assignment fixes this, and later returns are less likely to be caused by the discharge itself.`,
  alts: ["Any readmission (<30 or >30) as the target, optional extension *[not tried]*.", "Three classes *[not tried]*."],
  why: "The submitted model is graded only on the binary 30-day task, so we spent the time on validation and fairness instead.",
  show: "Notebook Section 0 (target table). Report Section 1.",
});
card("What should a positive prediction trigger?", {
  say: "Only cheap, supportive actions, such as a nurse's phone call within a week, a medication check before discharge or an earlier clinic appointment. Never less care, a longer forced stay or any insurance decision.",
  detail: "This is why we accept many false alarms. An unneeded phone call costs little, while a missed patient means another hospital stay.",
  show: "Report Sections 1 and 5.",
});
card("Class imbalance", {
  say: "Only 11% are positive, so accuracy is useless (a model saying \"no\" to everyone is 89% accurate). We use average precision, ROC-AUC and the Brier score, and we handle the imbalance with the threshold, not with re-weighting.",
  detail: `No-skill AP equals the positive rate (0.111). Balanced class weights for logistic regression barely changed the ranking but pushed the mean prediction to ${pct(D.printed.bal_mean)} (real rate 11%) and the Brier score from ${f3(D.printed.lr_oof_brier)} to ${f3(D.printed.bal_brier)} *[notebook, Section 6]*.`,
  alts: ["Class weights \"balanced\" *[notebook]*: same AP, terrible Brier.", "Over- or under-sampling *[not tried]*, same problem as weights (it changes the base rate the model learns)."],
  show: "Notebook Sections 0 and 6.",
});

add(H2("3.2 Cleaning and grouping"));
card("Missing values recorded as \"?\" and blanks", {
  say: "weight (97% missing) is dropped. payer_code, medical_specialty and race get an \"Unknown\" category. A blank glucose or A1c result means \"Not tested\", which is its own category.",
  detail: "Missingness is informative here. Unknown payer or specialty stays are readmitted slightly more often (11.5% vs 10.9% and 10.8%), and stays with no A1c test more often than tested ones (11.4% vs 9.9%). Filling with the most common value would invent data for up to half the patients. Listwise deletion would remove 97% of rows because of weight alone.",
  alts: ["Mode imputation *[not tried]*, invents a specialty for 49% of stays.", "A \"weight recorded\" flag *[development]*, no gain.", "Dropping payer_code *[notebook, Section 4.2]*, AP slightly lower."],
  show: "Notebook Section 1.1, cleaning table in Section 2.",
});
card("Diagnosis codes: about 700 codes → 9 ICD-9 groups", {
  say: "Each diagnosis column has about 700 codes, 406 of the primary ones appear fewer than 20 times, and the hidden patients will bring new codes. We group them into the standard ICD-9 chapters (circulatory, respiratory, digestive, diabetes, injury, musculoskeletal, genitourinary, neoplasms, other), as in Strack et al. (2014), the paper that published this dataset.",
  detail: "250.xx is diabetes. V and E codes (visit reasons and external causes) go to Other, \"?\" to Missing. Any new numeric code still falls in a range, so nothing crashes.",
  alts: [`3-digit codes (about 700 levels, rare ones pooled) *[notebook, Section 4.2]*, CV AP ${choices["3-digit diagnosis codes instead of 9 groups"] ? f3(choices["3-digit diagnosis codes instead of 9 groups"]["CV AP"]) : "?"} vs ${f3(choices["Our cleaned features"]["CV AP"])}.`],
  why: "More detail did not help, and the groups are easier to explain and safer for unseen codes.",
  show: "Notebook Section 1.4 and 4.2. Function `icd9_group` in `predict.py`.",
});
card("ID columns (admission type, discharge disposition, admission source)", {
  say: "They are numbers but really categories (code 6 is not \"more\" than code 3), so we one-hot encode them after grouping the codes by meaning using IDS_mapping.csv. Discharge 26 codes → 12 groups, admission type 8 → 5, admission source 17 → 5.",
  detail: "Groups for discharge are Home, Home with care, Care facility, Rehab facility, Long-term care hospital, Hospital transfer, Psychiatric hospital, Left against advice, Outpatient referral, Hospice, Expired and Unknown. Rehab (28%) and psychiatric hospital (36%) were too different from the others to merge. A code not in our dictionary becomes \"Unknown\". **Honest story if asked.** Our first version merged rehab (code 22, 28%) with long-term care hospitals (code 23, 7%). The check in Section 4.2 showed the raw codes doing about 0.004 AP better, we looked at the rates, saw the bad merge and split them, which recovered the whole gain *[development]*.",
  alts: [`All 26 raw discharge codes *[notebook, Section 4.2]*, CV AP ${choices["Raw 26 discharge codes instead of 12 groups"] ? f3(choices["Raw 26 discharge codes instead of 12 groups"]["CV AP"]) : "?"} vs ${f3(choices["Our cleaned features"]["CV AP"])}.`, "Using the codes as plain numbers *[not tried]*, wrong because the order means nothing."],
  show: "Notebook Section 1.3 (discharge table with our group in the last column).",
});
card("Expired and hospice stays are kept", {
  say: "1,311 stays ended in death and none were readmitted. We keep them because the hidden set will have such stays too, and the model learns to give them almost zero probability (logistic-regression odds ratio for Expired about 0.03).",
  alts: ["Dropping them from training (the instructor's template mentions it) *[not tried]*. The model would then never see them and could give a dead patient a high risk on the hidden set."],
  show: "Notebook Section 1.3. Odds ratios in Section 4.3.",
});
card("Medical specialty: 70 → 17 groups", {
  say: "The 8 specialties with about 500 or more stays keep their name, the others are joined by field (all \"Surgery-…\" are Surgery, all \"Pediatrics-…\" are Pediatrics, oncology and hematology together, and so on), rare leftovers are Other and \"?\" is Unknown.",
  show: "`specialty_group` in `predict.py`.",
});
card("Age as a number, visit counts on a log scale", {
  say: "Age bands are ordered, so \"[70-80)\" becomes 75 (Unit 11 maps ordinal values to numbers). Outpatient, emergency and inpatient counts are mostly 0 with a few up to 76, so we use log(1 + x), the same transform as in Assignment 1, plus the log of their total.",
  detail: "log(1 + x) keeps 0 at 0 (log of 0 is undefined) and pulls in the long right tail, which helps logistic regression and KNN. Tree models do not care, since a log keeps the order.",
});
card("Diabetes drugs", {
  say: "Of 23 drug columns, 21 are used in under 13% of stays (two are never used). We keep insulin and metformin as categories (No, Steady, Up, Down) and add two counts, the number of diabetes drugs and the number of dose changes.",
  alts: ["Adding the 5 next most common drugs *[development]*, no gain."],
});
card("Race is not a model input", {
  say: "Race added almost nothing to accuracy, and we did not want the decision about who gets follow-up to depend on a social category. We still use race to check fairness.",
  detail: (() => {
    const aw = race.find((r) => r.Group === "AfricanAmerican" && r.Model.startsWith("Without"));
    const ar = race.find((r) => r.Group === "AfricanAmerican" && r.Model === "With race");
    return `Holdout check *[notebook, Section 9]*. Overall AP ${f3(D.printed.hold_ap_norace)} without race vs ${f3(D.printed.hold_ap_race)} with race. African American patients, recall ${f3(aw.Recall)} without vs ${f3(ar.Recall)} with race (about ${Math.round(Math.abs(ar.Recall - aw.Recall) * 367)} patients), mean predicted ${f1(aw["Mean predicted (%)"])}% vs ${f1(ar["Mean predicted (%)"])}%, observed ${f1(ar["Observed rate (%)"])}%. So race does not fix the under-estimation either way. **Honest story if asked.** When we decided, an earlier version (before the discharge-grouping fix) showed race adding about 0.002 AP and leaving it out slightly helped African American recall. After the fix the differences are even smaller and point slightly the other way for recall (3 patients). Our reason never rested on that small gap. It rests on no real accuracy gain plus not basing follow-up on a social category.`;
  })(),
  alts: [`Race as an input *[notebook, Section 4.2]*, CV AP ${choices["Race added as an input"] ? f3(choices["Race added as an input"]["CV AP"]) : "?"} vs ${f3(choices["Our cleaned features"]["CV AP"])}.`],
  why: "Leaving race out does not make a model fair by itself, because other inputs (payer code, for example) can stand in for it. That is why we check the results by group.",
});
card("Features we refused to build", {
  say: "No feature from patient_nbr or encounter_id. In particular, \"how many rows this patient has in the file\" would look very strong (single-stay patients 4% vs 28% for 5 or more stays) but it uses patient_nbr and the future, since an early readmission is itself another row.",
  show: "Notebook Section 1.2.",
});

add(H2("3.3 Splitting and validation"));
card("Patient-grouped split", {
  say: "13,376 patients have more than one stay (46% of rows). We keep all stays of a patient on one side of every split with StratifiedGroupKFold. Group = patient_nbr, stratified = every part keeps about 11% positives.",
  detail: `First, 20% of patients (${comma(16217)} stays, ${comma(11438)} patients) become our holdout test set, used once at the end. Then 5-fold grouped cross-validation on the other 80% (${comma(65064)} stays) chooses models, settings and the threshold. We printed 0 shared patients for the holdout and for every fold.`,
  alts: ["Random row split *[notebook, Section 4.1]*.", "Keeping only the first stay of each patient *[not tried]*. It throws away 24,000 rows and the hidden set includes repeat stays.", "GroupShuffleSplit or plain GroupKFold *[not tried]*, would also be honest but folds could differ in positive rate."],
  show: "Notebook Section 3 (split table and the zero-overlap prints).",
});
card("The leakage check result (be ready for this one)", {
  say: `We expected the leaky random-row split to look clearly better, but the gap was tiny (${Math.max(...leak.map((r) => Math.abs(r["AP | Random rows (leaky)"] - r["AP | Grouped by patient"]))).toFixed(3)} AP or less), even for 1-nearest neighbour, which copies the label of the most similar stay.`,
  detail: "A patient's stays look different from each other (different diagnoses, lab counts, length of stay) and we use no patient-level feature, so nothing reliably identifies a person. The grouped split is still right, because it is the only design that matches new patients and the patient-disjoint hidden set. The real leakage danger was the patient-level count feature, which we did not build.",
  show: "Notebook Section 4.1 table.",
});
card("Preprocessing inside the pipeline", {
  say: "Median imputation, z-score scaling and one-hot encoding are part of the scikit-learn Pipeline, so in cross-validation they are fitted on the training folds only, and the saved pipeline applies exactly the training medians, means and categories to new rows (Unit 11, \"use the same normalization parameters\").",
  detail: "Median, not mean, because counts are skewed and the median is resistant (Unit 05). One-hot: levels seen fewer than 50 times are pooled into an \"infrequent\" column, and an unseen level is sent there too, so new payer codes cannot crash the code.",
});

add(H2("3.4 Models"));
card("Which models and why", {
  say: "Two baselines (no-skill and a one-feature rule on prior inpatient stays), then logistic regression, a decision tree and KNN (simple and interpretable), and random forest and gradient boosting (ensembles, flexible). Each is tuned with GridSearchCV on the same grouped folds and scored by average precision.",
  detail: `CV AP: no-skill ${f3(cmp["No-skill baseline"].AP)}, rule ${f3(cmp["Prior-inpatient-visits rule"].AP)}, logistic regression ${f3(LR.AP)}, tree ${f3(cmp["Decision tree"].AP)}, KNN ${f3(cmp["K-nearest neighbours"].AP)}, random forest ${f3(cmp["Random forest"].AP)}, gradient boosting ${f3(GB.AP)}.`,
  alts: ["Neural network (MLP, Week 11) *[not tried]*, would be hard to explain and is unlikely to beat boosting on tabular data.", "XGBoost or LightGBM *[not tried]*. scikit-learn's HistGradientBoosting is the same idea and avoids an extra dependency."],
  show: "Notebook Section 4, comparison table and Figure f02.",
});
card("Why KNN is weakest", {
  say: `It needed k = 400 (the largest we tried), so it basically averages over a big neighbourhood. With ${D.printed.onehot_columns} mostly 0/1 columns all weighted equally, the distance between two stays is not very informative.`,
  alts: ["k = 50, 100, 200, 400 *[notebook]*, AP rises with k.", "k = 25 *[development]*, clearly worse (AP about 0.15).", "Distance weighting (w = 1/d²) *[development]*, about the same as uniform."],
});
card("Decision tree: Gini vs entropy, depth", {
  say: "Gini and entropy gave almost the same AP at depth 8. Depth 8 with at least 50 stays per leaf was best. Shallower trees under-fit, deeper trees over-fit.",
  show: "Notebook Section 4, tree grid table.",
});
card("Final model: gradient boosting", {
  say: `Best average precision, the primary metric (CV ${f3(GB.AP)}, holdout ${f3(hold["Gradient boosting"].AP)}), the smallest spread across folds, and the best AUC and Brier score. It finds interactions on its own.`,
  detail: "The grid chose a learning rate of 0.05, 100 trees, at most 31 leaves per tree and at least 50 stays per leaf (notebook Section 5). The top six settings were within 0.001 AP of each other, so the exact setting matters little. We turned off scikit-learn's automatic early stopping (it holds out a random 10% of rows that is not grouped by patient) and tuned the number of trees on our grouped folds instead, so the model is fully deterministic.",
  alts: [`Logistic regression (CV AP ${f3(LR.AP)}) as the transparent option *[notebook]*. We keep it as our interpretable reference.`, `Random forest (CV AP ${f3(cmp["Random forest"].AP)}) *[notebook]*, slightly worse on every measure and a much bigger model file.`, "Boosting with early stopping on, and smaller learning rates with more trees *[development]*, all within about 0.003 AP."],
  show: "Notebook Sections 4 and 5.",
});
card("How gradient boosting works (plain words)", {
  say: "It builds many small decision trees one after another. Each new tree looks at what the trees so far still get wrong and nudges those predictions in the right direction. The final score is the sum of all trees, turned into a probability. The learning rate controls how big each nudge is, and the number and size of the trees control how flexible the model is.",
  detail: "Random forest is the opposite idea. It builds many deep trees independently on bootstrap samples and averages them (bagging), which reduces variance. Boosting builds trees in sequence to reduce bias.",
});
card("What the model relies on", {
  say: `Discharge destination and prior inpatient stays, by far. Shuffling either one lowers holdout AP by about ${f2(imp[0]["Drop in AP (mean)"])}. Next come total prior visits, the primary diagnosis group and the payer code, each about six times smaller.`,
  detail: "Permutation importance shuffles one cleaned feature at a time on the holdout patients and measures the drop in AP. Logistic regression tells the same story with odds ratios, for example psychiatric hospital and rehab raise the odds, expired and hospice lower them.",
  show: "Notebook Section 4.3.",
});

add(H2("3.5 Metrics, calibration and threshold"));
card("The three ranking and probability metrics", {
  say: "Average precision is the area under the precision-recall curve, and its no-skill level is the positive rate (0.11). ROC-AUC is the chance that a random readmitted stay gets a higher score than a random non-readmitted one (0.5 = random). The Brier score is the mean squared gap between the probability and the 0/1 outcome (lower is better, everyone at 11% gives 0.099).",
  detail: "AP is the instructor's primary metric because it focuses on the rare class. ROC-AUC can look decent even when precision is low, since the many true negatives dominate the false positive rate (the Unit 10 homework question).",
});
card("Calibration", {
  say: "When the model says 12%, about 12% of such stays are really readmitted. In each tenth of the predictions the mean prediction is within about one percentage point of the observed rate.",
  show: "Notebook Section 6 table.",
});
card(`Threshold ${thr}`, {
  say: `We give each error a cost (Unit 10, cost-sensitive measures). Missing a readmission costs 7, an unneeded follow-up costs 1, and we pick the threshold with the lowest total cost on out-of-fold predictions of the training patients. That gives ${thr}.`,
  detail: `At ${thr} on the training patients (out-of-fold) we flag ${f1(thrAt(thr)["Flagged (%)"])}% of stays, recall ${f3(thrAt(thr).Recall)}, precision ${f3(thrAt(thr).Precision)}, F1 ${f3(thrAt(thr).F1)}. On the holdout, recall ${f3(fin.Recall)}, precision ${f3(fin.Precision)}, F1 ${f3(fin.F1)}, ${comma(TP)} caught, ${comma(FN)} missed, ${comma(FP)} false alarms. 7 is a team judgement. A follow-up is cheap, but it does not prevent every readmission, so the ratio should not be extreme.`,
  alts: [`Default 0.5 *[notebook]*, flags ${f1(thrAt(0.5)["Flagged (%)"])}% of stays.`, `Ratios 3, 5 and 10 *[notebook, Figure f03]*, best thresholds ${D.printed.cost3_threshold}, ${D.printed.cost5_threshold} and ${D.printed.cost10_threshold}.`, `Maximum F1 *[notebook]*, at ${D.printed.f1_best_threshold} (F1 is flat around there).`],
  why: "5 catches only about a third of readmissions, and 10 flags about half of all patients, more than a discharge team can follow up.",
  show: "Notebook Section 7.",
});

add(H2("3.6 Holdout and fairness"));
card("Holdout result and the validation gap", {
  say: `Holdout AP ${f3(fin["Average precision"])}, AUC ${f3(fin["ROC-AUC"])}, Brier ${f3(fin["Brier score"])}. This is close to the CV result (AP ${f3(GB.AP)}), so there is no sign of over-fitting or leakage.`,
  detail: "The holdout is slightly higher because the holdout model is trained on all training patients (each CV model saw only 80% of them) and because of chance in which patients landed in the holdout. Expect the hidden score to be in the same range.",
  show: "Notebook Section 8.",
});
card("Subgroup findings", {
  say: "Gender: about equal. Age: older patients are ranked least well and get the most false alarms. Race: the two large groups are similar, but risk is under-estimated for African American and Hispanic patients. Small groups (Asian, Other, Unknown) are too small to judge.",
  detail: (() => {
    const a = subRow("Age", "80 and over"), y = subRow("Age", "Under 40");
    const m = subRow("Age", "60-79"), af = subRow("Race", "AfricanAmerican"), hi = subRow("Race", "Hispanic");
    const fe = subRow("Gender", "Female"), ma = subRow("Gender", "Male");
    return `AUC ${f3(a.AUC)} for 80 and over and ${f3(m.AUC)} for 60–79, against ${f3(y.AUC)} under 40. False alarm rate ${f2(a["False alarm rate"])} for 80 and over against ${f2(y["False alarm rate"])} under 40. Lowest recall ${f2(m.Recall)} for 60–79. Gender recall ${f2(fe.Recall)} women vs ${f2(ma.Recall)} men. African American mean prediction ${f1(af["Mean predicted (%)"])}% vs ${f1(af["Rate (%)"])}% observed, Hispanic ${f1(hi["Mean predicted (%)"])}% vs ${f1(hi["Rate (%)"])}%.`;
  })(),
  why: "We did not set a different threshold per group. Race-specific rules raise their own fairness problems, and some groups are too small to tune on. We recommend monitoring recall by group.",
  show: "Notebook Section 9 table and Figure f05.",
});

// ================================================================ 4
add(H1("4. Key numbers"));
add(table("Numbers to know by heart.", ["Item", "Value"], [
  ["Development data", `${comma(81281)} stays, ${comma(57214)} patients, 50 columns`],
  ["Early readmissions", "9,053 (11.1%)"],
  ["Patients with more than one stay", "13,376 (46% of rows)"],
  ["Training / holdout", `${comma(65064)} stays (80% of patients) / ${comma(16217)} stays (20%)`],
  ["Model inputs", `${D.printed.n_features} cleaned features → ${D.printed.onehot_columns} columns after one-hot`],
  ["CV AP, final model", `${f3(GB.AP)} (±${f3(GB["AP sd"])})`],
  ["Holdout AP / AUC / Brier", `${f3(fin["Average precision"])} / ${f3(fin["ROC-AUC"])} / ${f3(fin["Brier score"])}`],
  ["Threshold", `${thr}, cost ratio 7 : 1`],
  ["Holdout at threshold", `precision ${f3(fin.Precision)}, recall ${f3(fin.Recall)}, F1 ${f3(fin.F1)}, flagged ${f1(fin["Flagged (%)"])}%`],
  ["Confusion matrix (holdout)", `TP ${comma(TP)}, FN ${comma(FN)}, FP ${comma(FP)}, TN ${comma(TN)}`],
], [3600, 6200], "ll"));

// ================================================================ 5
add(H1("5. Methods used and where they come from"));
add(table("Methods, mapped to the course.", ["Method", "Source", "One-line reason"], [
  ["Decision tree, Gini/entropy", "Units 08–09", "Interpretable rules, our tree baseline"],
  ["KNN, z-score scaling", "Units 04, 11", "Instance-based model, scaling makes distances fair"],
  ["Precision, recall, F1, ROC, AUC, cost-sensitive errors", "Unit 10", "Evaluation and threshold"],
  ["Holdout and cross-validation", "Week 8", "Our 80/20 holdout plus 5-fold CV"],
  ["Logistic regression, odds ratios", "Week 9", "Transparent reference model"],
  ["Random forest, gradient boosting", "Week 12 (ensembles)", "Flexible models, best results"],
  ["Missing data: deletion vs constant/median imputation", "Unit 03", "weight dropped, \"Unknown\" category, median for numbers"],
  ["Log transform of skewed counts", "Assignment 1 (Unit 04)", "Visit counts"],
  ["Average precision, Brier score", "Assignment brief", "The instructor's evaluation metrics"],
  ["Grouped (by patient) stratified folds", "Assignment brief + Week 8", "Asked for in Section 4.3 of the brief"],
  ["Permutation importance", "Outside the slides (used in our project M3)", "Explains the boosting model"],
  ["ICD-9 chapter grouping", "Strack et al. (2014)", "Standard grouping for this dataset"],
], [3700, 2700, 3400], "lll"));

// ================================================================ 6
add(H1("6. Question bank"));
const QA = (q, a) => { add(P(`**Q. ${q}**`, { after: 20, keepNext: true })); add(P(a, { after: 100 })); };
add(H2("Data and cleaning"));
QA("Why did you drop weight but keep payer_code, which is also often missing?", "weight is missing for 97% of stays and whether it is recorded tells nothing about readmission. payer_code is missing for 40%, still has 17 real codes for the rest, and leaving it out lowered AP a little (Section 4.2).");
QA("How does your code handle a diagnosis code it has never seen?", "`icd9_group` turns any code into a number and puts it into a range. A code outside every range goes to Other, a V or E code to Other, unreadable text to Other, and a blank or \"?\" to Missing. It never fails.");
QA("What if a whole column is missing in the hidden file?", "`clean()` adds it as an empty column. Numeric gaps are filled with the training median by the pipeline, text gaps become \"Unknown\". The notebook's last cell tests this with medical_specialty removed.");
QA("Why is A1Cresult blank in the file but you never see NaN in the cleaned table?", "pandas reads blank cells as NaN. `clean()` treats NaN, blank, \"None\" and \"?\" the same and labels them \"Not tested\".");
QA("Why not one-hot encode the 26 discharge codes directly?", "Several codes have 1 to 50 stays, too few to learn a reliable effect. Grouping by meaning is easier to explain and Section 4.2 shows the raw codes do not do clearly better.");
add(H2("Splitting and leakage"));
QA("Why is a random split of rows wrong here?", "Some patients have several stays. With a random split, one stay can be in training and another in validation, so the score is measured partly on people the model has seen. The hidden test set is made of new patients, so our validation must be too.");
QA("Your leakage check shows almost no difference. Doesn't that mean grouping was unnecessary?", "For these features the effect is small, which is a finding in itself. It tells us the features do not identify individual patients. But we could only know that by checking, and the grouped design is the only one that matches the hidden set. If we had added patient-level features, the gap would have been large.");
QA("Did the threshold use the holdout data?", "No. The threshold was chosen on out-of-fold predictions of the training patients. The holdout was used once, at the end, to check it.");
QA("Why refit on all data at the end? Doesn't that make the holdout result invalid?", "The holdout result describes a model trained on 80% of patients. Refitting on 100% with the same settings and threshold gives the submitted model slightly more information. Its performance should be the same or a little better, and the holdout number stays an honest estimate.");
add(H2("Models and metrics"));
QA("Why average precision and not accuracy?", "With 11% positives, accuracy rewards saying \"no\" to everyone. AP looks only at how well the rare positives are ranked to the top, and it is the instructor's primary metric.");
QA("Your AUC is only 0.68. Is the model useful?", "It is modest but typical for readmission from administrative data, because much of what causes a readmission (home support, medicines actually taken) is not recorded. At our threshold, 1 in 5 flagged stays is a real early readmission, against 1 in 9 if patients were picked at random, and more than half of the early readmissions are caught.");
QA("Why not use class_weight='balanced'?", `It hardly changes the ranking but distorts the probabilities (mean prediction ${pct(D.printed.bal_mean)} vs 11% real, Brier ${f3(D.printed.bal_brier)} vs ${f3(D.printed.lr_oof_brier)}). The Brier score is graded, so we keep honest probabilities and move the threshold instead.`);
QA("Why did KNN need such a large k?", `Readmission is noisy, so a few neighbours give a noisy vote. With ${D.printed.onehot_columns} mostly 0/1 columns, distances are not very informative, so averaging over many neighbours works best.`);
QA("Is gradient boosting a black box? How do you explain a prediction?", "Overall, with permutation importance (discharge destination and prior inpatient stays dominate). Directionally, logistic regression shows the same drivers with odds ratios. For one patient we can say which of these risk factors they have.");
add(H2("Threshold and fairness"));
QA("Why 7 and not 5 or 10?", "It is a value judgement, and we show 3, 5, 7 and 10. At 5 only about a third of early readmissions are caught. At 10 about half of all patients are flagged, too many to follow up. 7 catches more than half of the early readmissions while flagging about a third of stays, and it sits next to the best F1.");
QA("Which groups have higher error rates?", "Older patients (lowest AUC, most false alarms for 80 and over, lowest recall for 60 to 79) and African American and Hispanic patients, whose risk is under-estimated. Men are missed slightly more often than women. The Asian, Other and Unknown groups are too small to judge.");
QA("Why not use a separate threshold for each group?", "Group-specific thresholds based on race raise their own fairness and legal issues, some groups are too small to tune on, and the gaps are modest. We recommend monitoring recall by group instead.");
QA("Does dropping race make the model fair?", "No. Other inputs can act as a proxy (payer code, for example). Dropping race only means the decision does not use it directly. Fairness has to be checked on the results, which is what Section 9 does.");
add(H2("Code and package"));
QA("Where is the cleaning code, and how do you make sure the notebook and predict.py match?", "It is only in `predict.py`. The notebook imports `clean` from it, so the same function prepares training data and hidden data.");
QA("What does predict.py need to run?", "Only numpy, pandas, scikit-learn and joblib with the pinned versions, and the model file in `model/`. No internet, no training data, no retraining. It loads the model with a path relative to its own folder.");
QA("How did you test it?", "The notebook's last cell runs it on a 500-row sample and on a messy copy (unseen codes, \"?\" in numbers, a blank row, a missing column). We also copied only the package into an empty folder and ran the command line on 500 and on 20,000 rows, from two different working folders.");

// ================================================================ 7
add(H1("7. Who did what (fill in before the viva)"));
add(table(null, ["Part", "Main person", "Both can explain?"], [
  ["Problem framing, target, threshold costs", "", ""],
  ["Data exploration and missing values", "", ""],
  ["Cleaning and grouping (`clean()` in predict.py)", "", ""],
  ["Grouped split and leakage check", "", ""],
  ["Models and tuning", "", ""],
  ["Fairness and subgroup analysis", "", ""],
  ["Report writing", "", ""],
], [4600, 2700, 2500], "lll"));

build(OUT, { creator: "Syeda Hoorain Imran, Munib Sattar", title: "Assignment 2 Viva Guide" }, body, 1080);
