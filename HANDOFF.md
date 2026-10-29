# HANDOFF

**Last updated:** 2026-10-29 (session 9; committed and pushed)
**Session summary:** The instructor will examine M2 and M3 together in one viva, mostly with open "why" questions. Built
one combined viva guide (`DS4SG_Viva_Guide_M2_M3.docx`) and a sensitivity-check script for the numbers we had fixed by
judgement. No submitted result, model or notebook changed.

M3 was due **2026-10-24**; its submission status is still not recorded. **Only the report (PDF) and the notebooks are
submitted, never the scripts**, but the notebooks need `src/`, `data/processed/`, `reports/` and `requirements.txt`
next to them to run (user and team, 2026-10-25).

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
- **Session 6 (2026-10-21): Milestone 3 built.** `src/models/baseline.py`, `train_baselines.py`, notebooks 03 and 04,
  models in `models/m3_baselines/`, figures `figB1`–`figB10`, manuscript Sections IV–V.
- **Session 7 (2026-10-22): audit and lecture-scope pass.** Timing, folds, reproducibility and metrics verified; the
  oracle, DeLong test, Bayes-threshold formula and jargon removed; H1 out of sample uses the week-block bootstrap.
- **Session 8 (2026-10-25): clean-up, review and team merge** (commits `ffa0165`, `2169507`, `c08a481`, `4f68a42`,
  `ae84944`, all pushed). Notebooks find the root via `requirements.txt`; no pipeline diagram; no decision labels in
  notebooks 03–04; C below the grid checked (plateau); team review list (KNN wording, top-5 drivers Table 24, H3 caveat);
  the team's Google Docs edits merged into Section IV. Report 13 pages, 3,529 body words.
- **Session 9 (2026-10-26, pushed 2026-10-29): combined viva preparation for M2 and M3.**
  - **`DS4SG_Viva_Guide_M2_M3.docx`** (35 pages; `tools/build_viva_guide.js`): how to answer (four steps; tags "at the
    time" / "afterwards" / "not checked"); contributions table (roles pre-filled, last column for each member to fill
    in); tables of every chosen number with the alternatives checked (M2 18 rows, M3 14 rows) and of methods used vs not
    used; decision cards for M2 (scope, collection, D1–D5, P1–P7, F1–F4, eight EDA/hypothesis choices) and M3 (B1–B20)
    with say-this-first, detail, other options checked, why not, show it; key numbers; a 64-question bank grouped by
    question type; the after-submission checks.
  - **`src/models/sensitivity_checks.py`** (prints only, ~4 min). Findings: 1% shock = 85th percentile; 0.5% makes 37%
    of training rows shocks, 2% leaves no shock in 2024 and 4 test weeks; fuel cut-off sits in a gap (0.25–1% flag
    137–127 weeks); EDA cut-offs and the Eid window robust (momentum ≥ 3 spikes not significant); 8-week rupee window
    AUC 0.67 vs 13-week 0.68 (corr 0.76); 4-week SPI change best; momentum core stable (onions, potatoes always); H2/H3
    robust to HAC lags 1–16; seeds and bootstrap size do not matter. **Two defaults were not the best in CV:** entropy
    (tree within-year 0.651 vs Gini 0.578) and Manhattan distance (KNN pooled 0.670 at k = 150 vs 0.643). Not applied
    to M3 (test already seen); M4 grids should include them.
  - `DS4SG_M3_Reference.docx` now holds files, run order, concepts and limitations only (its old decisions, numbers
    and viva sections moved into the viva guide; it lists the new script and builder). The script reference doc
    points to the viva guide. README and CLAUDE.md point to it too.

## 3. Where we are now
- **M2 and M3 deliverables are complete; viva preparation is in one document.** Nothing submitted was changed.
- **All session 9 work is committed and pushed** (2026-10-29). Still untracked on purpose: `docs/` (team Google Docs
  export) and the submitted M2 files in `milestones/M2_data_eda_hypotheses/` (open question below).
- **Methods beyond the slides (viva guide §4.3):** expanding-window CV, permutation importance, week-clustered errors
  (M3); Spearman correlation and Fisher's exact test (M2); logit LR test, HAC errors, Brier score (M2 plan);
  Diebold–Mariano (M4 plan). Entropy and Manhattan distance ARE in the slides (Units 09 and 11).
- **Decision labels are our own bookkeeping IDs, not course terms**; not in the manuscripts or the M3 notebooks. D1–D5:
  `build_master.py`; P1–P7: notebook 01 §4; F1–F4: `build_features.py`; B1–B8: `baseline.py`; B9–B20 only in the viva
  guide. Figures are also numbered B1–B10; "Figure B1" is not "decision B1".
- **Repo-level session files stay** (CLAUDE.md, HANDOFF.md, logs/, .claude/, .claudeignore): the repo is for the team.
- **Rebuilding docs:** `NODE_PATH=<folder with node_modules/docx> node tools/build_viva_guide.js
  DS4SG_Viva_Guide_M2_M3.docx` (same pattern for `build_m3_reference_doc.js`, `build_reference_doc.js`,
  `build_manuscript_m3.js`). Close the file in Word first (EBUSY). The script reference doc has a Word TOC field: update
  it in Word after rebuilding; the other two have static contents lists.
- **Word automation (COM):** a NEW hidden instance only; a failed start can leave a window-less WINWORD (stop only that
  PID, retry); use `$w.Quit()`. Never touch the user's own Word process.
- **Known caveats (disclosed):** momentum basket chosen on all training years; LR at the grid edge (a plateau) and
  uncalibrated (Brier 0.24); only 13 test shock weeks; pooled AUC flattered the tree; Gini and Euclidean defaults not
  tuned (found afterwards).

## 4. What's next
1. **Viva (M2 + M3):** each member fills in their row of the viva guide §2 and agrees it with the team; study §3–§6,
   quiz with §8, read §9; run notebooks 01–04 and `python src/models/sensitivity_checks.py` once.
2. **M3 (due 2026-10-24):** confirm it was submitted.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.** Methods within the lectures/syllabus where possible;
   notebook in plain wording (no labels, tooling references or estimator diagrams); manuscript in the team's style.
   - Ensembles (random forest, gradient boosting) under the same protocol; report within-year AUC next to pooled AUC
     and fix the selection criterion before looking at the test.
   - Add the tree's split criterion (Gini/entropy) and KNN's distance (Euclidean/Manhattan) to the grids.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (probabilities that match observed shock rates; Brier score).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock rate.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano, planned in M2), equal recall, quintile thresholds.
   - Ethics: self-fulfilling warnings, transparency, rural exclusion. Consider re-selecting the momentum basket per fold.
   - Add the M4 decisions and numbers to the same viva guide (extend, do not start a new one).
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
  each with a one-line reason (viva guide §4.3).
- **Submitted work is plain (user, 2026-10-25):** no session-file references, no estimator diagrams, no decision labels
  in the current milestone's notebooks.
- **Viva preparation (user, 2026-10-26):** one combined guide for M2 and M3. Checks run after a submission are labelled
  "afterwards" and never presented as part of the original decision; they change no submitted result (choosing with
  hindsight would be tuning on the results).
- **Report style (team, 2026-10-25):** commas or words instead of colons/semicolons, "instead of" not "rather than",
  no code names in prose. Session 8's new Section V text still uses the older style.
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
  - B19 seed 42; the script reproduces the notebook byte for byte. B20 Gini and Euclidean left at defaults (afterwards
    check: alternatives slightly better in CV; for M4).
- **Manuscript:** M3 = new sections only. Numbering continues M2. Black text, Times New Roman, no header or footer,
  three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Was M3 submitted on time (due 2026-10-24)?
- Each member's contributions for the viva guide §2 (only roles are pre-filled).
- Apply the team's prose style to the rest of the report (Sections IV-C onwards and the session 8 Section V additions)?
- Does the team accept FN:FP = 5:1 as the headline cost ratio (a value judgement for the SDP members)?
- M4 selection criterion: pooled AUC, within-year AUC, or both? Fix it before the M4 test evaluation.
- Walk-forward retraining in M4 already, or in M5 as planned?
- Commit the submitted M2 files and the team's Google Docs export (`docs/`) as records?
- Carry-overs: Sarah's source for the Eid/Ramadan dates; extend the series to Sep 2018; SBP EasyData registration.

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **Lecture slides:** `course/lecture_slides/` Units 01–11 (not in git); syllabus in `course/syllabus/`.
- **Viva guide (M2 + M3):** `DS4SG_Viva_Guide_M2_M3.docx` ← `tools/build_viva_guide.js`; checks in
  `src/models/sensitivity_checks.py`.
- **References:** `DS4SG_M3_Reference.docx` ← `tools/build_m3_reference_doc.js` (M3 files, concepts);
  `DS4SG_Script_and_Data_Reference.docx` ← `tools/build_reference_doc.js` (M1–M2 pipeline).
- **M3 code:** `src/models/baseline.py`, `src/models/train_baselines.py`.
- **M3 notebooks:** `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`.
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv` (24 files).
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`. Team version: `docs/M3_manuscript_sections_IV_V_team.docx`.
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`; `cleaning_report.txt`.
