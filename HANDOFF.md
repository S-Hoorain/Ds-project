# HANDOFF

**Last updated:** 2026-10-06 (session 5)
**Session summary:** Pulled the team's commits (verified Eid/Ramadan dates from Sarah; notebook comment edits from Hoorain),
moved the verified dates into the overrides file, re-ran the whole pipeline, and produced the **M2 manuscript draft**
(Word + PDF, 19 pages, Sections I–IV). M2 is due **today, 2026-10-06**; the PDF is ready to submit after a team read-through.

## 1. Project overview
CS/SDP 312/314 project. Using the PBS weekly Sensitive Price Indicator (SPI, base 2015-16, 370 weeks, Sep 2019 – Oct 2026)
we build **an early-warning system for essential-price shocks for each consumption quintile** (Q1 poorest … Q5 richest),
and test whether it works as well for the poor as for the rich. Lens: the **burden of inflation rotates** (food shocks
hit Q1, energy, fuel and currency shocks hit Q5), so forecasts must be quintile-specific. SDGs 1, 2, 10; policy angle:
timing BISP top-ups.

## 2. Done so far
- **Sessions 1–3:** scaffolding, handoff hook, git; SPI archive mapped and scraped (359 reports, 370/370 weeks after
  recovering 11 unpublished weeks); SBP decisions, FX, Ramadan/Eid calendar; `notebooks/01_data_preparation.ipynb`
  → `master_model_ready.csv` (2,220 × 70), `items_weekly_panel.csv`, `DATA_DICTIONARY.md`; `manuscript/02_data_collection_audit.md`.
- **Session 4 (2026-10-04):** quintile insights (`reports/quintile_insights.md`); narrative chosen (C spine + A lens);
  `src/features/build_features.py` → `master_features.csv` (2,220 × 105); `notebooks/02_eda.ipynb` (EDA, Figures E1–E5,
  hypotheses H1–H5).
- **Session 5 (2026-10-06):**
  - **Team changes pulled.** Sarah verified the Pakistani Eid/Ramadan dates, but edited the *generated*
    `islamic_events.csv` by hand (the overrides file only got the 2019 Ramadan fix). Her dates were moved into
    `data/external/islamic_events_pk_overrides.csv` (all 1439–1447 AH rows `verified=True`, now including the dates that
    equal Umm al-Qura, plus 2026 Ramadan 19 Feb and Eid ul-Fitr 21 Mar). Regenerating reproduces her file exactly
    except one slip in it (2019 Ramadan duration 29 → correctly 30 days). Eid ul-Adha 2026 and later remain unverified.
  - **Pipeline re-run:** `build_event_calendar.py` → `build_master.py` → notebook 01 → `build_features.py` → notebook 02 →
    `quintile_insights.py`. Only Ramadan columns changed (2019 and 2026 starts moved one day). Ramadan-next-week
    signal weeks 36 → 37; still no effect (p ≥ 0.33). No Eid ul-Adha or headline numbers changed. Commit `7b38274`.
  - **CLAUDE.md, build_event_calendar.py docstring, audit doc** now say the dates are verified and that the overrides
    file (not the output) is the place to edit.
  - **M2 manuscript draft** (user chose Word → PDF; black text and headings only, no header/footer, plain professional):
    - `tools/build_manuscript_m2.js` (docx-js) → `manuscript/M2_manuscript_draft.docx`; PDF exported from Word →
      `milestones/M2_data_eda_hypotheses/M2_manuscript_draft.pdf` (19 pp, Times New Roman, A4, three-rule tables).
    - `tools/prepare_manuscript_figures.py` → `manuscript/figures/` (copies of the figures with the printed caption cropped,
      white background; captions are Word text instead).
    - Contents: title, authors with disciplines, abstract; I Introduction (short, RQ, SDGs, team); II Data & Preprocessing
      (A inventory, B sources, C collection audit, D parsing/validation, E alignment/reshaping/merging, F missing data and
      selection bias, G log/scaling/encoding, H early-warning features, I decisions table, J limitations); III EDA
      (A univariate, B outliers + masking, C rotating burden + exposures, D shocks vs grind, E signals, F FX pass-through,
      G correlations, H findings); IV Hypotheses (H1–H5 formal H0/H1, variable mapping table, analytical plan);
      data/code availability; 15 references (IEEE style). Figures 1–6 = P1, E3, E1, E2, E4, E5.
  - Fixed notebook 02 findings text: SD is 1.5–1.75× the robust SD (was "1.3–1.6", contradicting its own table).
  - Commit `e9609c5`.

## 3. Where we are now
- **M2 deliverables exist:** notebooks 01 and 02 (both run cleanly), figures, tables, dictionaries, and the PDF.
- **Needs a team read-through before submission today:** the PDF has not been reviewed by Hoorain or Sarah.
  To change text, edit `tools/build_manuscript_m2.js`, rebuild, and re-export (see Key files). Small wording edits can
  also be made directly in the .docx in Word, but those are lost on the next rebuild.
- Word COM export hangs when the output path is inside the project folder; export to a temp folder and copy (works).
- The `docx` npm package is not installed in the project; it was installed in a scratch folder. To rebuild:
  `npm install docx` in any folder, then `NODE_PATH=<that folder>/node_modules node tools/build_manuscript_m2.js manuscript/M2_manuscript_draft.docx`.
- Page layout: tables are kept on one page, so pages 13 and 15 end with some white space. This is fine for a draft.

## 4. What's next
1. **Today (M2 due 2026-10-06):** team reads the PDF; fix anything flagged; submit
   `milestones/M2_data_eda_hypotheses/M2_manuscript_draft.pdf` plus the two notebooks. Late penalty: 20% within 24 h.
2. M3 (due Week 10, Oct 21–23):
   - baseline models (logistic regression, KNN) for `target_shock_next`, trained ≤ 2024, tested 2025–26;
   - tests for H1–H3 (H4 can start); report as manuscript §IV results.
3. Verify Eid ul-Adha 2026 (27 May per Umm al-Qura) when convenient; add it to the overrides file, never the output.
4. Expand the manuscript Introduction and add a literature review for the final paper.

## 5. Decisions & rationale
- Sample: 5 Sep 2019 – 1 Oct 2026, base 2015-16 only. Missing weeks filled from official previous-week values;
  revisions use the latest vintage.
- No imputation of the target. Outliers are kept (they are the shocks); inference uses resistant statistics, HAC
  errors and non-parametric tests.
- Shock = weekly rise ≥ 1%. Signals are known at the end of week t, or are calendar facts. The momentum basket was
  chosen on training data only.
- Train ≤ 2024-12-31; test 2025-01 onward. New weeks up to course Week 14 are added in M5.
- Ramadan and Eid ul-Adha are controls, not hypotheses (no shock effect; Eid ul-Adha is confounded with the fiscal-year start).
- Event calendar: `islamic_events_pk_overrides.csv` is the single source of truth; `islamic_events.csv` is generated.
- Manuscript is built from code (`tools/build_manuscript_m2.js`) so numbers can be refreshed after re-runs; every number
  in it was taken from the 2026-10-06 run.

## 6. Open questions
- Should the year-ago columns be used to extend the series back to Sep 2018 (more training data for M3)?
- Should the team register for SBP EasyData to get the official PKR/USD rate?
- What source did Sarah use to verify the Eid/Ramadan dates? Worth citing in the final manuscript.

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates
- `milestones/M2_data_eda_hypotheses/M2_manuscript_draft.pdf` (submission) and `manuscript/M2_manuscript_draft.docx`
- `tools/build_manuscript_m2.js`, `tools/prepare_manuscript_figures.py`, `manuscript/figures/`
- `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`
- `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` + `DATA_DICTIONARY.md`
- `data/external/islamic_events_pk_overrides.csv` → `src/features/build_event_calendar.py` → `islamic_events.csv`
- `reports/figures/figE1-E5, figP1`; `reports/tables/`; `reports/quintile_insights.md`
- `manuscript/02_data_collection_audit.md`
