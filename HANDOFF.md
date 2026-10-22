# HANDOFF

**Last updated:** 2026-10-22 (session 7)
**Session summary:** Full audit of Milestone 3 (code, data, results, insights). No code or result errors were found;
everything reproduces exactly. Several interpretation errors and overclaims were fixed in the notebooks, the manuscript
and the viva guide, and one methodological caveat (pooled AUC partly measures regime tracking) is now disclosed. The
viva guide was rebuilt in the root once the user closed it in Word.

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
- **Session 7 (2026-10-22): audit.**
  - **Verified correct:**
    - Target = next week's `shock_now` within each group (all 1,845 rows).
    - FX is averaged over Fri–Thu; the policy rate is an as-of join on decision dates; the momentum features align
      by date. No feature uses week t+1.
    - Folds never overlap in time.
    - Both notebooks re-run top to bottom; all tables, figures and joblib models reproduce byte-for-byte, and the
      script equals the notebook.
    - An independent recomputation of the confusion matrices, AUC, PR-AUC, Brier and costs matches. The project
      DeLong matches a brute-force DeLong (z = 3.5725), and the LR pooled CV AUC reproduces with a different solver.
    - All 10 figures were checked visually; both docx files pass the docx validator; the PDFs were rendered and
      checked.
  - **New finding (disclosed, selection NOT changed):** an oracle score equal to each validation year's realised shock
    rate (constant within a year) reaches a pooled CV AUC of **0.640**, as high as LR/KNN (0.643). Pooled AUC is
    therefore partly regime tracking. Within-year AUC (mean fold) ranks KNN 0.672 > LR 0.651 > tree 0.578 ≈
    persistence 0.569, the same order as the test. The tree's pooled lead (0.652) comes from its rupee > 8% split
    recognising 2022–23. Re-selecting after seeing the test would leak it, so the selection stays; this is now in
    notebook 03 (§4, §12), manuscript V-A/V-H and reference doc B5, numbers and viva Q&A.
  - **Interpretation fixes** (notebook 03/04 text, manuscript, reference doc):
    - Shock persistence: "4.2% higher 8 weeks later, only 16% revert" ignored trend inflation (ordinary weeks: +1.9%
      over the same span, 18% fall back). Now: the shock's step is not given back; prices keep rising at the usual pace
      afterwards (2.1% vs 2.0%).
    - Fiscal-year OR 5.3 rests on only 5 fiscal years (14 of 25 rows shocked; CI 1.4–19.5). In the test, 4 of 13 shock
      weeks fell in July but only 1 in the flagged first week. The "front-load before July" takeaway is kept with
      that caveat; a first-month-of-FY window is an M4 feature idea.
    - "No baseline beat never-alert at any cost ratio" was false at 20:1 (0.59–0.60 of never-alert, by alerting almost
      always). Now: never meaningfully better than the cheaper trivial policy (best 0.99).
    - Manuscript V-C said the models "stay silent at 1:1–3:1", contradicting its own Table 20 (tree 2.01 at 2:1). Fixed.
    - Manuscript V-E listed staple-food inflation among the permutation leaders (it is 6th). Fixed: perishables,
      recent shocks, 4-week SPI change, rupee. Table 22 gained the missing momentum-spikes row.
    - Utility tariffs (+0.03, p = 0.10) were stated as hitting the poor. They are now described as not significant. Fig
      B10 retitled. Policy takeaway 3 no longer says fuel prices "hit the poorest hardest" (H3 shows the opposite);
      it now says administered prices drove 6 of 13 test shock weeks.
    - KNN cost dip range 0.15–0.23 (was 0.22). Sister rows: 82% of a shock row's sisters are shocks ("almost always"
      → quantified). Citation [20] moved to "prior shift".
    - Fig B4 legend no longer overlaps markers. The notebook writes integer counts, so notebook and script produce
      identical CSVs.
  - Manuscript is now 3,296 body words (was 3,000; no word limit in any rubric), still 12 pages; PDF re-exported.
  - Viva guide `DS4SG_M3_Reference.docx` rebuilt with all fixes (28 pages, 27 viva questions, validator passed).

## 3. Where we are now
- **M3 deliverables are complete and audited.** The team still needs a read-through.
- **Rebuilding the viva guide:** `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js
  DS4SG_M3_Reference.docx` (the docx package is not in the project: `npm install docx` in any folder). Close the file
  in Word first, or the write fails with EBUSY.
- **Notebooks are the source** (the scratchpad builders are gone): edit them directly.
- **Word automation (COM):**
  - It works again this session via a NEW hidden instance, exporting to a folder outside the project.
  - In PowerShell use `$w.Quit()`, not `$w.Quit(0)` (needs `[ref]`).
  - Never touch the user's own Word process.
- **Known caveats (disclosed):**
  - The momentum basket was chosen on all training years (it sees later CV folds, never the test).
  - The LR is at the grid edge C = 1e-4 on a flat plateau, uncalibrated (Brier 0.24).
  - The test has 13 distinct shock weeks.
  - Pooled-AUC regime tracking (above).
  - Edge-case drivers use Combined-index item impacts (no Q2–Q5 item weights exist).
- Local commits are not pushed (user to push).

## 4. What's next
1. **By 2026-10-24 (M3 due):**
   - the team reads the PDF and the notebooks; to fix the manuscript, edit `tools/build_manuscript_m3.js`, rebuild,
     re-check `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx`, and re-export the PDF;
   - submit the PDF, `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`,
     `src/models/baseline.py` and `src/models/train_baselines.py` (plus `models/m3_baselines/` if artifacts are
     uploaded);
   - late penalty: 20% within 24 h.
2. **Viva prep (5 minutes, V-factor):**
   - every member studies the reference doc §6 (decisions), §7 (numbers) and §8 (Q&A, now 27 questions);
   - be ready for "why was the tree best in CV but worst on test?" (pooled AUC = regime tracking);
   - re-run notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.**
   - Ensembles (random forest, gradient boosting) under the same protocol. Report within-year AUC next to pooled AUC
     and decide the selection criterion before looking at the test.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (Platt/isotonic, reliability plots).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock-rate (regime) feature.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano), equal opportunity, welfare-weighted thresholds.
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
    - **Audit caveat:** pooled AUC partly rewards regime tracking (year oracle 0.640).
    - It was kept as planned, because changing it after seeing the test would be leakage (B16).
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: a Q1 shock's step is not given back (4.2% vs 1.9% after 8 weeks), Rs 355/month ≈ 8% of Kafaalat,
    and FAO's 7:1 return on early action.
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
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv` (23 files).
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`.
