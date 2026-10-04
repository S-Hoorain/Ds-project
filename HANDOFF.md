# HANDOFF

**Last updated:** 2026-10-04 (session 4)
**Session summary:** Ran a deep quintile analysis and the user chose the narrative: **early-warning forecasting (C) +
rotating-burden lens (A)**. Built the early-warning features and `notebooks/02_eda.ipynb` (rubric §3 and §4,
5 figures, 5 formal hypotheses). Next: manuscript §II–III for the M2 PDF (due **2026-10-06**).

## 1. Project overview
CS/SDP 312/314 project. Using the PBS weekly Sensitive Price Indicator (SPI, base 2015-16, 370 weeks, Sep 2019 – Oct 2026)
we build **an early-warning system for essential-price shocks for each consumption quintile** (Q1 poorest … Q5 richest),
and test whether it works as well for the poor as for the rich. Lens: the **burden of inflation rotates** (food shocks
hit Q1, energy, fuel and currency shocks hit Q5), so forecasts must be quintile-specific. SDGs 1, 2, 10; policy angle:
timing BISP top-ups. **M2 (data prep, EDA, hypotheses; manuscript §II–III) is due 2026-10-06.**

## 2. Done so far
- **Sessions 1–3:**
  - scaffolding, handoff/log hook, git;
  - SPI archive mapped and the full pipeline run: 359 reports downloaded, 370/370 weeks after recovering missing weeks;
  - supporting inputs: SBP decisions, FX, Ramadan/Eid calendar;
  - `notebooks/01_data_preparation.ipynb` (rubric §2) → `master_model_ready.csv` (2,220 × 70),
    `items_weekly_panel.csv`, `DATA_DICTIONARY.md`;
  - `manuscript/02_data_collection_audit.md`.
- **Session 4 (2026-10-04):**
  - `src/analysis/quintile_insights.py` → `reports/quintile_insights.md` and `reports/tables/insights_*.csv`.
    Findings:
    - cumulative inflation: Q1 179%, Q5 193%, Q3 202%;
    - regimes: Q1 > Q5 from Mar 2020 to Nov 2021, Q5 > Q1 from Feb 2022 to Dec 2024;
    - Q1 weekly variance: utilities about 61%, perishables 28%, staples 8%, although staples are 57% of the basket;
    - exposure gradient across quintiles; FX pass-through bigger for Q5 (point estimates);
    - momentum after onion, potato and pulse spikes;
    - Ramadan is not an index-wide effect; the Eid ul-Adha effect is confounded with the fiscal-year start.
  - **Narrative chosen by the user: C spine + A lens** (recorded in CLAUDE.md).
  - `src/features/build_features.py` → `data/processed/master_features.csv` (2,220 × 105) + `FEATURES_DICTIONARY.md`.
    - Decision F1: shock week = SPI rise ≥ 1% (13–17% of weeks); `target_shock_next`.
    - Calendar signals known in advance: `fuel_review_next_week` (1st/16th; 64% of those weeks had a fuel revision
      vs 9% otherwise), `fy_start_next_week`, `pre_eid_adha_4w`, `ramadan_next_week`.
    - `fx_chg_4w/8w/13w`, component inflation `infl_*_wow/_4w`, `shocks_last_4w`, `spi_chg_4w/13w`,
      `gap_q1_q5_wow`, `target_spi_chg_next4w/8w/13w`.
    - Momentum items chosen on training weeks only (≤ 2024): bananas, chilies, onions, potatoes, pulse gram, pulse moong,
      tea.
  - **`notebooks/02_eda.ipynb`** (16 code cells, runs cleanly on the `ds4sg` kernel):
    - §1: univariate summaries with resistant vs non-resistant statistics;
    - §2: outliers by both course rules plus masking, and the extreme weeks traced to tariff and fuel decisions
      (kept, not removed);
    - §3: rotating burden (group-bys, exposure regressions), shocks vs grind, contingency tables with Fisher tests for
      the signals, FX pass-through with HAC errors, Spearman correlation matrices;
    - §4: hypotheses H1–H5 with variable mapping;
    - §5: findings summary.
    - Figures in `reports/figures/`:
      - E1: rotating burden;
      - E2: shocks vs grind;
      - E3: weekly-change distribution and outliers;
      - E4: early-warning signals;
      - E5: FX pass-through.
    - Tables: `reports/tables/eda_*.csv`.
  - `src/utils/plot_style.py`: titles are now bold (semibold isn't available). Both notebooks were re-executed.

## 3. Where we are now
- **The M2 hypotheses** (full statement in notebook 02 §4):
  - **H1:** lead signals predict next-week shocks (logit LR test; out-of-sample AUC vs own-history baseline).
  - **H2:** FX pass-through is larger for Q5 (interaction, HAC Wald test). EDA bands overlap, so this is not yet
    established.
  - **H3:** the Q1−Q5 gap rises with food inflation and falls with energy inflation (OLS, HAC).
  - **H4:** signal effects differ by quintile (signal × Q5 interactions, LR test).
  - **H5:** the model is less accurate for Q1 than Q5 (Diebold–Mariano on Brier score; recall gap) → M4.
- **Key EDA evidence for the signals** (next-week shock probability, signal vs no signal):
  - FX depreciation >2% over 8 weeks: Q1 23% vs 11%, Q5 27% vs 8% (p ≤ 0.004).
  - Shock in the past 4 weeks: +12 to +13 pp.
  - Momentum spikes: +5 to +8 pp (significant for Q5 and Combined, not for Q1).
  - Fiscal-year start: +29 pp, but only n = 7.
  - Fuel review: about +6 pp for Q5, about +1 pp for Q1.
  - Ramadan and Eid ul-Adha: no shock effect, so they are kept as controls.
- The notebook generator scripts are not in the repo; edit the notebooks directly.

## 4. What's next
1. **Manuscript drafts for the M2 PDF** (rubric §5):
   - §II Data & Preprocessing (from the audit draft and notebook 01);
   - §III EDA (from notebook 02 §5, Figures E1–E5, and the key tables);
   - include the hypotheses section (rubric §4) and team metadata and research question (rubric §1).
   - Format: scientific paper; decide the tool (LaTeX/Word/Markdown → PDF) with the user.
2. Final check of the M2 rubric against the deliverables (notebooks, figures, PDF).
3. Team to verify the Pakistan Eid/Ramadan dates (`data/external/islamic_events_pk_overrides.csv`), which affect
   `pre_eid_adha_4w` and `ramadan_next_week`.
4. M3 (due Week 10, Oct 21–23):
   - baseline models (logistic regression, KNN) for `target_shock_next`, trained ≤ 2024, tested 2025–26;
   - tests for H1–H4.

## 5. Decisions & rationale
- Sample: 5 Sep 2019 – 1 Oct 2026, base 2015-16 only. Missing weeks are filled from official previous-week values;
  revisions use the latest vintage.
- No imputation of the target. Outliers are kept (they are the shocks); inference uses resistant statistics, HAC
  errors and non-parametric tests.
- Shock = weekly rise ≥ 1%. Signals are known at the end of week t, or are calendar facts. The momentum basket was
  chosen on training data only.
- Train ≤ 2024-12-31; test 2025-01 onward. New weeks up to course Week 14 are added in M5.
- Ramadan and Eid ul-Adha are controls, not hypotheses (no shock effect; Eid ul-Adha is confounded with the fiscal-year start).

## 6. Open questions
- Which tool and format should the M2 manuscript PDF use?
- Should the year-ago columns be used to extend the series back to Sep 2018 (more training data for M3)?
- Should the team register for SBP EasyData to get the official PKR/USD rate?

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates
- `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`
- `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` + `DATA_DICTIONARY.md`
- `reports/quintile_insights.md`; `reports/figures/figE1-E5, figP1`; `reports/tables/`
- `src/features/build_features.py`, `src/analysis/quintile_insights.py`, `src/utils/plot_style.py`
- `manuscript/02_data_collection_audit.md`
