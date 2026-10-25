# HANDOFF

**Last updated:** 2026-10-25 (session 8)
**Session summary:** Cleaned the deliverables (no tooling references, no decision labels or estimator diagram in
notebooks 03–04), added a check of C below the grid, worked through a team member's review list, and merged the team's
Google Docs edits into the report. No model, threshold or existing result changed.

M3 was due **2026-10-24**; its submission status was not recorded this session. **Only the report (PDF) and the
notebooks are submitted, never the scripts**, but the notebooks need `src/`, `data/processed/`, `reports/` and
`requirements.txt` next to them to run (user and team, 2026-10-25).

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
- **Session 6 (2026-10-21): Milestone 3 built.** `src/models/baseline.py`, `src/models/train_baselines.py`, notebooks
  03 (models) and 04 (H2, H3), models in `models/m3_baselines/`, figures `figB1`–`figB10`, manuscript Sections IV–V,
  viva guide `DS4SG_M3_Reference.docx`.
- **Session 7 (2026-10-22): audit and lecture-scope pass** (commits `1092762`, `b464a62`, `7d341d7`; all pushed).
  Audit verified timing, folds, reproducibility and every metric; lecture scope removed the oracle, the DeLong test,
  the Bayes-threshold formula and jargon; H1 out of sample uses the week-block bootstrap (p = 0.45).
- **Session 8 (2026-10-25): clean-up, review and team merge.**
  - Deliverables: notebooks find the root via `requirements.txt` (not `CLAUDE.md`); script reference doc lists no
    session files; notebook 03's interactive pipeline diagram removed; decision labels in notebooks 03–04 replaced by
    plain wording (labels stay in scripts and reference docs; notebooks 01–02 untouched). Commits `ffa0165`,
    `2169507`, `c08a481` (pushed).
  - **C below the grid** (notebook 03 §4, new check cell): C = 0.00003 / 0.00001 give pooled AUC 0.644 / 0.643 and
    within-year 0.652 (vs 0.643 / 0.651 at the selected 0.0001); probabilities squeeze to 0.495–0.511. Plateau, so C
    stays 0.0001 (re-tuning after the test would break use-once).
  - **Team review list** (commit `4f68a42`):
    - "KNN generalised best" replaced everywhere. The paired week-block bootstrap shows KNN beat LR (+0.11, 95% CI
      +0.02 to +0.22) but not clearly the tree (+0.14, −0.04 to +0.29), so the teammate's "intervals overlap, can't
      claim better" was too weak against LR; text says highest AUC, not "best model".
    - Top-5 drivers (perishables, recent shocks, 4-week SPI change, rupee, motor fuel) with one policy implication
      each: notebook 03 §9 (`m3_top5_drivers.csv`, 24 tables now) and report Table 24 (Section V-G).
    - H3 caveat (the gap is built from basket weights; food ≈ 57% of Q1's estimated basket vs 43% of Q5's; motor fuel
      3% vs 11%): notebook 04, report V-F, viva guide. Notebook 04 retitled "supporting analysis for Milestone 3".
    - Split notes point to §5 (shuffled stratified K-fold) for the stratified-sampling rubric item.
    - Both notebooks re-run in place; all existing outputs byte-identical; `train_baselines.py` reproduces them exactly.
  - **Team Google Docs merge:** `docs/M3_manuscript_sections_IV_V_team.docx` (untracked) was based on `7d341d7`. Its 10
    edits (Section IV prose and Tables 14–15: commas instead of colons/semicolons, "instead of", "about 75/25", no
    `target_shock_next`, shorter cost paragraph, one scaling sentence removed) are applied in
    `tools/build_manuscript_m3.js`, keeping all later Section V edits. Two deviations: "class weights, which is a
    cost-based alarm threshold" (changed the meaning) kept as a list; "1805" kept as "1,805".
  - Report: 13 pages, 3,529 body words. Viva guide rebuilt (C check, KNN paired comparison, H3 caveat, top-5 drivers,
    three new viva questions).

## 3. Where we are now
- **M3 deliverables are complete, audited, lecture-scoped, team-reviewed and free of tooling references.**
- **Methods kept from beyond the slides:** expanding-window CV, permutation importance, standard errors clustered by
  week; carried from the M2 plan: logit LR test, OLS with HAC errors, Brier score, Diebold–Mariano (M4 plan only).
- **Decision labels are our own bookkeeping IDs, not course terms**; not in the manuscripts or the M3 notebooks. In a
  viva, explain the choice, not the label. D1–D5: `build_master.py` docstring and notebook 01 §4; P1–P7: notebook 01
  §4; F1–F4: `build_features.py` docstring; B1–B8: `baseline.py` docstring, B1–B19 in the viva guide §6 and §5 below.
  Figures are also numbered B1–B10; "Figure B1" is not "decision B1".
- **Repo-level session files stay** (CLAUDE.md, HANDOFF.md, logs/, .claude/, .claudeignore): the repo is for the team
  only (user, 2026-10-25). The M2 notebook copies in `milestones/M2_data_eda_hypotheses/` are left as submitted.
- **Rebuilding docs:** `NODE_PATH=<folder with node_modules/docx> node tools/build_manuscript_m3.js
  manuscript/M3_manuscript_sections_IV_V.docx` (same for `build_m3_reference_doc.js`, `build_reference_doc.js`;
  `npm install docx` in any folder). Close the file in Word first (EBUSY). Then `python tools/word_count_body.py` and a
  PDF export through Word.
- **Word automation (COM):** a NEW hidden instance only; a failed start can leave a window-less WINWORD (stop only that
  PID, retry); use `$w.Quit()`. Never touch the user's own Word process.
- **Known caveats (disclosed):** momentum basket chosen on all training years; LR at the grid edge (now shown to be a
  plateau) and uncalibrated (Brier 0.24); only 13 test shock weeks; pooled AUC flattered the tree; edge-case drivers
  use Combined-index item impacts.
- Commit with the team merge is local until pushed.

## 4. What's next
1. **M3 (due 2026-10-24):** confirm it was submitted: the PDF plus notebooks 03 and 04, with `src/`,
   `data/processed/`, `reports/` and `requirements.txt` so they run.
2. **Viva prep (5 minutes, V-factor):** study the viva guide §5.8, §6, §7 and §8 (now with "Is KNN your best model?",
   "Would a stronger penalty do better?" and "Isn't H3 built in?"); re-run notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.** Methods within the lectures/syllabus where possible;
   notebook in plain wording (no labels, tooling references or estimator diagrams); manuscript in the team's style.
   - Ensembles (random forest, gradient boosting) under the same protocol; report within-year AUC next to pooled AUC
     and fix the selection criterion before looking at the test.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (probabilities that match observed shock rates; Brier score).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock rate.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano, planned in M2), equal recall, quintile thresholds.
   - Ethics: self-fulfilling warnings, transparency, rural exclusion. Consider re-selecting the momentum basket per fold.
4. **M5 (Week 14):** walk-forward retraining with new weekly releases; measure how fast the thresholds adapt.
5. Carry-overs: verify Eid ul-Adha 2026 (27 May) in the overrides file; write the abstract, introduction and
   literature review for the final paper.

## 5. Decisions & rationale
- **Data (M2), labels as in `build_master.py` / `build_features.py`:** D1 printed report dates, aligned to the nearest
  Thursday; D2 missing weeks filled from the next report's official previous-week value; D3 PBS revisions use the
  revised figure; D4 weekly (Fri–Thu) average PKR/USD without bad ticks; D5 fuel-revision week = petrol or diesel moved
  > 1%. F1 shock = weekly SPI rise ≥ 1%; F2 fuel reviews on the 1st and 16th; F3 momentum items from training weeks
  only; F4 component inflation Combined-weighted. Sample 5 Sep 2019 – 1 Oct 2026; outliers kept; signals known at the
  end of week t.
- **Lecture scope (user, 2026-10-22):** methods from the slides, syllabus or rubric; a few meaningful outside methods,
  each with a one-line reason (viva guide §5.8). M2-plan items stay because M2 committed to them.
- **Submitted work is plain (user, 2026-10-25):** no session-file references, no estimator diagrams, no decision labels
  in the current milestone's notebooks.
- **Report style (team, 2026-10-25):** commas or words instead of colons/semicolons, "instead of" not "rather than",
  no code names in prose. Today's new Section V text (plateau sentence, KNN comparison, H3 caveat, Table 24) still uses
  the older style.
- **M3 modelling** (IDs as in `baseline.py` and the viva guide):
  - B1 Q1–Q5 rows only. B2 chronological split (train ≤ 2024, test 2025–26; about 75/25), fixed in M2.
  - B3 expanding-window CV, K = 4 calendar years 2021–24, whole weeks together, no gap.
  - B4 scaling inside pipelines (LR z-scores all; KNN scales continuous only; tree unscaled).
  - B5 selection by pooled out-of-fold ROC-AUC (kept as planned despite rewarding regime tracking).
  - B6 no resampling; class weights, cost threshold and imbalance-aware metrics.
  - B7 threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions; ratios 1–20 reported.
  - B8 listwise deletion of 9 weeks. B9 LR + KNN + shallow tree with two benchmarks. B10 18 features.
  - B11 grids extended at their edges; LR's C = 0.0001 is a checked plateau (smaller C changes AUC ≤ 0.001).
  - B12 three importance measures; permutation on CV folds; odds ratios from an unpenalised clustered logit.
  - B13 H1: clustered Wald in sample, week-block bootstrap out of sample (DeLong replaced).
  - B14 H2 difference regression on the training period. B15 H3 as pre-stated, split exploratory, coefficients
    descriptive (the gap is built from basket weights).
  - B16 test used once. B17 shock driver = largest upward item impact. B18 momentum-basket exception disclosed.
  - B19 seed 42; the script reproduces the notebook byte for byte.
- **Manuscript:** M3 = new sections only. Numbering continues M2. Black text, Times New Roman, no header or footer,
  three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Was M3 submitted on time (due 2026-10-24)?
- Apply the team's prose style to the rest of the report (Sections IV-C onwards and today's Section V additions)?
- Does the team accept FN:FP = 5:1 as the headline cost ratio (a value judgement for the SDP members)?
- M4 selection criterion: pooled AUC, within-year AUC, or both? Fix it before the M4 test evaluation.
- Walk-forward retraining in M4 already, or in M5 as planned?
- Commit the submitted M2 files and the team's Google Docs export (`docs/`) as records?
- Carry-overs: Sarah's source for the Eid/Ramadan dates; extend the series to Sep 2018; SBP EasyData registration.

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **Lecture slides:** `course/lecture_slides/` Units 01–11 (not in git); syllabus in `course/syllabus/`.
- **M3 code:** `src/models/baseline.py`, `src/models/train_baselines.py`.
- **M3 notebooks:** `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`.
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv` (24 files).
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`. Team version: `docs/M3_manuscript_sections_IV_V_team.docx`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline; built by `tools/build_reference_doc.js`).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`; `cleaning_report.txt`.
