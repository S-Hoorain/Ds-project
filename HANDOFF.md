# HANDOFF

**Last updated:** 2026-10-03 (session 2, end)
**Session summary:** Mapped the real SPI archive, built and ran the full collection → parse → master
pipeline (370/370 weeks, 2,220 rows), and built the supporting inputs (FX, SBP decisions, Eid
calendar). Next: the M2 notebooks (data prep and EDA) and the hypotheses.

## 1. Project overview
CS/SDP 312/314 course project (Data Science for Social Good). Using the PBS weekly Sensitive Price
Indicator (SPI, base 2015-16), we forecast next-week price movements and test whether the lowest
consumption quintile (Q1) faces higher inflation and higher forecast error than Q5. SDGs 1, 2 and 10.
Policy angle: timing and targeting of BISP. The final deliverable is a research paper, written
incrementally across the milestones.

## 2. Done so far
- **Session 1:** scaffolding, CLAUDE.md, handoff/log hook, git.
- **Session 2 (2026-10-03):**
  - Read the syllabus and Units 01–07. Course conventions and the milestone schedule are now in CLAUDE.md.
  - `.venv` is set up. Added pdfplumber, hijridate and yfinance to requirements.
  - **Scope correction:** the 2015-16-base weekly SPI starts on **5 Sep 2019**. Earlier weeks are base
    2007-08, so the sample is Sep 2019 – Oct 2026, 370 weeks.
  - **Collection** (`src/scraping/spi_catalogue.py`, `spi_download.py`):
    - sources: the live PBS site's JS catalogue (Jul 2023+) and the Wayback Machine (old PBS site);
    - result: **359 reports** (222 Wayback PDFs, 137 live: 86 PDF + 51 xlsx);
    - 15 live links returned 404; 5 had a Wayback fallback, and 10 were mis-dated duplicates.
    - Audit trail: `data/raw/spi_weekly/manifest.csv`.
  - **Parsing** (`src/cleaning/parse_spi.py`): **359/359 complete** (6-row quintile table, 51/51
    items, base 2015-16 verified), giving 18,309 item-week rows. One PBS typo ("Gad Charges") was
    matched correctly.
  - **Master dataset** (`src/cleaning/build_master.py` → `data/processed/master_weekly_quintile.csv`):
    - **2,220 rows × 36 columns**, 1 row = week × group (Q1–Q5, Combined), no missing SPI;
    - columns: SPI levels, log, w/w and y/y %, lags 1/2/4, FX weekly average and %, fuel-revision
      flag, Ramadan/Eid day counts, weeks to Ramadan, policy rate, MPC-week flag, group dummies,
      and target = next week's w/w %.
    - Cleaning decisions D1–D5 are logged in `data/processed/cleaning_report.txt`:
      - D1: 14 off-Thursday releases aligned to the nearest Thursday;
      - D2: 11 missing weeks filled from the next report's official previous-week value;
      - D3: 13 PBS revisions, with the latest vintage used. The Q1 revision of 20 Nov 2025 traces to
        the Q1 electricity tariff (+Rs 0.57/unit);
      - D4: 2 FX bad ticks dropped;
      - D5: 126/359 weeks are fuel-revision weeks (|petrol or diesel w/w| > 1%).
  - **SBP decisions** (`src/scraping/sbp_mps.py` → `data/external/sbp_mpc_decisions.csv`):
    - 66 decisions, Jan 2018 – Sep 2026 (32 hold, 21 hike, 13 cut);
    - stated changes agree with the rate path in every case;
    - 6 rows hand-coded, with evidence, in `sbp_mpc_decisions_manual.csv`.
  - **FX:** `src/scraping/fx_rates.py` → daily PKR/USD from Yahoo, 2018-06 → 2026-10.
  - **Eid/Ramadan:** `src/features/build_event_calendar.py` → `data/external/islamic_events.csv`.
  - `data/external/spi_items.csv`: 51 items, team-defined categories, 2015-16 weights.
  - `manuscript/02_data_collection_audit.md`: complete draft of M2 §2.1 / manuscript §II.1, with
    final numbers.

## 3. Where we are now
- The data pipeline is complete and reproducible. Run order:
  1. `spi_catalogue.py`
  2. `spi_download.py`
  3. `parse_spi.py`
  4. `fx_rates.py`
  5. `build_event_calendar.py`
  6. `sbp_mps.py`
  7. `build_master.py`
- Raw files (~120 MB) are gitignored. Interim CSVs are gitignored (they're reproducible). The
  processed master dataset, catalogue, manifest and external lookups are committed.
- **Wayback rule:** only ONE scraper stream at a time. Parallel streams got the IP blocked for
  ~20 min this session.
- **Small gaps left in the master dataset** (the 11 filled weeks have no report of their own, so
  report-only fields are NaN):
  - `spi_year_ago`, `spi_yoy_pct`, petrol/diesel % and `fuel_revision_week` are missing for 2.97%
    of rows.
  - Fix in the prep notebook: compute y/y from the series itself (lag 52) and fuel % from the
    item panel's prev-week prices.
- **Data issues to note in EDA:**
  - Electricity and gas items were renamed ("upto 50 Units" / "upto 3.3719 MMBTU" became
    "for Q1"). Check for level breaks.
  - `weeks_to_ramadan` jumps from about 0 to about 50 when Ramadan starts. Consider a cyclical
    encoding or a "pre-Ramadan window" flag instead.
  - COVID-19 (Mar–Jun 2020) and the 2022–23 inflation surge (y/y ~40%+) are regime shifts. Plan
    the time-aware train/test split accordingly.
- **Timeline concern:** the syllabus lists M2 in **Week 7 (Sep 28 – Oct 2)**, which has passed. The
  real due date needs confirming.

## 4. What's next
1. `notebooks/01_data_preparation.ipynb` (rubric §2, 35%):
   - load the master dataset and item panel;
   - missing-value table (counts and %) and rationale;
   - fill the y/y and fuel gaps as above;
   - log transform for skewed variables (SPI levels, FX);
   - Min-Max and Z-score scaling demo;
   - dummy encoding (already done in the master; show and explain it).
2. Item-level panel: tidy week × item table, plus food and energy sub-indices from the basket
   weights (for H2).
3. `notebooks/02_eda.ipynb` (rubric §3, 35%):
   - summary table (mean, median, SD, IQR, skew) with resistant vs non-resistant comparison;
   - outliers by both course rules (1.5/3 IQR; 2/3 SD), discussing masking;
   - group-by quintile, a correlation matrix, and event-week vs other-week comparisons;
   - 3–4 Grammar-of-Graphics figures, for example: SPI by quintile over time; distribution of
     w/w % by quintile; Ramadan/Eid effect; food vs energy contribution.
4. 3–5 formal H0/H1 hypotheses, with a mapping to columns (Y, X, controls) (rubric §4, 15%).
5. Manuscript §II and §III as the M2 PDF (rubric §5, 15%), building on
   `manuscript/02_data_collection_audit.md`.
6. Team to verify the Pakistan Eid/Ramadan dates in
   `data/external/islamic_events_pk_overrides.csv` (all currently `verified=False`).

## 5. Decisions & rationale
- The sample starts on 5 Sep 2019 (the first 2015-16-base week). No splicing with the 2007-08 base.
- Source priority per week: live xlsx > live PDF > Wayback `weekly_spi_nb` > Wayback `weekly_spi`.
- Missing weeks are filled from the next report's official previous-week value (not imputation).
  PBS revisions use the latest vintage. Weeks are aligned to Thursdays.
- Fuel revisions are derived from the SPI petrol/diesel items. OGRA stays an extension (M5).
- FX comes from Yahoo `PKR=X` (no API key). The official SBP EasyData series is optional.
- Item categories are team-defined.
  - Q1 basket: 69% food, 18% energy. Combined basket: 62% food, 25% energy.
  - So Q1 is more food-exposed but *less* fuel-exposed, which revises the M1 "food and fuel" claim.
- Committed to git: code, docs, external lookups, catalogue, manifest, processed master.
  Not committed: raw files, interim CSVs, course materials.

## 6. Open questions
- **What is the real M2 deadline?** The syllabus says Week 7, which has passed.
- Does the team have instructor permission for generative-AI assistance? The syllabus requires
  permission and a declaration.
- Should H2 be reframed around food exposure (see Decisions)?
- Should the year-ago columns be used to extend the quintile series back to Sep 2018?
- Should the team register for SBP EasyData to get the official PKR/USD rate?

## 7. Key files
- `CLAUDE.md`: instructions, data facts, course conventions
- `milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`: grading spec
- `data/processed/master_weekly_quintile.csv` + `cleaning_report.txt`: the master dataset
- `data/interim/spi_items_weekly.csv`: item-level panel (regenerate with `parse_spi.py`)
- `src/scraping/*`, `src/cleaning/*`, `src/features/*`: pipeline
- `data/raw/spi_weekly/manifest.csv`: download audit trail
- `manuscript/02_data_collection_audit.md`: draft text for M2 §2.1
