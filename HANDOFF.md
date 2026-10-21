# HANDOFF

**Last updated:** 2026-10-21 (session 6)
**Session summary:** Built Milestone 3 end to end:
- baseline models (LR, KNN, shallow tree) with naive benchmarks, leakage-free expanding-window CV, cost-based
  thresholds, error analysis and feature importance (`notebooks/03_baseline_models.ipynb`, `src/models/`);
- tests of H1–H3 (`notebooks/04_hypothesis_tests.ipynb`);
- manuscript Sections IV–V (Word + PDF, 12 pp, 3,000 body words);
- the viva study guide `DS4SG_M3_Reference.docx`.

M3 is due **2026-10-24**.

## 1. Project overview
CS/SDP 312/314 project. Using the PBS weekly Sensitive Price Indicator (SPI, base 2015-16, 370 weeks, Sep 2019 – Oct 2026),
we build **an early-warning system for essential-price shocks for each consumption quintile** (Q1 poorest … Q5 richest)
and test whether it works as well for the poor as for the rich. SDGs 1, 2 and 10; the policy angle is timing BISP
top-ups.

Lens: the burden of inflation rotates. M3 refined it: **motor-fuel shocks hit Q5 harder; food, perishables and
utility-tariff shocks hit Q1 harder.**

## 2. Done so far
- **Sessions 1–3:** scaffolding, handoff hook, git; SPI archive scraped (370/370 weeks); SBP decisions, FX, Ramadan/Eid
  calendar; notebook 01 → `master_model_ready.csv`, `items_weekly_panel.csv`, `DATA_DICTIONARY.md`; collection audit.
- **Session 4:** quintile insights; narrative chosen; `build_features.py` → `master_features.csv` (2,220 × 105);
  notebook 02 (EDA, Figures E1–E5, hypotheses H1–H5).
- **Session 5:** team-verified Eid/Ramadan dates moved into the overrides file; pipeline re-run; M2 manuscript
  (Sections II–III). **M2 was submitted and got full marks** ("Good work"). The submitted files (team-edited PDF
  `M2_manuscript_draft (1).pdf`, 13 pp, and the two notebooks) are in `milestones/M2_data_eda_hypotheses/`. They are
  untracked: the user added them and they were not committed. The submitted PDF differs in wording from
  `tools/build_manuscript_m2.js`: the team edited it in Word.
- **Session 6 (2026-10-21): Milestone 3.**
  - **`src/models/baseline.py`:** all modelling code and decisions B1–B8 in its docstring. It covers:
    - the 18 features in blocks: own history, H1 signals, component momentum, controls, quintile dummies (Q5 = reference);
    - the chronological split and expanding-window folds (validation years 2021–24, whole weeks);
    - the three pipelines and grids;
    - `grid_search_time_cv()`, which selects by pooled out-of-fold AUC;
    - metrics, cost-based threshold, DeLong test, week-block bootstrap, clustered logit and `save_models()`.
  - **`src/models/train_baselines.py`:** a command-line run of the same steps (about 20 s). Its test predictions are
    identical to the notebook's (checked).
  - **`notebooks/03_baseline_models.ipynb`** (49 cells, runs cleanly in about 1.5 min), §1–§12: split and class balance;
    CV design (figB1) and leakage checklist; benchmarks; model justification and tuning (figB2); shuffled-CV leakage demo;
    test metrics with bootstrap CIs (figB3) and by quintile; asymmetric costs (figB4); confusion matrices (figB5);
    every test shock week with its driver; false-alarm profile; week-by-week forecasts (figB6); feature importance
    (figB7) and tree rules (figB8); H1 test; saved artifacts; findings, policy takeaways and M4 roadmap.
  - **`notebooks/04_hypothesis_tests.ipynb`:** H2 (Q5 − Q1 difference regression, HAC errors; figB9) and H3 (gap
    regression plus an exploratory component split; figB10). Training period only, so no 2025–26 data are used.
  - **Model artifacts:** `models/m3_baselines/{logistic_regression,knn,decision_tree}.joblib` and `model_card.json`.
  - **Tables:** `reports/tables/m3_*.csv` (24 files).
  - **Manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
    `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
    - Numbering continues M2: Section IV, Tables 14–23, Figs. 7–13, refs [11]–[21].
    - User instruction: **new sections only**. No word limit was given; it is held at 3,000 body words.
    - New refs: FAO Mongolia early action (US$7.1 per US$1), BISP Kafaalat Rs 13,500/quarter, scikit-learn, Bergmeir &
      Benítez, Elkan, Saito & Rehmsmeier, Sun & Xu, Breiman, Hastie et al., Moreno-Torres et al., Dawes.
  - **Reference doc:** `tools/build_m3_reference_doc.js` → `DS4SG_M3_Reference.docx` (root), in the same style as
    the project reference doc. Contents:
    - files, with function-by-function and section-by-section tables;
    - figures and tables;
    - a concepts glossary (simple + detailed);
    - 19 decisions B1–B19 (simple + detailed + alternatives + where in code);
    - key-numbers cheat sheet, 25 viva Q&As, and a files × steps matrix.

    The contents list is static and hyperlinked, so Word needs no field update.
  - `prepare_manuscript_figures.py` now also crops the M3 figures. CLAUDE.md now records the milestone status, the M3
    rubric weights and the `models/` and `tools/` folders.
  - **Headline results:**
    - **CV:** pooled AUC LR 0.643, KNN 0.643, tree 0.652, against 0.584 for persistence and 0.467 for the majority
      class. Shuffled K-fold would inflate AUC by 0.05–0.14.
    - **Test 2025–26:** KNN AUC 0.68 [0.47, 0.83], recall 20/35. Shocks were 7.7% vs 17.2% in training (prior
      shift), and at FN:FP = 5:1 no model beats "never alert" on cost (1.04–1.23). In 2021–24 the models were 33–39%
      cheaper than never alerting.
    - **Drivers:** rupee 8-week change (odds ratio 1.11 per 1%), recent shocks, food momentum; a fiscal-year start
      gives OR 5.3.
    - **Misses:** first waves, utility tariffs, perishables. False alarms follow past shocks.
    - **H1:** in sample, Wald (clustered) p = 0.001; out of sample on the test, DeLong p = 0.42.
    - **H2:** not supported (pass-through equal, δ = 0.04, p = 0.27).
    - **H3:** food is supported (β = 0.12, p = 0.003); energy is not (+0.04). The split shows motor fuel −0.07 and
      utility tariffs +0.03 (exploratory).
  - Commits: `0c29528` (models, notebooks), `4e0ae76` (manuscript), plus the final commit of this session (reference
    doc, CLAUDE.md, handoff).

## 3. Where we are now
- **M3 deliverables are complete:** notebooks 03 and 04 (both run cleanly), scripts in `src/models/`, models in
  `models/m3_baselines/`, the PDF manuscript and the reference/viva doc. They still need a team read-through.
- **Notebooks are now the source.** They were generated by builder scripts in a session scratchpad (not kept). Edit
  the notebooks directly from now on.
- **Rebuilding docs** needs the npm package `docx` (not in the project): `npm install docx` in any folder, then
  `NODE_PATH=<that folder>/node_modules node tools/build_manuscript_m3.js manuscript/M3_manuscript_sections_IV_V.docx`
  (same for `tools/build_m3_reference_doc.js DS4SG_M3_Reference.docx`).
- **Word automation (COM):**
  - `ExportAsFixedFormat` works when exporting to a folder outside the project.
  - This session it hung after the laptop lid was closed. The force-killed Word instances then left
    Document Recovery entries (`HKCU\Software\Microsoft\Office\16.0\Word\Resiliency\DocumentRecovery`), and new hidden
    instances hung (probably behind a recovery prompt). Opening Word once interactively and dismissing recovery should
    fix it; the registry was not touched.
  - Because of this, `DS4SG_M3_Reference.docx` was validated as XML (docx skill validator: all passed) but **not
    visually checked or exported to PDF**. Open it in Word once and skim the layout.
- **Known caveats (disclosed in the notebook and manuscript):**
  - the momentum-item basket was chosen on all training years, so it sees later CV folds (never the test);
  - the LR is shrunk to the grid edge (C = 1e-4), on a flat plateau; its probabilities are uncalibrated (Brier 0.24);
  - the test period has only 13 distinct shock weeks.
- Local commits are not pushed (user to push).

## 4. What's next
1. **By 2026-10-24 (M3 due):**
   - the team reads the PDF and the notebooks and fixes anything flagged: edit `tools/build_manuscript_m3.js`,
     rebuild, re-check `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx`, re-export;
   - submit the PDF, `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`,
     `src/models/baseline.py` and `src/models/train_baselines.py` (plus `models/m3_baselines/` if artifacts are
     uploaded);
   - late penalty: 20% within 24 h.
2. **Viva prep (5 minutes, V-factor):** every member studies `DS4SG_M3_Reference.docx` §6 (decisions), §7 (numbers)
   and §8 (Q&A), and re-runs notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.**
   - Ensembles (random forest, gradient boosting) under the same protocol (yearly folds, pooled-AUC selection,
     out-of-fold cost threshold).
   - H4: quintile-specific vs pooled models with signal × group interactions (LR test).
   - Calibration (Platt/isotonic, reliability plots).
   - New features: a NEPRA/OGRA tariff-notification calendar, OGRA fuel decisions, and a rolling shock-rate (regime)
     feature.
   - H5 fairness: Brier and miss rate Q1 vs Q5 with the Diebold–Mariano test, equal opportunity (recall parity), and
     welfare-weighted thresholds by quintile.
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
- **M3 modelling** (IDs as in `baseline.py` and the reference doc):
  - B1: Q1–Q5 rows only. Combined is excluded as a near-duplicate average.
  - B2: chronological split (train ≤ 2024, test 2025–26; 74.8/25.2), fixed in M2. A stratified random split was
    rejected because it would leak the future and split sister rows.
  - B3: expanding-window CV with K = 4 calendar years 2021–24 and whole weeks together; no gap is needed for a
    1-week target.
  - B4: scaling inside pipelines.
    - LR z-scores all features.
    - KNN scales only the continuous features, with the scaler tuned (z-score won); 0/1 flags pass through.
    - The tree is unscaled.
    - The M2 `*_z` columns are not used (they leak inside CV).
  - B5: selection by **pooled out-of-fold ROC-AUC**, because one threshold must work in every year. The mean ± SD
    per fold is reported too.
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: Q1 prices stay 4.2% higher 8 weeks after a shock, Rs 355/month ≈ 8% of Kafaalat, and FAO's
    7:1 return on early action.
  - B8: listwise deletion of 9 weeks.
  - B9: LR + KNN + shallow tree (the user chose this), with majority-class and persistence benchmarks.
  - B10: 18 features; only the 8-week FX change.
  - B11: grids were extended at their edges. LR uses saga, because liblinear penalises the intercept. KNN k ≤ 250,
    limited by fold 1's size.
  - B12: three importance measures. Permutation importance is computed on the CV folds, not the test. Odds ratios
    come from an unpenalised logit with week-clustered SEs.
  - B13: H1 is tested with a clustered Wald test, plus DeLong and a week-block bootstrap.
  - B14: H2 uses a difference regression on the training period, with windows ending by 2024.
  - B15: H3 is tested as pre-stated, with the component split labelled exploratory.
  - B16: the test is used once; no re-tuning after seeing it.
  - B17: a shock's driver is the largest *upward* PBS item impact.
  - B18: the momentum-basket exception is disclosed.
  - B19: fixed seed 42, and the script reproduces the notebook.
- **Manuscript:** M3 = new sections only (user). Numbering continues M2. The style matches M2: black text, Times New
  Roman, no header or footer, three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Does the team accept FN:FP = 5:1 as the headline cost ratio? This is a value judgement and the SDP members should
  sign off. The sensitivity analysis shows the conclusion holds at any ratio.
- Should M4 include walk-forward retraining already (it would address the prior shift), or leave it for M5 as
  planned?
- Should the submitted M2 files in `milestones/M2_data_eda_hypotheses/` be committed as the official record?
- Carry-overs:
  - Which source did Sarah use for the Eid/Ramadan dates (for citation)?
  - Extend the series back to Sep 2018 with the year-ago columns?
  - Register for SBP EasyData (official PKR/USD)?

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **M3 code:** `src/models/baseline.py`, `src/models/train_baselines.py`.
- **M3 notebooks:** `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`.
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv`.
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`.
