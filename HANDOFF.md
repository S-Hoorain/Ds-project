# HANDOFF

**Last updated:** 2026-10-06 (session 5)
**Session summary:** Pulled the team's commits (verified Eid/Ramadan dates from Sarah; notebook comment edits from Hoorain),
moved the verified dates into the overrides file, re-ran the whole pipeline, and produced the **M2 manuscript draft of
Sections II–III** (Word + PDF, 11 pages, 2,612 body words; user's limit is 3,000 excluding tables, captions and references).
M2 is due **today, 2026-10-06**; the PDF is ready to submit after a team read-through.

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
    `data/external/islamic_events_pk_overrides.csv` (all 1439–1447 AH rows `verified=True`, including dates equal to
    Umm al-Qura, plus 2026 Ramadan 19 Feb and Eid ul-Fitr 21 Mar). Regenerating reproduces her file exactly except one
    slip in it (2019 Ramadan duration 29 → correctly 30 days). Eid ul-Adha 2026 and later remain unverified.
  - **Pipeline re-run:** `build_event_calendar.py` → `build_master.py` → notebook 01 → `build_features.py` → notebook 02 →
    `quintile_insights.py`. Only Ramadan columns changed (2019 and 2026 starts moved one day). Ramadan-next-week
    signal weeks 36 → 37; still no effect (p ≥ 0.33). No headline numbers changed. Commit `7b38274`.
  - CLAUDE.md, the `build_event_calendar.py` docstring and the audit doc now say the dates are verified and that the
    overrides file (not the output) is the place to edit.
  - **M2 manuscript draft.** First version (19 pp, with abstract and introduction) was too long. The user then specified:
    **Sections II and III only, no abstract or introduction, ≤ 3,000 words of body text (tables, captions and
    references not counted)**. Final version:
    - Title block (authors with disciplines, course line, one-line research question) — needed for rubric §1.
    - II Data and Preprocessing: A sources and master dataset (Table 1), B collection audit, C parsing/alignment/reshaping,
      D missing data and selection bias (Table 2), E log/scaling/encoding (Fig. 1), F early-warning features,
      G decisions table (Table 3) and limitations.
    - III EDA: A univariate (Tables 4–5), B outliers and masking (Tables 6–7, Fig. 2), C rotating burden (Tables 8–9,
      Fig. 3), D shocks vs grind (Fig. 4), E signals (Table 10, Fig. 5), F FX pass-through and correlations (Fig. 6,
      Table 11), G summary of findings, H hypotheses H1–H5 with variable mapping (Table 12) — rubric §4.
    - 10 references (IEEE style). Format: Word → PDF, Times New Roman, black text/headings only, no header/footer,
      three-rule tables kept on one page.
    - Built by `tools/build_manuscript_m2.js`; figures from `tools/prepare_manuscript_figures.py` (caption-cropped copies
      in `manuscript/figures/`); body count via `tools/word_count_body.py` (2,612 words incl. the 85-word title block).
  - Fixed notebook 02 findings text (SD is 1.5–1.75× the robust SD).
  - Commits: `7b38274` (data), `e9609c5`, `39879ec`, `c4ad64d` (manuscript).

## 3. Where we are now
- **M2 deliverables exist:** notebooks 01 and 02 (both run cleanly), figures, tables, dictionaries, and the PDF
  `milestones/M2_data_eda_hypotheses/M2_manuscript_draft.pdf`.
- **Needs a team read-through before submission today.** To change text, edit `tools/build_manuscript_m2.js`, rebuild,
  check `python tools/word_count_body.py manuscript/M2_manuscript_draft.docx` stays ≤ 3,000, and re-export.
- Rebuild needs the npm package `docx` (not installed in the project): `npm install docx` in any folder, then
  `NODE_PATH=<that folder>/node_modules node tools/build_manuscript_m2.js manuscript/M2_manuscript_draft.docx`.
- PDF export: Word COM (`ExportAsFixedFormat`, format 17) hangs when the output path is inside the project folder;
  export to a temp folder and copy. If the copy fails with "resource busy", the PDF is open in a viewer.
- Local commits are not pushed yet (user to push).

## 4. What's next
1. **Today (M2 due 2026-10-06):** team reads the PDF; fix anything flagged; submit the PDF plus the two notebooks.
   Late penalty: 20% within 24 h.
2. M3 (due Week 10, Oct 21–23): baseline models (logistic regression, KNN) for `target_shock_next`, trained ≤ 2024,
   tested 2025–26; tests for H1–H3 (H4 can start).
3. Verify Eid ul-Adha 2026 (27 May per Umm al-Qura); add it to the overrides file, never the output.
4. Final paper: write the abstract, introduction and literature review (deliberately left out of the M2 draft).

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
- Manuscript is built from code so numbers can be refreshed after re-runs; every number is from the 2026-10-06 run.
- Manuscript word limits count body text only (not tables, captions or references), per the user.

## 6. Open questions
- Should the year-ago columns be used to extend the series back to Sep 2018 (more training data for M3)?
- Should the team register for SBP EasyData to get the official PKR/USD rate?
- What source did Sarah use to verify the Eid/Ramadan dates? Worth citing in the final manuscript.

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates
- `milestones/M2_data_eda_hypotheses/M2_manuscript_draft.pdf` (submission) and `manuscript/M2_manuscript_draft.docx`
- `tools/build_manuscript_m2.js`, `tools/prepare_manuscript_figures.py`, `tools/word_count_body.py`, `manuscript/figures/`
- `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`
- `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` + `DATA_DICTIONARY.md`
- `data/external/islamic_events_pk_overrides.csv` → `src/features/build_event_calendar.py` → `islamic_events.csv`
- `reports/figures/figE1-E5, figP1`; `reports/tables/`; `reports/quintile_insights.md`
- `manuscript/02_data_collection_audit.md`
