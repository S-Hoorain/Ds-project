# HANDOFF

**Last updated:** 2026-11-10 (session 10; committed and pushed)
**Session summary:** Milestone 4 built end to end (notebooks 05–06, `src/models/advanced.py`, manuscript Sections
VI–VIII, M4 reference doc). Then, at the user's request, every M4 number fixed by judgement was checked against
alternatives (`src/models/sensitivity_checks_m4.py`) and the results were added to the viva guide (new Section 11).
M4 was due 10 Nov; the class asked for an extension.

M3 was submitted (files in `milestones/M3_baseline_model/`; the submitted PDF matches our build except layout and one
word). **Only the report (PDF) and the notebooks are submitted**, never the scripts.

## 1. Project overview
CS/SDP 312/314 project. Using the PBS weekly Sensitive Price Indicator (SPI, base 2015-16, 370 weeks, Sep 2019 – Oct 2026),
we build **an early-warning system for essential-price shocks for each consumption quintile** (Q1 poorest … Q5 richest)
and test whether it works as well for the poor as for the rich. SDGs 1, 2 and 10; the policy angle is timing BISP
top-ups. Lens: the burden rotates (motor fuel hits Q5, food and perishables hit Q1). M4 adds the fairness view: the
model ranks Q1's weeks worse because Q1's shocks are more often perishable-driven, the shock type with no lead signal.

## 2. Done so far
- **Sessions 1–5:** scaffolding, handoff hook, scraping (370/370 weeks), SBP, FX, Eid/Ramadan calendar; notebook 01 →
  `master_model_ready.csv`; `build_features.py` → `master_features.csv`; notebook 02 (EDA, H1–H5). **M2 full marks.**
- **Sessions 6–8:** M3 (`baseline.py`, notebooks 03–04, Sections IV–V); audit, lecture-scope pass, team merge.
- **Session 9:** combined M2+M3 viva guide; `sensitivity_checks.py` (found Gini and Euclidean defaults not best).
- **Session 10 (2026-11-10): Milestone 4.**
  - **User decisions (10 Nov):** manuscript = new sections only (VI–VIII); hyperparameter selection by **within-year
    AUC**; models = **random forest + gradient boosting**; final model = **random forest** (KNN 0.683 vs forest 0.678
    a tie; KNN cannot take row weights, which pre-/in-processing mitigation need).
  - **My calls (flagged to the user):** new features only from existing data (`shock_rate_26w`, `july_next_week`);
    NEPRA/OGRA dates moved to M5; a missed Q1 shock counts 2× (sensitivity 1–3×); equal-opportunity tolerance 0.05;
    the test period called a "second look".
  - **Code:** `src/models/advanced.py` (A1–A6, R1–R4 in the docstring). `baseline.py` unchanged.
  - **Notebook 05** (~20 min): features (A1), folds, five grids, tuning (A2), M3 vs M4 comparison (A3), ablation,
    leakage check, threshold curves (A4), calibration (A5), H4, permutation importance (A6); saves `models/m4_advanced/`.
  - **Notebook 06** (~3 min): attribute, fairness metrics, bootstrap (F1), H5, drivers, mitigation, Pareto (F2),
    asymmetric thresholds (F3), recommended policy, FATEN, living lab.
  - **Manuscript:** Tables 25–34, Figs. 14–19, refs [18]–[25]; 14 pages, 4,763 body words; PDF in
    `milestones/M4_advanced_model/`.
  - **Docs:** `DS4SG_M4_Reference.docx` (17 pp), `DS4SG_Viva_Guide_M2_M4.docx` (47 pp; §3.3, §4.3, §7 cards A1–A9
    and R1–R6, §8.3, §9.6, **§11 checks of the M4 choices**). `milestones/M4_advanced_model/M4_rubric.md`.
  - **Checks of the fixed M4 numbers** (`src/models/sensitivity_checks_m4.py`, ~6 min, prints only, run after the
    analysis was final; tagged "Afterwards (10 Nov)" in the guide): window 13/26/52 (0.679/0.678/0.684), trees
    100–1000 (0.677–0.678), seeds (0.676–0.682; test cost 1.00–1.12), boosting beyond edge (0.634 plateau), KNN k = 275
    (0.690, still a tie), pooled rule (forest still final), in-processing weights 1–3, tolerance 0.03–0.10 (0.05 is where
    cost flattens), step 0.005 (same), bottom/top 40% (same picture), bootstrap size, permutation repeats (same top 5),
    **run-to-run fairness variation** (see §3).

## 3. Where we are now
- **M4 deliverables are complete:** both notebooks execute top to bottom with no errors or warnings; every manuscript
  number traces to `reports/tables/m4_*.csv`; deliverables scanned clean of tool traces.
- **Open issue found by the checks (not yet fixed in the deliverables, user to decide):** the forest's fairness gaps
  move with the random seed. Over five seeds Q1's recall is 2.6 to 10.5 points below Q5's (mean 7.4); seed 42 (ours)
  gave the smallest gap. With row weights sklearn's forest draws bootstrap samples differently, so the fair baseline
  for reweighing and weighted training is a forest with all weights 1. Against it, both narrow the gap by 3–4 points on
  average, within seed noise. Notebook 06 (§6 reading) and manuscript VII-F say "reweighing widened the gap" and
  "weighted training evens out recall": true for seed 42 only. Post-processing results are unaffected (same
  predictions). Suggested fix: one caveat sentence in each, plus "Q1's recall is below Q5's in every seed we tried".
- **Headline results:** CV within-year AUC LR 0.640, KNN 0.683, tree 0.657, forest 0.678, boosting 0.635 (tied). Test
  forest 0.674 vs M3 KNN 0.679. Shuffled stratified K-fold 0.83 vs ours 0.68. No threshold beats "never alert" in
  2025–26 (break-even precision 1/6, best 0.153). New features did not improve ranking. H4 not supported (p = 0.067).
  DI 1.05; EOD −0.026 (seed 42); AUC within group Q1 0.64 vs Q5 0.72; H5 not supported (p = 0.26). Perishables drive
  42% of Q1's shocks vs 24% of Q5's. Equal-opportunity thresholds fairer and cheaper than a shared threshold (gap
  0.05 vs 0.13, cost 0.637 vs 0.651).
- **Known caveats (disclosed):** test period is a second look; boosting rate and trees at the grid edge (plateau
  beyond); KNN k = 250 at the edge (275 slightly better); final-model rule decided after the CV tie; seed noise.
- **Not committed on purpose:** Assignment 2 working-tree changes (pre-existing), `docs/`, submitted M2/M3 files in
  `milestones/`, `assignments/assignment 1/`, `assignments/drive/`, the A2 rar.
- **Rebuilding:** `python tools/build_m4_notebooks.py`, then nbconvert both notebooks (docstring);
  `python tools/build_m4_notebooks.py text` refreshes text cells only (refuses if code changed). Then
  `python tools/prepare_manuscript_figures.py`, `python tools/collect_m4_numbers.py`, and
  `NODE_PATH=<folder>/node_modules node tools/build_manuscript_m4.js manuscript/M4_manuscript_sections_VI_VIII.docx`
  (same for `build_m4_reference_doc.js`, `build_viva_guide.js`). PDF via a NEW hidden Word instance
  (`ExportAsFixedFormat(path, 17)`), never the user's Word. `npm install docx@9.5.1` in any folder for NODE_PATH.
- **Harness quirk:** bash heredocs with quotes or `${` sometimes fail; write patch scripts with the file tool. A `\n`
  inside a heredoc-written Python string became a real newline twice: check after edits.

## 4. What's next
1. **Decide on the seed-noise caveat** (§3) for notebook 06 and manuscript VII-F before submitting; if yes, edit the
   text in `tools/nb_text_m4_results.py` and `tools/build_manuscript_m4.js`, refresh notebook text, rebuild the PDF.
2. **Submit M4:** the PDF in `milestones/M4_advanced_model/` and notebooks 05 and 06 (they need `src/`,
   `data/processed/`, `models/`, `reports/` and `requirements.txt` next to them).
3. **Team review:** SDP members confirm the value judgements (5:1; Q1 miss 2×; recommended policy) and FATEN/living-lab
   text; fill in viva guide §2.
4. **Viva prep:** viva guide §3.3, §4.3, §7, §8.3, §9.6, §11; run notebooks 05–06 and `sensitivity_checks_m4.py` once.
5. **M5 (Week 14, Nov 16–20): new data integration and re-training.** New weekly SPI releases since Oct 2026 (clean
   test); walk-forward retraining and threshold re-choice by regime; NEPRA/OGRA calendar or wholesale perishable prices;
   re-test the M4 features; repeat the fairness audit, averaging over several seeds.
6. Carry-overs: Eid ul-Adha 2026 (27 May) in the overrides file; abstract, introduction, literature review.

## 5. Decisions & rationale
- **Data (M2):** D1 report dates → nearest Thursday; D2 gaps from next report; D3 revised figures; D4 weekly average
  PKR/USD; D5 fuel-revision week > 1%. F1 shock = weekly SPI rise ≥ 1%; F2 fuel reviews 1st/16th; F3 momentum items
  from training weeks; F4 component inflation Combined-weighted. Sample Sep 2019 – Oct 2026; outliers kept.
- **M3 (B1–B20):** Q1–Q5 rows; chronological split (≤ 2024 / 2025–26); expanding window, 4 yearly folds, whole weeks;
  scaling inside pipelines; pooled-AUC selection (M3 only); no resampling; threshold at 5:1 on OOF; listwise deletion;
  three learners + two benchmarks; week-block bootstrap; seed 42.
- **M4 (A1–A9, R1–R6; all in viva guide §7):** RF + GB with M3 learners re-tuned; within-year AUC (team); two derived
  features (test-inspired, disclosed); Gini/entropy and Euclidean/Manhattan in grids; time-ordered folds with
  stratification's purpose checked; final model = best within-year AUC among learners taking row weights (team); test
  = second look; same threshold rule; H4 with week-clustered Wald. Quintile = sensitive attribute, alarm = favourable
  outcome; audit on 2021–24 OOF with bootstrap; equal opportunity as main criterion; three mitigation families; Q1 miss
  2× (value judgement); recommended policy = equal-opportunity quintile thresholds, Q1 × 2 as the equity option.
- **Checks after the analysis never change a result** (choosing with hindsight would be tuning on results); they are
  tagged "Afterwards" in the viva guide, as for M3.
- **Lecture scope:** ensembles (Week 12), fairness (Week 15 + brief). Outside methods in viva guide §4.4: reweighing,
  exact Pareto search, Diebold–Mariano, plus M3's permutation importance, clustered errors, HAC.
- **Manuscript:** new sections only; numbering continues; black text, Times New Roman, no header/footer; team style.

## 6. Open questions
- Add the seed-noise caveat to notebook 06 and manuscript VII-F before submitting? (§3)
- Was the M4 extension granted, and to when?
- Do the SDP members accept the Q1 miss weight (2×) and the recommended policy?
- Each member's contributions for viva guide §2.
- M5: which new data source first (tariff calendar vs perishable wholesale prices)?
- Commit the submitted M2/M3 files in `milestones/` and the team's `docs/` export as records?
- Carry-overs: Sarah's source for the Eid/Ramadan dates; extend the series to Sep 2018; SBP EasyData registration.

## 7. Key files
- `CLAUDE.md`; rubrics in `milestones/*/` (M4: `milestones/M4_advanced_model/M4_rubric.md`).
- **M4 code:** `src/models/advanced.py`; checks `src/models/sensitivity_checks_m4.py` (M3: `sensitivity_checks.py`).
- **M4 notebooks:** `notebooks/05_advanced_models.ipynb`, `notebooks/06_fairness_audit.ipynb`; builders
  `tools/build_m4_notebooks.py`, `tools/nb05_code.py`, `tools/nb06_code.py`, `tools/nb_text_m4.py`,
  `tools/nb_text_m4_results.py`, `tools/nbtools.py`.
- **M4 outputs:** `models/m4_advanced/`, `reports/figures/figA1`–`figA6`, `figF1`–`figF3`, `reports/tables/m4_*.csv`.
- **M4 manuscript:** `tools/build_manuscript_m4.js` (+ `m4_manuscript_vi/vii/viii.js`, `collect_m4_numbers.py`) →
  `manuscript/M4_manuscript_sections_VI_VIII.docx` → `milestones/M4_advanced_model/M4_manuscript_sections_VI_VIII.pdf`.
- **Docs:** `DS4SG_M4_Reference.docx` (`tools/build_m4_reference_doc.js` + `m4_reference_*.js`),
  `DS4SG_Viva_Guide_M2_M4.docx` (`tools/build_viva_guide.js` + `tools/viva_m4_content.js`), M3 and M1–M2 references.
- **M3:** `src/models/baseline.py`, `train_baselines.py`, notebooks 03–04, `models/m3_baselines/`.
- **Data:** `data/processed/master_features.csv` (+ `FEATURES_DICTIONARY.md`), `items_weekly_panel.csv`.
