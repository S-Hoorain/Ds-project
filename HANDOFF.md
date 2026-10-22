# HANDOFF

**Last updated:** 2026-10-22 (session 7)
**Session summary:** Full audit of Milestone 3 (code, data, results, insights), then a lecture-scope pass after the
user added the Unit 08–11 slides: methods from beyond the lectures were cut down to a few meaningful ones, the hand-coded
DeLong test was replaced by the week-block bootstrap, and jargon was replaced by plain words. No model, threshold or
result changed.

M3 is due **2026-10-24**.

## 1. Project overview
CS/SDP 312/314 project. Using the PBS weekly Sensitive Price Indicator (SPI, base 2015-16, 370 weeks, Sep 2019 – Oct 2026),
we build **an early-warning system for essential-price shocks for each consumption quintile** (Q1 poorest … Q5 richest)
and test whether it works as well for the poor as for the rich. SDGs 1, 2 and 10; the policy angle is timing BISP
top-ups.

Lens: the burden of inflation rotates. M3 refined it: **motor-fuel shocks hit Q5 harder; food shocks (perishables above
all) hit Q1 harder.** Utility tariffs lean towards Q1 but are not significant in the M3 gap regression (p = 0.10).

## 2. Done so far
- **Sessions 1–3:** scaffolding, handoff hook, git; SPI archive scraped (370/370 weeks); SBP decisions, FX, Ramadan/Eid
  calendar; notebook 01 → `master_model_ready.csv`, `items_weekly_panel.csv`, `DATA_DICTIONARY.md`; collection audit.
- **Session 4:** quintile insights; narrative chosen; `build_features.py` → `master_features.csv` (2,220 × 105);
  notebook 02 (EDA, Figures E1–E5, hypotheses H1–H5).
- **Session 5:** team-verified Eid/Ramadan dates; M2 manuscript (Sections II–III). **M2 submitted, full marks.** The
  submitted files are in `milestones/M2_data_eda_hypotheses/` (untracked; added by the user).
- **Session 6 (2026-10-21): Milestone 3 built.**
  - `src/models/baseline.py` (all modelling code, decisions B1–B8) and `src/models/train_baselines.py` (command-line run).
  - `notebooks/03_baseline_models.ipynb` (§1–§12: split, CV design, benchmarks, tuning, leakage demo, test metrics,
    costs, confusion matrices and edge cases, feature importance, H1, artifacts, summary) and
    `notebooks/04_hypothesis_tests.ipynb` (H2, H3).
  - Models in `models/m3_baselines/`; figures `figB1`–`figB10`; **23** tables `reports/tables/m3_*.csv`.
  - Manuscript Sections IV–V (`tools/build_manuscript_m3.js` → docx → PDF); viva guide `DS4SG_M3_Reference.docx`
    (`tools/build_m3_reference_doc.js`).
- **Session 7 (2026-10-22), part 1: audit** (commits `1092762`, `b464a62`; pushed to origin).
  - **Verified correct:** target and feature timing (no week t+1 leakage), disjoint folds, byte-identical re-runs of
    both notebooks (tables, figures, models), script = notebook, independent recomputation of all metrics and costs.
  - **Interpretation fixes:** shock persistence measured against ordinary weeks (4.2% vs 1.9%); fiscal-year OR 5.3
    rests on 5 fiscal years (CI 1.4–19.5) and July shocks mostly fall after its first week; the 20:1 "never beat
    never-alert" claim; manuscript V-C contradiction with Table 20; permutation leaders; utility tariffs not significant
    (p = 0.10); KNN dip range; sister rows 82%; Fig B4 legend; Table 22 momentum row.
- **Session 7, part 2: lecture-scope pass** (user request: few methods from beyond the lecture slides, only meaningful
  ones). Slides now cover Units 01–11 (Unit 08–09 trees, 10 accuracy measures, 11 KNN); the syllabus also covers CV
  (Week 7), logistic regression (Week 9), regression (Week 10).
  - **Removed:** the year-level "oracle" diagnostic (the pooled-AUC caveat is now shown with the tree's own yearly AUCs:
    pooled 0.652 beats three of its four years); the hand-coded DeLong test (`_midrank`, `delong_test`, Sun & Xu); the
    Bayes-threshold formula (and Elkan ref); "prior shift" (and Moreno-Torres ref); "improper linear model" (Dawes ref);
    "bias–variance" wording; saga/liblinear intercept explanation; Platt/isotonic, "equal opportunity", "welfare
    weights" in the M4 plan (now plain words).
  - **H1 out of sample** now uses the week-block bootstrap only (gain +0.007, 95% CI −0.08 to +0.10, p = 0.45); the
    manuscript and notebook say why the DeLong test planned in M2 [9] was replaced (assumes independent rows).
    `m3_h1_tests.csv` lost its DeLong row; every other table, figure and model is byte-identical.
  - **Lecture ties added:** Euclidean distance and KNN limitations (Unit 11), Gini (Units 08–09), metrics, threshold
    sweep and PR-AUC homework (Unit 10), bootstrap and cluster sampling (Unit 04), CIs (Unit 06).
  - Manuscript references renumbered [11]–[17] in order of first citation; body 3,349 words, 12 pages; PDF re-exported.
  - Viva guide: new §5.8 "Methods beyond the lecture slides" and two viva questions (27 → 29); 29 pages.

## 3. Where we are now
- **M3 deliverables are complete, audited and lecture-scoped.** The team still needs a read-through.
- **Methods kept from beyond the slides** (see decisions below): expanding-window CV, permutation importance, standard
  errors clustered by week; carried from the M2 plan: logit LR test, OLS with HAC errors, Brier score, Diebold–Mariano
  (M4 plan only).
- **Rebuilding the viva guide:** `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js
  DS4SG_M3_Reference.docx` (the docx package is not in the project: `npm install docx` in any folder). Close the file
  in Word first, or the write fails with EBUSY.
- **Notebooks are the source** (the scratchpad builders are gone): edit them directly.
- **Word automation (COM):**
  - Works via a NEW hidden instance, exporting to a folder outside the project.
  - A start can fail with CO_E_SERVER_EXEC_FAILURE and leave a window-less WINWORD behind; stop only that new PID and
    retry (the second try worked).
  - In PowerShell use `$w.Quit()`, not `$w.Quit(0)`. Never touch the user's own Word process.
- **Known caveats (disclosed):**
  - The momentum basket was chosen on all training years (it sees later CV folds, never the test).
  - The LR is at the grid edge C = 1e-4 on a flat plateau, uncalibrated (Brier 0.24).
  - The test has 13 distinct shock weeks.
  - Pooled AUC partly rewards telling crisis years from calm ones (flattered the tree).
  - Edge-case drivers use Combined-index item impacts (no Q2–Q5 item weights exist).
- The lecture-scope commit is local (not pushed).

## 4. What's next
1. **By 2026-10-24 (M3 due):**
   - the team reads the PDF and the notebooks; to fix the manuscript, edit `tools/build_manuscript_m3.js`, rebuild,
     re-check `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx`, and re-export the PDF;
   - submit the PDF, `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`,
     `src/models/baseline.py` and `src/models/train_baselines.py` (plus `models/m3_baselines/` if artifacts are
     uploaded);
   - late penalty: 20% within 24 h.
2. **Viva prep (5 minutes, V-factor):**
   - every member studies the reference doc §5.8 (methods beyond the slides), §6 (decisions), §7 (numbers) and §8
     (Q&A, 29 questions);
   - be ready for "why was the tree best in CV but worst on test?" and "why a bootstrap instead of DeLong?";
   - re-run notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.** Keep new methods within the lectures/syllabus where
   possible (ensembles are Week 12, fairness Week 15).
   - Ensembles (random forest, gradient boosting) under the same protocol. Report within-year AUC next to pooled AUC
     and decide the selection criterion before looking at the test.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (probabilities that match observed shock rates; Brier score).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock rate.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano, planned in M2), equal recall across quintiles,
     quintile-specific thresholds.
   - Ethics: self-fulfilling warnings, transparency, rural exclusion.
   - Consider re-selecting the momentum basket inside each fold.
4. **M5 (Week 14):** walk-forward retraining with new weekly releases; measure how fast the thresholds adapt.
5. Carry-over items:
   - verify Eid ul-Adha 2026 (27 May per Umm al-Qura) in the overrides file;
   - write the abstract, introduction and literature review for the final paper.

## 5. Decisions & rationale
- **Data (M2):**
  - The sample is 5 Sep 2019 – 1 Oct 2026, base 2015-16. Missing weeks were filled from official previous-week
    values; revised values use the latest vintage. Outliers are kept (they are the shocks).
  - A shock is a weekly rise of ≥ 1%. Signals are known at the end of week t, or are calendar facts. The event
    calendar overrides file is the single source of truth.
- **Lecture scope (user, 2026-10-22):** methods should come from the lecture slides, syllabus or rubric; only a few
  meaningful outside methods, each with a one-line reason (reference doc §5.8). Kept: expanding-window CV (shuffled
  K-fold leaks, +0.05–0.14 AUC), permutation importance (KNN has no coefficients), week-clustered SEs (sister rows;
  LR χ² 94 vs 22.4). M2-plan items (LR test, HAC, Brier, Diebold–Mariano) stay because M2 committed to them.
- **M3 modelling** (IDs as in `baseline.py` and the reference doc):
  - B1: Q1–Q5 rows only. Combined is excluded as a near-duplicate average.
  - B2: chronological split (train ≤ 2024, test 2025–26; 74.8/25.2), fixed in M2. A stratified random split was
    rejected because it would leak the future and split sister rows.
  - B3: expanding-window CV with K = 4 calendar years 2021–24 and whole weeks together; no gap is needed for a
    1-week target.
  - B4: scaling inside pipelines. LR z-scores all features; KNN scales only the continuous features (z-score won);
    0/1 flags pass through; the tree is unscaled; the M2 `*_z` columns are not used (they leak inside CV).
  - B5: selection by **pooled out-of-fold ROC-AUC** (one threshold must work in every year); mean ± SD per fold also
    reported. Caveat: pooled AUC partly rewards telling crisis years apart; kept as planned (changing it after the test
    would be leakage, B16).
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: a Q1 shock's step is not given back (4.2% vs 1.9% after 8 weeks), Rs 355/month ≈ 8% of Kafaalat,
    and FAO's 7:1 return on early action.
  - B8: listwise deletion of 9 weeks.
  - B9: LR + KNN + shallow tree (the user chose this), with majority-class and persistence benchmarks.
  - B10: 18 features; only the 8-week FX change.
  - B11: grids were extended at their edges. LR uses saga (fits both L1 and L2). KNN k ≤ 250, limited by fold 1's size.
  - B12: three importance measures. Permutation importance is computed on the CV folds, not the test. Odds ratios
    come from an unpenalised logit with week-clustered SEs.
  - B13: H1 is tested with a week-clustered Wald test in sample and a week-block bootstrap out of sample (the DeLong
    test planned in M2 was replaced: it assumes independent rows).
  - B14: H2 uses a difference regression on the training period, with windows ending by 2024.
  - B15: H3 is tested as pre-stated, with the component split labelled exploratory.
  - B16: the test is used once; no re-tuning after seeing it (the audit respected this).
  - B17: a shock's driver is the largest *upward* PBS item impact (Combined index).
  - B18: the momentum-basket exception is disclosed.
  - B19: fixed seed 42, and the script reproduces the notebook.
- **Manuscript:** M3 = new sections only (user). Numbering continues M2. The style matches M2: black text, Times New
  Roman, no header or footer, three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Does the team accept FN:FP = 5:1 as the headline cost ratio? This is a value judgement and the SDP members should
  sign off. The sensitivity analysis shows no ratio makes the baselines clearly valuable in 2025–26.
- M4 selection criterion: pooled AUC, within-year AUC, or both (e.g. within-year AUC plus a calibration check)? It must
  be fixed before the M4 test evaluation.
- Should M4 include walk-forward retraining already (it would address the changing shock rate), or leave it for M5 as
  planned?
- Should the submitted M2 files in `milestones/M2_data_eda_hypotheses/` be committed as the official record?
- Carry-overs:
  - Which source did Sarah use for the Eid/Ramadan dates (for citation)?
  - Extend the series back to Sep 2018 with the year-ago columns?
  - Register for SBP EasyData (official PKR/USD)?

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **Lecture slides:** `course/lecture_slides/` Units 01–11 (not in git); syllabus in `course/syllabus/`.
- **M3 code:** `src/models/baseline.py`, `src/models/train_baselines.py`.
- **M3 notebooks:** `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`.
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv` (23 files).
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`.
