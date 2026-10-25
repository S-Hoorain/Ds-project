# HANDOFF

**Last updated:** 2026-10-25 (session 8)
**Session summary:** Checked that the notebooks and code match the lecture-scoped M3 report, removed every
Claude/tooling reference from the deliverables, removed the interactive scikit-learn pipeline diagram from notebook 03,
and documented what the decision labels (D, F, B, H-) mean. No result changed.

M3 was due **2026-10-24**; its submission status was not recorded this session.

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
- **Session 7 (2026-10-22): audit and lecture-scope pass** (commits `1092762`, `b464a62`, `7d341d7`; all pushed).
  - Audit: target/feature timing, folds, reproducibility and every metric verified; interpretation fixes (shock
    persistence vs ordinary weeks, fiscal-year OR on 5 years, utility tariffs not significant, etc.).
  - Lecture scope: removed the year-level oracle, the hand-coded DeLong test, the Bayes-threshold formula and jargon
    (prior shift, improper linear model, bias–variance, Platt/isotonic, equal opportunity, welfare weights); H1 out of
    sample now uses the week-block bootstrap (gain +0.007, 95% CI −0.08 to +0.10, p = 0.45). Lecture ties added (Units
    04, 06, 08–11). Manuscript 12 pages, 3,349 body words; viva guide §5.8 "Methods beyond the lecture slides", 29
    questions.
- **Session 8 (2026-10-25): consistency and clean-up** (commit `ffa0165` pushed; a second commit is local).
  - Notebooks 03/04 and `baseline.py` already matched the trimmed report. Removed the unused `statsmodels` import from
    notebook 03.
  - All four notebooks found the project root via `CLAUDE.md`; they now use `requirements.txt`.
  - `tools/build_reference_doc.js` and `DS4SG_Script_and_Data_Reference.docx`: handoff-hook entry and the
    CLAUDE.md/HANDOFF/log/.claudeignore rows removed (TOC updated in Word; text otherwise identical).
  - Notebook 03 §4: removed `models["KNN"]`, whose output was scikit-learn's interactive pipeline diagram (the only
    such diagram in any notebook); the grid printout stays.
  - Grep of all tracked deliverables finds no Claude/handoff/AI mention. Notebooks 01–04 re-run cleanly; all 80 output
    files byte-identical.

## 3. Where we are now
- **M3 deliverables are complete, audited, lecture-scoped and free of tooling references.**
- **Methods kept from beyond the slides:** expanding-window CV, permutation importance, standard errors clustered by
  week; carried from the M2 plan: logit LR test, OLS with HAC errors, Brier score, Diebold–Mariano (M4 plan only).
- **Decision labels are our own bookkeeping IDs, not course terms.** They were added when each script was written so
  that code, notebooks and the viva guide can point at the same choice. They do not appear in either submitted
  manuscript PDF. Where each set is defined:
  - D1–D5 (data cleaning): docstring of `src/cleaning/build_master.py`; counts in `cleaning_report.txt`.
  - F1–F4 (features): docstring of `src/features/build_features.py`.
  - B1–B8 (M3 modelling): docstring of `src/models/baseline.py`; B1–B19 in the M3 viva guide §6 and §5 below.
  - H-1, H-2 (hypothesis tests): notebook 04 markdown (training-period sample; difference regression).
  - Figures are also numbered B1–B10 (and E1–E5); "Figure B1" is not "decision B1".
- **Repo-level session files stay** (CLAUDE.md, HANDOFF.md, logs/, .claude/, .claudeignore): the repo is for the team
  only; the instructor sees only the submitted reports and notebooks (user, 2026-10-25).
- The submitted M2 notebook copies in `milestones/M2_data_eda_hypotheses/` (untracked) still use the old root marker;
  they are left as submitted.
- **Rebuilding docs:** `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js
  DS4SG_M3_Reference.docx` (same pattern for `build_reference_doc.js`; `npm install docx` in any folder). Close the
  file in Word first (EBUSY). A docx-js TOC has no page numbers until Word updates it.
- **Notebooks are the source** (the scratchpad builders are gone): edit them directly.
- **Word automation (COM):**
  - Works via a NEW hidden instance, exporting to a folder outside the project.
  - A start can fail with CO_E_SERVER_EXEC_FAILURE and leave a window-less WINWORD behind; stop only that new PID and
    retry.
  - In PowerShell use `$w.Quit()`, not `$w.Quit(0)`. Never touch the user's own Word process.
- **Known caveats (disclosed):**
  - The momentum basket was chosen on all training years (it sees later CV folds, never the test).
  - The LR is at the grid edge C = 1e-4 on a flat plateau, uncalibrated (Brier 0.24).
  - The test has 13 distinct shock weeks.
  - Pooled AUC partly rewards telling crisis years from calm ones (flattered the tree).
  - Edge-case drivers use Combined-index item impacts (no Q2–Q5 item weights exist).

## 4. What's next
1. **M3 (due 2026-10-24):** confirm it was submitted (PDF, notebooks 03 and 04, `src/models/baseline.py`,
   `src/models/train_baselines.py`, plus `models/m3_baselines/` if artifacts were uploaded). Late penalty: 20% within
   24 h; not accepted after.
2. **Viva prep (5 minutes, V-factor):**
   - every member studies the reference doc §5.8 (methods beyond the slides), §6 (decisions), §7 (numbers) and §8
     (Q&A, 29 questions);
   - be ready for "why was the tree best in CV but worst on test?", "why a bootstrap instead of DeLong?" and "what do
     decision B1/B8 mean?";
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
- **Data (M2), labels as in `build_master.py` / `build_features.py`:**
  - D1: each report's printed date is authoritative; off-day releases are aligned to the nearest Thursday.
  - D2: a missing week is filled from the next report's official "previous week" index (flagged, not imputed).
  - D3: `spi_prev_week(t)` is checked against `spi(t−1)`; PBS revisions use the revised figure.
  - D4: daily PKR/USD is averaged over the SPI week (Fri–Thu), after dropping known one-day bad ticks.
  - D5: a fuel-revision week is one where average petrol or diesel moved by more than 1%.
  - F1: a shock is a weekly SPI rise of ≥ 1%. F2: fuel-review calendar (1st and 16th of the month). F3: momentum items
    are chosen on training weeks only. F4: component inflation is Combined-weighted, the same for every group.
  - The sample is 5 Sep 2019 – 1 Oct 2026, base 2015-16; revised values use the latest vintage. Outliers are kept
    (they are the shocks). Signals are known at the end of week t, or are calendar facts. The event calendar
    overrides file is the single source of truth.
- **Lecture scope (user, 2026-10-22):** methods should come from the lecture slides, syllabus or rubric; only a few
  meaningful outside methods, each with a one-line reason (reference doc §5.8). Kept: expanding-window CV (shuffled
  K-fold leaks, +0.05–0.14 AUC), permutation importance (KNN has no coefficients), week-clustered SEs (sister rows;
  LR χ² 94 vs 22.4). M2-plan items (LR test, HAC, Brier, Diebold–Mariano) stay because M2 committed to them.
- **No tooling references in deliverables (user, 2026-10-25):** notebooks, code, reports and team docs never mention
  the session files; notebooks locate the project root via `requirements.txt`; no interactive estimator diagrams.
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
  - B14: H2 uses a difference regression on the training period, with windows ending by 2024 (notebook 04: H-1, H-2).
  - B15: H3 is tested as pre-stated, with the component split labelled exploratory.
  - B16: the test is used once; no re-tuning after seeing it (the audit respected this).
  - B17: a shock's driver is the largest *upward* PBS item impact (Combined index).
  - B18: the momentum-basket exception is disclosed.
  - B19: fixed seed 42, and the script reproduces the notebook.
- **Manuscript:** M3 = new sections only (user). Numbering continues M2. The style matches M2: black text, Times New
  Roman, no header or footer, three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Was M3 submitted on time (due 2026-10-24)?
- Keep the decision labels in the notebooks and code, or replace them with plain descriptions?
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
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline; built by `tools/build_reference_doc.js`).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`; `cleaning_report.txt`.
