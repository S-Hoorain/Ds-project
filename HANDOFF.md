# HANDOFF

**Last updated:** 2026-11-10 (session 10; committed, not pushed)
**Session summary:** Milestone 4 built end to end: notebooks 05 (advanced models) and 06 (fairness audit, mitigation,
FATEN, living lab), `src/models/advanced.py`, manuscript Sections VI–VIII (PDF in `milestones/M4_advanced_model/`), the
M4 reference doc and the viva guide extended to M2–M4. M4 was due 10 Nov; the class asked for an extension.

M3 was submitted (files in `milestones/M3_baseline_model/`; the submitted PDF matches our build except layout and one
word, "a larger cost" → "a higher cost"). **Only the report (PDF) and the notebooks are submitted**, never the scripts.

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
    AUC**; models = **random forest + gradient boosting** (no neural network); final model = **random forest** (KNN
    0.683 vs forest 0.678 was a tie; KNN cannot take row weights, which pre-/in-processing mitigation need).
  - **My calls (flagged to the user):** new features only from existing data (`shock_rate_26w`, `july_next_week`);
    NEPRA/OGRA notification dates moved to M5; a missed Q1 shock counts 2× in the group-cost policy (sensitivity 1–3×);
    equal-opportunity tolerance 0.05; the test period called a "second look" (seen in M3).
  - **`src/models/advanced.py`** (decisions A1–A6, R1–R4 in the docstring): features, five learners and grids, `tune()`
    (within-year selection), `oof_predict()` with per-fold row weights, fairness tools (`group_rates`,
    `fairness_summary`, `bootstrap_fairness`), mitigation (`reweighing_weights`, `group_cost_weights`,
    `group_thresholds`), `pareto_frontier()` (exact search), `diebold_mariano()`. `baseline.py` unchanged.
  - **Notebook 05** (~20 min; RF grid ~9 min in Jupyter): data + new features (Fig. A1), folds (both classes for every
    quintile in every year), grids (48/88/196/128/144 settings), tuning + validation curves (A2), M3 vs M4 comparison
    with bootstrap (A3), feature ablation, leakage check, threshold curves (A4) and cost ratios, calibration (A5), H4
    (Wald + LR + pooled vs own models), permutation importance overall and Q1 vs Q5 (A6); saves `models/m4_advanced/`.
  - **Notebook 06** (~3 min): attribute and base rates, fairness metrics for all learners, final model with bootstrap
    (F1), H5 (Diebold–Mariano), shock drivers by quintile, mitigation (pre/in/post), Pareto frontier (F2), asymmetric
    thresholds (F3), recommended policy, FATEN table, living lab.
  - **Manuscript** `tools/build_manuscript_m4.js` (+ `m4_manuscript_vi/vii/viii.js`, numbers from
    `tools/collect_m4_numbers.py` → `m4_manuscript_numbers.js`): Tables 25–34, Figs. 14–19, refs [18]–[25]; 14 pages,
    4,763 body words; team style (no colons/semicolons in prose). PDF in `milestones/M4_advanced_model/`.
  - **`DS4SG_M4_Reference.docx`** (17 pp, `tools/build_m4_reference_doc.js` + `m4_reference_*.js`) and
    **`DS4SG_Viva_Guide_M2_M4.docx`** (44 pp, `build_viva_guide.js` + `tools/viva_m4_content.js`: §3.3, §4.3, §7 M4
    decision cards A1–A9 and R1–R6, §8.3, §9.6; sections renumbered). The old `DS4SG_Viva_Guide_M2_M3.docx` is kept.
  - `milestones/M4_advanced_model/M4_rubric.md` holds the brief, rubric and where each item is answered.

## 3. Where we are now
- **M4 deliverables are complete and verified:** both notebooks execute top to bottom with no errors or warnings; every
  manuscript number traces to `reports/tables/m4_*.csv`; deliverables scanned clean of tool traces.
- **Headline results (for the viva):**
  - CV within-year AUC: LR 0.640, KNN 0.683, tree 0.657, forest 0.678, boosting 0.635 (all tied; SD 0.03–0.10).
  - Test: forest 0.674 vs M3 KNN 0.679 (diff −0.005, −0.10 to +0.11). Ensembling did not beat the best baseline.
  - Shuffled stratified K-fold would report 0.83 for the forest (ours 0.68).
  - No threshold beats "never alert" in 2025–26: break-even precision at 5:1 is 1/6, forest's best 0.153; probabilities
    over-predict by half (0.114 vs 0.077).
  - New features did not improve ranking (0.684 without, 0.678 with); kept as designed (dropping them would be
    test-informed).
  - H4 not supported (Wald p = 0.067; only fuel review × Q5 significant, 0.90, p = 0.017); pooled beats own models.
  - Fairness: DI 1.05 (80% rule met), EOD −0.026 (n.s.), AUC within group Q1 0.64 vs Q5 0.72; H5 not supported
    (Brier 0.148 vs 0.136, p = 0.26). Perishables drive 42% of Q1's shocks vs 24% of Q5's; recall perishables 0.62 vs
    fuel 0.88.
  - Mitigation: reweighing useless (base rates equal); Q1-weighted training moves the imbalance; equal-opportunity
    quintile thresholds fairer and cheaper in 2021–24 (gap 0.05 vs 0.13; cost 0.637 vs 0.651). Shared threshold lies
    above the Pareto frontier. Nothing transfers cleanly to the test period (6–9 shocks per quintile).
- **Known caveats (disclosed):** test period is a second look; boosting's selected learning rate (0.01) and trees (300)
  sit at the grid edge (not extended, not the final model); KNN k = 250 at the edge (limited by fold 1); 26-week window
  not varied; final-model rule decided after seeing the CV tie.
- **Not committed on purpose:** Assignment 2 working-tree changes (pre-existing, not from this session), `docs/`, the
  submitted M2/M3 files in `milestones/`, `assignments/assignment 1/`, `assignments/drive/`, the A2 rar.
- **Rebuilding:** `python tools/build_m4_notebooks.py` then nbconvert both notebooks (commands in its docstring);
  `python tools/build_m4_notebooks.py text` refreshes only text cells (refuses if code changed). Then
  `python tools/prepare_manuscript_figures.py`, `python tools/collect_m4_numbers.py`, and
  `NODE_PATH=<folder>/node_modules node tools/build_manuscript_m4.js manuscript/M4_manuscript_sections_VI_VIII.docx`
  (same pattern for `build_m4_reference_doc.js`, `build_viva_guide.js`). PDF via a NEW hidden Word instance
  (`ExportAsFixedFormat(path, 17)`), never the user's Word. The docx package was installed in this session's scratchpad;
  `npm install docx@9.5.1` in any folder works.
- **Bash heredocs that contain quotes or `${` sometimes fail in this harness**; write patch scripts with the file tool
  and run them instead. A `\n` inside a heredoc-written Python string became a real newline twice: check after edits.

## 4. What's next
1. **Submit M4** (due 10 Nov, extension requested): the PDF in `milestones/M4_advanced_model/` and notebooks 05 and 06
   (they need `src/`, `data/processed/`, `models/m3_baselines/`, `reports/` and `requirements.txt` next to them).
2. **Team review:** SDP members confirm the value judgements (5:1 cost; Q1 miss 2×; recommending equal-opportunity
   thresholds with Q1 × 2 as the equity option) and the FATEN/living-lab text; fill in viva guide §2 contributions.
3. **Viva prep:** study viva guide §3.3, §4.3, §7, §8.3, §9.6; run notebooks 05–06 once.
4. **M5 (Week 14, Nov 16–20): new data integration and re-training.**
   - Download the new weekly SPI releases since Oct 2026 (clean out-of-sample test).
   - Walk-forward retraining; re-choose thresholds on recent weeks; measure recovery after a regime change.
   - Candidate new data: NEPRA/OGRA tariff notification calendar, wholesale perishable prices; re-test the 26-week
     window and the July feature on new weeks; repeat the fairness audit on new weeks.
5. Carry-overs: verify Eid ul-Adha 2026 (27 May) in the overrides file; abstract, introduction and literature review.

## 5. Decisions & rationale
- **Data (M2):** D1 report dates → nearest Thursday; D2 gaps from next report; D3 revised figures; D4 weekly average
  PKR/USD; D5 fuel-revision week > 1%. F1 shock = weekly SPI rise ≥ 1%; F2 fuel reviews 1st/16th; F3 momentum items from
  training weeks; F4 component inflation Combined-weighted. Sample Sep 2019 – Oct 2026; outliers kept.
- **M3 (B1–B20, in `baseline.py` and the viva guide):** Q1–Q5 rows; chronological split (≤ 2024 / 2025–26); expanding
  window, 4 yearly folds, whole weeks; scaling inside pipelines; pooled-AUC selection (M3 only); no resampling; threshold
  at 5:1 on OOF; listwise deletion; three learners + two benchmarks; week-block bootstrap; seed 42.
- **M4 (A1–A9, R1–R6; A1–A6 and R1–R4 in `advanced.py`, all in the viva guide §7):**
  - A1 RF + GB, M3 learners re-tuned under the same protocol. A2 within-year AUC (team). A3 two derived features
    (disclosed as test-inspired). A4 Gini/entropy and Euclidean/Manhattan in grids. A5 same folds; stratification's
    purpose checked instead of shuffled folds. A6 final model = best within-year AUC among learners taking row weights
    (team, after the tie). A7 test period = second look. A8 same threshold rule. A9 H4 with week-clustered Wald.
  - R1 quintile = sensitive attribute; alarm = favourable outcome. R2 audit on 2021–24 OOF, test as check, bootstrap.
    R3 equal opportunity = main criterion. R4 three mitigation families. R5 Q1 miss 2× (value judgement, 1–3×).
    R6 recommended policy: equal-opportunity quintile thresholds; Q1 × 2 as the equity option; re-choose by regime.
- **Lecture scope:** ensembles (Week 12), fairness (Week 15 + brief). Outside methods listed in viva guide §4.4:
  reweighing, exact Pareto search, Diebold–Mariano (M2 plan), plus M3's permutation importance, clustered errors, HAC.
- **Submitted work is plain:** no session-file references, no decision labels in notebooks; team prose style in reports.
- **Manuscript:** new sections only; numbering continues (Tables 25–34, Figs. 14–19, refs [18]–[25] in first-citation
  order); black text, Times New Roman, no header/footer.

## 6. Open questions
- Was the M4 extension granted, and to when?
- Do the SDP members accept the Q1 miss weight (2×) and the recommended policy? (value judgements, VII-F/VII-I)
- Each member's contributions for viva guide §2.
- M5: which new data source first (tariff calendar vs perishable wholesale prices)? Drop the two M4 features if new
  weeks do not support them?
- Commit the submitted M2/M3 files in `milestones/` and the team's `docs/` export as records?
- Carry-overs: Sarah's source for the Eid/Ramadan dates; extend the series to Sep 2018; SBP EasyData registration.

## 7. Key files
- `CLAUDE.md`; rubrics in `milestones/*/` (M4: `milestones/M4_advanced_model/M4_rubric.md`).
- **M4 code:** `src/models/advanced.py` (uses `src/models/baseline.py`).
- **M4 notebooks:** `notebooks/05_advanced_models.ipynb`, `notebooks/06_fairness_audit.ipynb`; builders
  `tools/build_m4_notebooks.py`, `tools/nb05_code.py`, `tools/nb06_code.py`, `tools/nb_text_m4.py`,
  `tools/nb_text_m4_results.py`, `tools/nbtools.py`.
- **M4 outputs:** `models/m4_advanced/` (5 joblib models, OOF/test predictions, `model_card.json`),
  `reports/figures/figA1`–`figA6`, `figF1`–`figF3`, `reports/tables/m4_*.csv`.
- **M4 manuscript:** `tools/build_manuscript_m4.js` → `manuscript/M4_manuscript_sections_VI_VIII.docx` →
  `milestones/M4_advanced_model/M4_manuscript_sections_VI_VIII.pdf`.
- **Docs:** `DS4SG_M4_Reference.docx`, `DS4SG_Viva_Guide_M2_M4.docx` (supersedes `..._M2_M3.docx`),
  `DS4SG_M3_Reference.docx`, `DS4SG_Script_and_Data_Reference.docx`.
- **M3:** `src/models/baseline.py`, `train_baselines.py`, notebooks 03–04, `models/m3_baselines/`.
- **Data:** `data/processed/master_features.csv` (+ `FEATURES_DICTIONARY.md`), `items_weekly_panel.csv`.
