# HANDOFF

**Last updated:** 2026-11-12 (session 11; committed and pushed)
**Session summary:** The M4 report was shortened from 7,106 to 4,541 words (everything counted, PDF text; Word counts
4,575), 14 → 10 pages, to match the length of the M2 (4,159) and M3 (5,454) reports. The seed-noise caveat was added
to Section VII-F, and the viva guide was updated to match. Earlier, in session 10 (10 Nov), M4 was built end to end and
every fixed M4 number was checked. M4 was due 10 Nov; the class asked for an extension.

M3 was submitted (files in `milestones/M3_baseline_model/`). **Only the report (PDF) and the notebooks are submitted**,
never the scripts.

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
  - **User decisions:** manuscript = new sections only (VI–VIII); selection by **within-year AUC**; models = **random
    forest + gradient boosting**; final model = **random forest** (KNN 0.683 vs forest 0.678 a tie; KNN cannot take row
    weights, which pre-/in-processing mitigation need).
  - **My calls (flagged):** new features from existing data only (`shock_rate_26w`, `july_next_week`); NEPRA/OGRA
    dates moved to M5; a missed Q1 shock counts 2× (sensitivity 1–3×); equal-opportunity tolerance 0.05.
  - **Code:** `src/models/advanced.py` (A1–A6, R1–R4 in the docstring). Notebook 05 (~20 min), notebook 06 (~3 min).
  - **Docs:** `DS4SG_M4_Reference.docx` (17 pp), `DS4SG_Viva_Guide_M2_M4.docx` (47 pp; §3.3, §4.3, §7 cards A1–A9 and
    R1–R6, §8.3, §9.6, **§11 checks of the M4 choices**). `milestones/M4_advanced_model/M4_rubric.md`.
  - **Checks of the fixed M4 numbers** (`src/models/sensitivity_checks_m4.py`, ~6 min, prints only; tagged
    "Afterwards (10 Nov)"): window, trees, seeds, boosting beyond the edge, KNN k = 275 (0.690, still a tie), pooled
    rule, in-processing weights 1–3, tolerance 0.03–0.10, threshold step, bottom/top 40%, bootstrap size, permutation
    repeats, run-to-run fairness variation (five seeds).
- **Session 11 (2026-11-12): report shortened, caveat added.**
  - User asked for the M4 report under 5,000 words "everything combined". Now **4,541 words** (pdftotext, incl.
    tables, captions, references) and **4,575** (Word's count), 10 pages. All subsections, tables 25–34 and figs. 14–19
    kept with the same numbers, so the viva guide and `M4_rubric.md` map are still right. No number changed.
  - How: every paragraph, caption and table cell tightened; Table 32 now one row per Q1 weight (1.5× and 2× share a
    row, identical results) with test values in brackets; table labels shortened in `collect_m4_numbers.py`; the
    reference list now holds only the works cited in VI–VIII ([10], [17]–[25]), picked automatically by the builder
    from the citations in the text (M3 listed all of [1]–[17]).
  - Cut from the report (still in the notebooks and the viva guide): the tree's higher test AUC (0.687) argument, why
    the clustered H4 statistic is larger, the forest being steadier across years with the new features, the long
    explanations of the RF/GB architectures and the Q1 false-positive detail of the Q1-weighted thresholds.
  - **Seed caveat added to VII-F** (user approved): reweighing now "changes almost nothing" (no "widened the gap");
    the Q1 × 2 results "hold for our random seed only"; over five seeds both narrow the gap by 3–4 points against a
    forest with equal weights, within seed variation; the unweighted forest's Q1 recall is below Q5's in every seed
    (2.6 to 10.5 points); post-processing avoids the problem.
  - Viva guide: the "Afterwards (10 Nov)" tag now says the report mentions only the seed check (VII-F); §11 and the
    R-card note the report caveat. Rebuilt `DS4SG_Viva_Guide_M2_M4.docx`.

## 3. Where we are now
- **M4 deliverables are complete:** notebooks 05–06 execute top to bottom; the report PDF is in
  `milestones/M4_advanced_model/`; every report number traces to `reports/tables/m4_*.csv` or the checks script.
- **Notebook 06 still has the seed-42 sentences** (§6 reading: "reweighing widened the gap", "weighted training evens
  out recall"). The user asked for the caveat in the report only. The notebook and report now differ in tone on this
  point; the viva guide (§11, R-cards) explains both.
- **Known pre-existing layout point:** the M4 figure images carry their own titles ("Figure A1. …", "Figure F2. …")
  above report captions numbered Fig. 14–19. The M3 figures had titles without letter labels. Not changed (offered).
- **Headline results:** CV within-year AUC LR 0.640, KNN 0.683, tree 0.657, forest 0.678, boosting 0.635 (tied). Test
  forest 0.674 vs M3 KNN 0.679. Shuffled stratified K-fold 0.83 vs ours 0.68. No threshold beats "never alert" in
  2025–26 (break-even precision 1/6, best 0.153). New features did not improve ranking. H4 not supported (p = 0.067).
  DI 1.05; EOD −0.026 (seed 42; −0.105 to −0.026 over five seeds); AUC within group Q1 0.64 vs Q5 0.72; H5 not
  supported (p = 0.26). Perishables drive 42% of Q1's shocks vs 24% of Q5's. Equal-opportunity thresholds fairer and
  cheaper than a shared threshold (gap 0.05 vs 0.13, cost 0.637 vs 0.651).
- **Known caveats (disclosed):** test period is a second look; boosting rate and trees at the grid edge; KNN k = 250 at
  the edge; final-model rule decided after the CV tie; seed noise in pre-/in-processing results.
- **Not committed on purpose:** Assignment 2 working-tree changes (pre-existing), `docs/`, submitted M2/M3 files in
  `milestones/`, `assignments/assignment 1/`, `assignments/drive/`, the A2 rar.
- **Rebuilding:** `python tools/build_m4_notebooks.py`, then nbconvert both notebooks (docstring);
  `python tools/build_m4_notebooks.py text` refreshes text cells only. Then `python tools/prepare_manuscript_figures.py`,
  `python tools/collect_m4_numbers.py`, and
  `NODE_PATH=<folder>/node_modules node tools/build_manuscript_m4.js manuscript/M4_manuscript_sections_VI_VIII.docx`
  (same for `build_m4_reference_doc.js`, `build_viva_guide.js`). The builder stops if table/figure numbering changes
  (fill() calls quote Tables 28–32, Figs. 16–19). PDF via a NEW hidden Word instance (`ExportAsFixedFormat(path, 17)`),
  never the user's Word; if the user has the docx open (EBUSY), build to the scratchpad and copy once it is closed.
  Word counts: `pdftotext -layout file.pdf - | wc -w` and Word's `ComputeStatistics(0)`.
- **Harness quirk:** bash heredocs with quotes, `${` or backslashes are unreliable; write patch scripts with the file
  tool.

## 4. What's next
1. **Submit M4:** the PDF in `milestones/M4_advanced_model/` and notebooks 05 and 06 (they need `src/`,
   `data/processed/`, `models/`, `reports/` and `requirements.txt` next to them).
2. Optional, if the user wants: seed caveat in notebook 06 §6 (edit `tools/nb_text_m4_results.py`, run
   `python tools/build_m4_notebooks.py text`); strip the "Figure A1."-style titles from the report copies of the figures.
3. **Team review:** SDP members confirm the value judgements (5:1; Q1 miss 2×; recommended policy) and FATEN/living-lab
   text; fill in viva guide §2.
4. **Viva prep:** viva guide §3.3, §4.3, §7, §8.3, §9.6, §11; run notebooks 05–06 and `sensitivity_checks_m4.py` once.
   Points cut from the report are still in the guide.
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
- **Checks after the analysis never change a result** (choosing with hindsight would be tuning on results); tagged
  "Afterwards" in the viva guide. Exception by user decision (12 Nov): the seed check is reported as a caveat in VII-F,
  because it qualifies a claim, without changing any number.
- **Report length (12 Nov):** under 5,000 words everything combined, close to M2/M3; reference list = cited works only.
- **Lecture scope:** ensembles (Week 12), fairness (Week 15 + brief). Outside methods in viva guide §4.4: reweighing,
  exact Pareto search, Diebold–Mariano, plus M3's permutation importance, clustered errors, HAC.
- **Manuscript:** new sections only; numbering continues; black text, Times New Roman, no header/footer; team style.

## 6. Open questions
- Seed caveat in notebook 06 too? Strip the in-image "Figure A1." titles from the report figures?
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
- **M4 manuscript:** `tools/build_manuscript_m4.js` (result paragraphs, FATEN and living-lab rows, references) +
  `m4_manuscript_vi/vii/viii.js` (section text) + `collect_m4_numbers.py` → `m4_manuscript_numbers.js` (table rows) →
  `manuscript/M4_manuscript_sections_VI_VIII.docx` → `milestones/M4_advanced_model/M4_manuscript_sections_VI_VIII.pdf`.
- **Docs:** `DS4SG_M4_Reference.docx` (`tools/build_m4_reference_doc.js` + `m4_reference_*.js`),
  `DS4SG_Viva_Guide_M2_M4.docx` (`tools/build_viva_guide.js` + `tools/viva_m4_content.js`), M3 and M1–M2 references.
- **M3:** `src/models/baseline.py`, `train_baselines.py`, notebooks 03–04, `models/m3_baselines/`.
- **Data:** `data/processed/master_features.csv` (+ `FEATURES_DICTIONARY.md`), `items_weekly_panel.csv`.
