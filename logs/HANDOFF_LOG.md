# Handoff Log (append-only)

Every version of `HANDOFF.md` is appended here automatically by
`.claude/hooks/log_handoff.py`. Newest entries are at the bottom.

**Claude: do not read this file unless it is actually needed.** It grows without bound.
If you need history, search it (`grep -n "Snapshot:" logs/HANDOFF_LOG.md`, then read only
the relevant range) rather than loading the whole file.


<!-- ===== HANDOFF SNAPSHOT 2026-10-03 15:03:10 ===== -->
# Snapshot: 2026-10-03 15:03:10

# HANDOFF

**Last updated:** 2026-10-03
**Session summary:** Project scaffolding: folder structure, CLAUDE.md, handoff/log system, git init.

## 1. Project overview
Course project for CS/SDP 312/314 (Data Science for Social Good). Using PBS weekly Sensitive
Price Indicator (SPI) data, base 2015-16 (2016 to present, about 540 weeks), we forecast next-week
price movements in essential items and test whether the lowest income quintile (Q1) faces higher
inflation and higher forecast error than the highest (Q5). SDGs 1, 2, 10. Policy angle: timing
and targeting of BISP. The final deliverable is a research paper, written incrementally.

## 2. Done so far
- **M1 (proposal):** submitted. Text is in `milestones/M1_proposal/Milestone1.docx`.
- **2026-10-03, project setup:**
  - Restructured the folder: `course/` (slides, syllabus), `milestones/` (M1, M2), `data/`
    (raw/external/interim/processed), `notebooks/`, `src/`, `reports/`, `manuscript/`, `logs/`.
  - Wrote `CLAUDE.md` (project overview + working conventions + session protocol).
  - Handoff system: this file, plus `logs/HANDOFF_LOG.md`, auto-appended by a PostToolUse
    hook (`.claude/hooks/log_handoff.py`, configured in `.claude/settings.json`).
  - Added `.claudeignore`, `.gitignore`, `README.md`, `requirements.txt`.
  - Initialised the git repo and made the initial commit.

## 3. Where we are now
- Scaffolding is complete. No data or code yet.
- `course/lecture_slides/` and `course/syllabus/` are **empty**. The original folders had no
  files in them, so the slides and syllabus still need to be copied in.
- M2 (Data Prep, EDA, Hypotheses) is the active milestone. Its rubric is in
  `milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`.

## 4. What's next
1. Add the lecture slides and syllabus to `course/`. Note the M2 due date here once known.
2. Set up the environment: `python -m venv .venv` and `pip install -r requirements.txt`.
3. Investigate the PBS SPI archive: URL patterns, Excel layout, and how the format changed over time.
4. Build a weekly SPI scraper (`src/scraping/`): polite, resumable, logs source URLs.
5. Parse and combine into two tidy tables: (a) week × group (Q1–Q5, combined);
   (b) week × item (51 items, national average prices).
6. Build the event calendar in `data/external/`: Ramadan/Eid, SBP MPC dates, fuel revisions.
7. Add the exchange-rate series (PKR/USD weekly), which H1 needs.
8. M2 deliverables: cleaning + missing-data report, transforms/encoding, EDA (univariate,
   outliers via z-score and IQR, bivariate), 3–4 publication-quality figures, 3–5 formal
   H0/H1 hypotheses with variable mapping, and manuscript §II–III.

## 5. Decisions & rationale
- Scope is the current base year only (2015-16 base, 2016 onward), to avoid splicing across base years.
- Raw data is kept out of git and must be reproducible from the scrapers.
- Course materials are kept out of git (copyright, size).

## 6. Open questions
- Source for the weekly PKR/USD exchange rate (SBP? which series?).
- Where to host the repo (GitHub, private?) and how the team will collaborate on it.
- M2 due date.

## 7. Key files
- `CLAUDE.md`: instructions and conventions
- `milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`: current grading spec
- `.claude/hooks/log_handoff.py`: handoff → log hook


<!-- ===== HANDOFF SNAPSHOT 2026-10-03 15:58:40 ===== -->
# Snapshot: 2026-10-03 15:58:40

# HANDOFF

**Last updated:** 2026-10-03 (session 2)
**Session summary:** Read the syllabus, slides and M2 rubric. Found and mapped the real SPI archive
(the live PBS site plus the Wayback Machine). Built the scrape → parse → master-dataset pipeline and the
supporting inputs (Eid calendar, FX, SBP decisions). The full download is running in the background.

## 1. Project overview
CS/SDP 312/314 course project (Data Science for Social Good). Using the PBS weekly Sensitive Price
Indicator (SPI, base 2015-16), we forecast next-week price movements and test whether the lowest
consumption quintile (Q1) faces higher inflation and higher forecast error than Q5. SDGs 1, 2 and 10.
Policy angle: timing and targeting of BISP. The final deliverable is a research paper, written
incrementally across the milestones.

## 2. Done so far
- **Session 1:** scaffolding, CLAUDE.md, handoff/log hook, git.
- **Session 2 (2026-10-03):**
  - Read the syllabus and Units 01–07. Added the course conventions (outlier rules, scaling,
    hypothesis tests, AI-use and late policies) and the milestone schedule to CLAUDE.md.
  - Set up `.venv` and installed requirements (added pdfplumber, hijridate, yfinance).
  - **Investigated the PBS archive.**
    - The live site embeds a JS catalogue covering only Jul 2023 onward; Excel exists only from
      Oct 2025.
    - The old PBS site is gone, but the Wayback Machine has about 1,550 SPI files from 2013–2025.
  - **Scope correction:** the 2015-16-base weekly SPI starts on **5 Sep 2019**, not 2016. Earlier
    weeks are base 2007-08 (53 items, different quintiles), so the sample is Sep 2019 – Oct 2026
    (~370 weeks).
  - `src/scraping/spi_catalogue.py`: 2,204 catalogued files. Filename date parser handles typos
    like `0204202`. Summary reports exist for 359 of 370 weeks; the gaps are mostly Eid weeks.
  - `src/scraping/spi_download.py`:
    - picks the best file per week, checks the base year (rejects 2007-08 files) and the file
      signature;
    - backs off on throttling and stops after 3 failed weeks in a row;
    - writes `data/raw/spi_weekly/manifest.csv`, the audit trail (committed).
  - `src/cleaning/parse_spi.py`:
    - quintile table: PDF positional column clustering;
    - item table: PDF text-flow extraction;
    - Excel: read cells directly;
    - fuzzy item matching to `data/external/spi_items.csv`.
    - First 130 files: 130/130 complete (6-row table, 51/51 items, base verified).
  - `data/external/spi_items.csv`: 51 items with IDs, a team-defined category, and the 2015-16
    weights (Q1, Combined).
  - `src/features/build_event_calendar.py` → `data/external/islamic_events.csv` (Ramadan, Eid
    ul-Fitr, Eid ul-Adha, 2018–2027).
  - `src/scraping/fx_rates.py` → `data/raw/fx/pkr_usd_daily_yahoo.csv` (2018-06 → 2026-10, complete).
  - `src/scraping/sbp_mps.py`: parses date and decision from archived SBP Monetary Policy
    Statements (2018 – Apr 2026). Queued to run after the SPI download.
  - `src/cleaning/build_master.py` → `data/processed/master_weekly_quintile.csv`:
    - 1 row = week × group; 35 columns, including group dummies, lags, FX, fuel-revision flag,
      Ramadan/Eid day counts and policy rate;
    - target = next week's % change;
    - decisions D1–D5, with counts in `data/processed/cleaning_report.txt`.
    - Tested on the partial data (798 rows).
  - `manuscript/02_data_collection_audit.md`: draft of M2 §2.1 / manuscript §II.1.
  - Commit `2286d39`.

## 3. Where we are now
- **Background job running:** the SPI download resumes from 2022-03, then `sbp_mps.py` runs.
  - Logs: `logs/spi_download_run.log` and `logs/sbp_mps_run.log` (gitignored).
  - If it was interrupted, re-run `python src/scraping/spi_download.py` (resumable), then
    `python src/scraping/sbp_mps.py`.
- The **Wayback Machine blocked the IP** for a while after two scrapers ran in parallel.
  - Rule: only ONE Wayback stream at a time.
  - Wayback pacing is now 4–5 s per request, with a circuit breaker.
- After the download, run in order: `parse_spi.py` → `build_master.py`. Then check the parse log
  and cleaning report. `data/processed/*` is not committed yet, because it was built from
  partial data.
- **Known data issues to handle in cleaning / EDA:**
  - Two PBS revisions of the previous week's index (12 Sep 2019, 11 Feb 2021; 0.02–0.09 points,
    all groups). Keep the reported current-week values.
  - Electricity and gas items were renamed ("upto 50 Units" / "upto 3.3719 MMBTU" became
    "for Q1"). Check these series for level breaks.
  - FX bad ticks on 1 Aug 2022 and 19 Sep 2022 are dropped in D4. Other >5% jumps are real
    (Oct 2018, Jan 2023 cap removal, Mar 2023).
  - `weeks_to_ramadan` resets during Ramadan; review the design at the feature stage.
- **Timeline concern:** the syllabus lists M2 in **Week 7 (Sep 28 – Oct 2)**, which has passed.
  The actual due date needs to be confirmed with the user or instructor.

## 4. What's next
1. When the background job finishes, run `parse_spi.py` and `build_master.py`, review the logs,
   and commit the processed data and manifest.
2. Add SBP decisions after Apr 2026 (Jun, Jul and Sep 2026 MPCs) to
   `data/external/sbp_mpc_decisions_manual.csv` from SBP press releases
   (e.g. `sbp.org.pk/assets/documents/press-release/PR-14-Sep-2026.pdf`), then check the
   parsed decisions against known rates.
3. Team to verify the Pakistan Eid/Ramadan dates in `data/external/islamic_events_pk_overrides.csv`.
4. Item-level panel (week × item) as a secondary dataset, with category sub-indices (food vs
   energy) using the basket weights. This is useful for H2.
5. M2 notebook `notebooks/01_data_preparation.ipynb`, covering rubric §2:
   - missing-value table (counts and %) with the handling rationale;
   - log transform for skewed variables;
   - Min-Max / Z-score scaling;
   - dummy encoding.
6. `notebooks/02_eda.ipynb`, covering rubric §3:
   - summary table (mean, median, SD, IQR) and skew;
   - outliers by both rules (1.5/3 IQR and 2/3 SD);
   - group-by and correlation analysis;
   - 3–4 publication-quality figures.
7. Formal hypotheses (3–5, H0/H1) with variable mapping to master-dataset columns (rubric §4).
8. Manuscript §II (Data & Preprocessing) and §III (EDA) as the M2 PDF.

## 5. Decisions & rationale
- Sample starts on 5 Sep 2019, the first 2015-16-base week; no splicing with the 2007-08 base.
- Source priority per week: live Excel > live PDF > Wayback `weekly_spi_nb` > Wayback `weekly_spi`.
- Missing weeks are filled from the next report's official previous-week value (not imputation).
- Weeks are aligned to the nearest Thursday.
- Fuel revisions are derived from the SPI petrol/diesel items (|w/w| > 1%); OGRA remains an
  extension.
- FX comes from Yahoo `PKR=X` (no API key needed). Replace it with SBP EasyData if the team registers.
- Item categories (food / energy / clothing_footwear / household) are team-defined.
  - Q1 basket: 69% food, 18% energy. Combined basket: 62% food, 25% energy.
  - This revises the M1 claim that Q1 is more exposed to "food and fuel": the gap is in food only.
- Course materials and raw data stay out of git. The catalogue and manifest are committed for audit.

## 6. Open questions
- **What is the real M2 deadline?** The syllabus says Week 7, which has passed.
- Does the team have instructor permission for generative-AI assistance? The syllabus requires
  permission and a declaration.
- Should H2 be reframed around food exposure rather than "food and fuel" (see Decisions)?
- Should the year-ago columns be used to extend the quintile series back to Sep 2018?
- Should the team register for the SBP EasyData API to get the official PKR/USD rate?

## 7. Key files
- `CLAUDE.md`: instructions, data facts, course conventions
- `milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`: grading spec
- `src/scraping/spi_catalogue.py`, `spi_download.py`: SPI collection
- `src/cleaning/parse_spi.py`, `build_master.py`: parsing and master dataset
- `data/raw/spi_weekly/manifest.csv`: download audit trail
- `data/interim/spi_parse_log.csv`, `data/processed/cleaning_report.txt`: QA outputs
- `manuscript/02_data_collection_audit.md`: draft text for M2 §2.1


<!-- ===== HANDOFF SNAPSHOT 2026-10-03 16:35:23 ===== -->
# Snapshot: 2026-10-03 16:35:23

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


<!-- ===== HANDOFF SNAPSHOT 2026-10-03 22:03:19 ===== -->
# Snapshot: 2026-10-03 22:03:19

# HANDOFF

**Last updated:** 2026-10-03 (session 3)
**Session summary:** Confirmed the M2 deadline (6 Oct). Analysed the evidence on H2 and proposed a reframe, which is
awaiting the user's decision. Added item impacts to the parser. Built and executed `notebooks/01_data_preparation.ipynb`,
which produces the modeling-ready datasets and the data dictionary.

## 1. Project overview
CS/SDP 312/314 course project (Data Science for Social Good). Using the PBS weekly Sensitive Price Indicator (SPI,
base 2015-16), we forecast next-week price movements and compare how inflation and its predictability differ across
consumption quintiles (Q1 poorest … Q5 richest). SDGs 1, 2 and 10. Policy angle: timing and targeting of BISP.
Deliverable: a research paper, written incrementally. **M2 (data prep, EDA, hypotheses; manuscript §II–III) is
due 2026-10-06.**

## 2. Done so far
- **Session 1:** scaffolding, CLAUDE.md, handoff/log hook, git.
- **Session 2:**
  - Mapped the real SPI archive: the live PBS site plus the Wayback Machine (old PBS site).
  - Scope correction: the 2015-16-base weekly SPI starts on 5 Sep 2019, giving 370 weeks.
  - Pipeline built and run:
    - 359 reports downloaded (222 Wayback, 137 live); all 359 parsed completely;
    - 11 missing weeks recovered from PBS's own previous-week values, so 370/370 weeks;
    - master dataset: 2,220 rows (week × group).
  - Supporting inputs: SBP decisions (66, Jan 2018 – Sep 2026), PKR/USD (Yahoo), Ramadan/Eid calendar.
  - `manuscript/02_data_collection_audit.md`: draft of M2 §2.1.
- **Session 3 (2026-10-03):**
  - The parser now also captures **item impacts** (`impact_q1`, `impact_combined`: each item's contribution, in
    percentage points, to the week's change).
    - Check: impacts sum to the reported weekly change (median difference 0.002 pp).
    - PBS error found: on 5 Sep 2019 the Combined impact column duplicates the Q1 column. Set to NaN in the notebook.
  - `src/utils/plot_style.py`: shared figure style (colour-blind-validated palette, fixed group colours: Q1 orange,
    Q5 blue, Combined grey).
  - **`notebooks/01_data_preparation.ipynb`** (20 code cells, runs cleanly on the `ds4sg` kernel, outputs saved).
    It covers rubric §1.2 and §2.1–2.4:
    - inventory table; collection-audit summary;
    - pivot/melt round trip;
    - complete item panel (week × 51 items; 561 prices filled from the next report);
    - category contributions joined onto the master dataset;
    - missing-value tables before and after, with three types and strategies:
      - year-ago SPI from the 52-week lag (agrees with reported values 99.7% within 0.5 points);
      - fuel % recomputed from the completed item panel;
    - **selection bias:** Eid-window weeks are 8.9% of all weeks but 64% (7/11) of the weeks without a report;
    - skewness table and interpretation; Figure P1 (`reports/figures/figP1_log_transform.png`);
    - Min-Max and Z-score scaling with training-period statistics only (train ≤ 2024-12-31);
      parameters in `reports/tables/scaling_parameters.csv`;
    - dummies for group and MPC action (hike/cut/hold; reference: no meeting);
    - decision summary table (D1–D5, P1–P7).
    - Outputs:
      - `data/processed/master_model_ready.csv` (2,220 × 70);
      - `data/processed/items_weekly_panel.csv` (18,870 × 18);
      - `data/processed/DATA_DICTIONARY.md` (generated, every column described).
  - Registered the venv as a Jupyter kernel, `ds4sg` (setup line in the README).

## 3. Where we are now
- **H2 reframe proposed; the user is deciding.** Evidence (Sep 2019 – Oct 2026):
  - Cumulative inflation: Q1 179% (the lowest of all groups), Q5 193%, Q3 202%, Combined 198%.
  - By period:
    - 2019–21 (food-driven): Q1 38.8% vs Q5 33.9%, so Q1 was hit hardest;
    - 2022–23 (energy and currency shock): Q1 74.0% vs Q5 83.1% (Q3 91.5%);
    - 2024–26: Q1 15.0% vs Q5 18.2%.
  - Contributions, 2022–23: energy added ~11.4 pp to Q1 vs ~24.2 pp to Combined; food added 38.0 vs 33.2.
  - Weekly volatility (SD of w/w %): Q1 1.08, Q5 0.96, Q2 1.28 (not monotonic across quintiles).
  - Most volatile items: gas (SD 26), tomatoes (21), onions (10), electricity (7.9), chicken (7.3).
  - Proposed: **H2** = the Q1–Q5 inflation gap depends on the shock's source (food vs energy), and
    **H3** = Q1 is harder to forecast because of perishable food. Details in the session-3 chat.
  - Caveat: PBS publishes weights and impacts only for Q1 and Combined, not Q5.
- The notebook writes `reports/tables/missing_values_*.csv`. The generator script used to build the notebook is not
  in the repo; edit the notebook directly from now on.
- Interim CSVs are gitignored; regenerate them with `parse_spi.py` before running the notebook in a fresh clone.

## 4. What's next
1. Record the user's decision on the H2 reframe and update CLAUDE.md's hypotheses section.
2. `notebooks/02_eda.ipynb` (rubric §3, 35%):
   - summary table (mean, median, SD, IQR, skew), with resistant vs non-resistant statistics;
   - outliers by both course rules (1.5/3 × IQR; 2/3 SD), plus masking/swamping discussion;
   - by-quintile group-bys, a correlation matrix, and event-week vs other-week comparisons;
   - 3–4 Grammar-of-Graphics figures, for example:
     - SPI by quintile over time (log scale);
     - distribution of w/w % by quintile;
     - food vs energy contributions by period (Q1 vs Combined);
     - Ramadan/Eid effect.
3. Formal hypotheses: 3–5, in H0/H1 notation, each mapped to columns (Y, X, controls) (rubric §4).
4. Manuscript §II (Data & Preprocessing) and §III (EDA) as the M2 PDF, building on the audit draft and notebook 01.
5. Team to verify the Pakistan Eid/Ramadan dates (`data/external/islamic_events_pk_overrides.csv`, all unverified).

## 5. Decisions & rationale
- Sample: 5 Sep 2019 – 1 Oct 2026 (first 2015-16-base week onward); no splicing with the 2007-08 base.
- Missing weeks are filled from official previous-week values (index and item prices); revisions use the latest
  vintage; weeks are aligned to Thursdays.
- No mean/median imputation; structural NaNs (lags, target at the series ends) are dropped listwise when modeling.
- Year-ago SPI comes from the 52-week lag where it isn't reported.
- Logs: SPI and FX because they grow multiplicatively (not skewed as distributions); item prices because they are
  heavily right-skewed.
- Scaling statistics come from the training period only (≤ 2024-12-31), to prevent leakage. The split is provisional
  until M3.
- Item categories are team-defined. Q1 basket: 69% food, 18% energy. Combined basket: 62% food, 25% energy.
- FX comes from Yahoo `PKR=X`; fuel revisions are derived from the SPI petrol/diesel items.

## 6. Open questions
- Should H2 be reframed (shock-source gap) and H3 added (predictability)? Awaiting the user.
- Should the year-ago columns be used to extend the quintile series back to Sep 2018?
- Should the team register for SBP EasyData to get the official PKR/USD rate?
- `weeks_to_ramadan` jumps from about 0 to about 50 when Ramadan starts. Replace it with a pre-Ramadan window flag in EDA/modeling?

## 7. Key files
- `CLAUDE.md`: instructions, data facts, course conventions, milestone dates
- `milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`: grading spec
- `notebooks/01_data_preparation.ipynb`: M2 §2 notebook
- `data/processed/master_model_ready.csv`, `items_weekly_panel.csv`, `DATA_DICTIONARY.md`
- `src/scraping/*`, `src/cleaning/*`, `src/features/*`, `src/utils/plot_style.py`
- `manuscript/02_data_collection_audit.md`: draft text for M2 §2.1


<!-- ===== HANDOFF SNAPSHOT 2026-10-04 16:43:32 ===== -->
# Snapshot: 2026-10-04 16:43:32

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


<!-- ===== HANDOFF SNAPSHOT 2026-10-06 20:44:34 ===== -->
# Snapshot: 2026-10-06 20:44:34

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


<!-- ===== HANDOFF SNAPSHOT 2026-10-06 21:07:18 ===== -->
# Snapshot: 2026-10-06 21:07:18

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


<!-- ===== HANDOFF SNAPSHOT 2026-10-21 11:10:23 ===== -->
# Snapshot: 2026-10-21 11:10:23

# HANDOFF

**Last updated:** 2026-10-21 (session 6)
**Session summary:** Built Milestone 3 end to end:
- baseline models (LR, KNN, shallow tree) with naive benchmarks, leakage-free expanding-window CV, cost-based
  thresholds, error analysis and feature importance (`notebooks/03_baseline_models.ipynb`, `src/models/`);
- tests of H1–H3 (`notebooks/04_hypothesis_tests.ipynb`);
- manuscript Sections IV–V (Word + PDF, 12 pp, 3,000 body words);
- the viva study guide `DS4SG_M3_Reference.docx`.

M3 is due **2026-10-24**.

## 1. Project overview
CS/SDP 312/314 project. Using the PBS weekly Sensitive Price Indicator (SPI, base 2015-16, 370 weeks, Sep 2019 – Oct 2026),
we build **an early-warning system for essential-price shocks for each consumption quintile** (Q1 poorest … Q5 richest)
and test whether it works as well for the poor as for the rich. SDGs 1, 2 and 10; the policy angle is timing BISP
top-ups.

Lens: the burden of inflation rotates. M3 refined it: **motor-fuel shocks hit Q5 harder; food, perishables and
utility-tariff shocks hit Q1 harder.**

## 2. Done so far
- **Sessions 1–3:** scaffolding, handoff hook, git; SPI archive scraped (370/370 weeks); SBP decisions, FX, Ramadan/Eid
  calendar; notebook 01 → `master_model_ready.csv`, `items_weekly_panel.csv`, `DATA_DICTIONARY.md`; collection audit.
- **Session 4:** quintile insights; narrative chosen; `build_features.py` → `master_features.csv` (2,220 × 105);
  notebook 02 (EDA, Figures E1–E5, hypotheses H1–H5).
- **Session 5:** team-verified Eid/Ramadan dates moved into the overrides file; pipeline re-run; M2 manuscript
  (Sections II–III). **M2 was submitted and got full marks** ("Good work"). The submitted files (team-edited PDF
  `M2_manuscript_draft (1).pdf`, 13 pp, and the two notebooks) are in `milestones/M2_data_eda_hypotheses/`. They are
  untracked: the user added them and they were not committed. The submitted PDF differs in wording from
  `tools/build_manuscript_m2.js`: the team edited it in Word.
- **Session 6 (2026-10-21): Milestone 3.**
  - **`src/models/baseline.py`:** all modelling code and decisions B1–B8 in its docstring. It covers:
    - the 18 features in blocks: own history, H1 signals, component momentum, controls, quintile dummies (Q5 = reference);
    - the chronological split and expanding-window folds (validation years 2021–24, whole weeks);
    - the three pipelines and grids;
    - `grid_search_time_cv()`, which selects by pooled out-of-fold AUC;
    - metrics, cost-based threshold, DeLong test, week-block bootstrap, clustered logit and `save_models()`.
  - **`src/models/train_baselines.py`:** a command-line run of the same steps (about 20 s). Its test predictions are
    identical to the notebook's (checked).
  - **`notebooks/03_baseline_models.ipynb`** (49 cells, runs cleanly in about 1.5 min), §1–§12: split and class balance;
    CV design (figB1) and leakage checklist; benchmarks; model justification and tuning (figB2); shuffled-CV leakage demo;
    test metrics with bootstrap CIs (figB3) and by quintile; asymmetric costs (figB4); confusion matrices (figB5);
    every test shock week with its driver; false-alarm profile; week-by-week forecasts (figB6); feature importance
    (figB7) and tree rules (figB8); H1 test; saved artifacts; findings, policy takeaways and M4 roadmap.
  - **`notebooks/04_hypothesis_tests.ipynb`:** H2 (Q5 − Q1 difference regression, HAC errors; figB9) and H3 (gap
    regression plus an exploratory component split; figB10). Training period only, so no 2025–26 data are used.
  - **Model artifacts:** `models/m3_baselines/{logistic_regression,knn,decision_tree}.joblib` and `model_card.json`.
  - **Tables:** `reports/tables/m3_*.csv` (24 files).
  - **Manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
    `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
    - Numbering continues M2: Section IV, Tables 14–23, Figs. 7–13, refs [11]–[21].
    - User instruction: **new sections only**. No word limit was given; it is held at 3,000 body words.
    - New refs: FAO Mongolia early action (US$7.1 per US$1), BISP Kafaalat Rs 13,500/quarter, scikit-learn, Bergmeir &
      Benítez, Elkan, Saito & Rehmsmeier, Sun & Xu, Breiman, Hastie et al., Moreno-Torres et al., Dawes.
  - **Reference doc:** `tools/build_m3_reference_doc.js` → `DS4SG_M3_Reference.docx` (root), in the same style as
    the project reference doc. Contents:
    - files, with function-by-function and section-by-section tables;
    - figures and tables;
    - a concepts glossary (simple + detailed);
    - 19 decisions B1–B19 (simple + detailed + alternatives + where in code);
    - key-numbers cheat sheet, 25 viva Q&As, and a files × steps matrix.

    The contents list is static and hyperlinked, so Word needs no field update.
  - `prepare_manuscript_figures.py` now also crops the M3 figures. CLAUDE.md now records the milestone status, the M3
    rubric weights and the `models/` and `tools/` folders.
  - **Headline results:**
    - **CV:** pooled AUC LR 0.643, KNN 0.643, tree 0.652, against 0.584 for persistence and 0.467 for the majority
      class. Shuffled K-fold would inflate AUC by 0.05–0.14.
    - **Test 2025–26:** KNN AUC 0.68 [0.47, 0.83], recall 20/35. Shocks were 7.7% vs 17.2% in training (prior
      shift), and at FN:FP = 5:1 no model beats "never alert" on cost (1.04–1.23). In 2021–24 the models were 33–39%
      cheaper than never alerting.
    - **Drivers:** rupee 8-week change (odds ratio 1.11 per 1%), recent shocks, food momentum; a fiscal-year start
      gives OR 5.3.
    - **Misses:** first waves, utility tariffs, perishables. False alarms follow past shocks.
    - **H1:** in sample, Wald (clustered) p = 0.001; out of sample on the test, DeLong p = 0.42.
    - **H2:** not supported (pass-through equal, δ = 0.04, p = 0.27).
    - **H3:** food is supported (β = 0.12, p = 0.003); energy is not (+0.04). The split shows motor fuel −0.07 and
      utility tariffs +0.03 (exploratory).
  - Commits: `0c29528` (models, notebooks), `4e0ae76` (manuscript), plus the final commit of this session (reference
    doc, CLAUDE.md, handoff).

## 3. Where we are now
- **M3 deliverables are complete:** notebooks 03 and 04 (both run cleanly), scripts in `src/models/`, models in
  `models/m3_baselines/`, the PDF manuscript and the reference/viva doc. They still need a team read-through.
- **Notebooks are now the source.** They were generated by builder scripts in a session scratchpad (not kept). Edit
  the notebooks directly from now on.
- **Rebuilding docs** needs the npm package `docx` (not in the project): `npm install docx` in any folder, then
  `NODE_PATH=<that folder>/node_modules node tools/build_manuscript_m3.js manuscript/M3_manuscript_sections_IV_V.docx`
  (same for `tools/build_m3_reference_doc.js DS4SG_M3_Reference.docx`).
- **Word automation (COM):**
  - `ExportAsFixedFormat` works when exporting to a folder outside the project.
  - This session it hung after the laptop lid was closed. The force-killed Word instances then left
    Document Recovery entries (`HKCU\Software\Microsoft\Office\16.0\Word\Resiliency\DocumentRecovery`), and new hidden
    instances hung (probably behind a recovery prompt). Opening Word once interactively and dismissing recovery should
    fix it; the registry was not touched.
  - Because of this, `DS4SG_M3_Reference.docx` was validated as XML (docx skill validator: all passed) but **not
    visually checked or exported to PDF**. Open it in Word once and skim the layout.
- **Known caveats (disclosed in the notebook and manuscript):**
  - the momentum-item basket was chosen on all training years, so it sees later CV folds (never the test);
  - the LR is shrunk to the grid edge (C = 1e-4), on a flat plateau; its probabilities are uncalibrated (Brier 0.24);
  - the test period has only 13 distinct shock weeks.
- Local commits are not pushed (user to push).

## 4. What's next
1. **By 2026-10-24 (M3 due):**
   - the team reads the PDF and the notebooks and fixes anything flagged: edit `tools/build_manuscript_m3.js`,
     rebuild, re-check `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx`, re-export;
   - submit the PDF, `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`,
     `src/models/baseline.py` and `src/models/train_baselines.py` (plus `models/m3_baselines/` if artifacts are
     uploaded);
   - late penalty: 20% within 24 h.
2. **Viva prep (5 minutes, V-factor):** every member studies `DS4SG_M3_Reference.docx` §6 (decisions), §7 (numbers)
   and §8 (Q&A), and re-runs notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.**
   - Ensembles (random forest, gradient boosting) under the same protocol (yearly folds, pooled-AUC selection,
     out-of-fold cost threshold).
   - H4: quintile-specific vs pooled models with signal × group interactions (LR test).
   - Calibration (Platt/isotonic, reliability plots).
   - New features: a NEPRA/OGRA tariff-notification calendar, OGRA fuel decisions, and a rolling shock-rate (regime)
     feature.
   - H5 fairness: Brier and miss rate Q1 vs Q5 with the Diebold–Mariano test, equal opportunity (recall parity), and
     welfare-weighted thresholds by quintile.
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
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: Q1 prices stay 4.2% higher 8 weeks after a shock, Rs 355/month ≈ 8% of Kafaalat, and FAO's
    7:1 return on early action.
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
  - B16: the test is used once; no re-tuning after seeing it.
  - B17: a shock's driver is the largest *upward* PBS item impact.
  - B18: the momentum-basket exception is disclosed.
  - B19: fixed seed 42, and the script reproduces the notebook.
- **Manuscript:** M3 = new sections only (user). Numbering continues M2. The style matches M2: black text, Times New
  Roman, no header or footer, three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Does the team accept FN:FP = 5:1 as the headline cost ratio? This is a value judgement and the SDP members should
  sign off. The sensitivity analysis shows the conclusion holds at any ratio.
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
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv`.
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`.


<!-- ===== HANDOFF SNAPSHOT 2026-10-22 09:04:47 ===== -->
# Snapshot: 2026-10-22 09:04:47

# HANDOFF

**Last updated:** 2026-10-22 (session 7)
**Session summary:** Full audit of Milestone 3 (code, data, results, insights). No code or result errors were found;
everything reproduces exactly. Several interpretation errors and overclaims were fixed in the notebooks, the manuscript
and the viva guide, and one methodological caveat (pooled AUC partly measures regime tracking) is now disclosed.

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

## 3. Where we are now
- **M3 deliverables are complete and audited.** The team still needs a read-through.
- **PENDING:** `DS4SG_M3_Reference.docx` in the root is the OLD version. It was open in the user's Word (lock file
  `~$4SG_M3_Reference.docx`), so it could not be overwritten. `tools/build_m3_reference_doc.js` holds the fixes.
  After closing it in Word, rebuild it:
  `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js DS4SG_M3_Reference.docx`
  (the docx package is not in the project: `npm install docx` in any folder), then commit it.
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
   - close the reference doc in Word and rebuild it (above);
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
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`; rebuild pending, see §3).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`.


<!-- ===== HANDOFF SNAPSHOT 2026-10-22 10:09:32 ===== -->
# Snapshot: 2026-10-22 10:09:32

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


<!-- ===== HANDOFF SNAPSHOT 2026-10-22 12:04:46 ===== -->
# Snapshot: 2026-10-22 12:04:46

# HANDOFF

**Last updated:** 2026-10-22 (session 7)
**Session summary:** Full audit of Milestone 3 (code, data, results, insights), then a lecture-scope pass after the
user added the Unit 08–11 slides: methods from beyond the lectures were cut down to a few meaningful ones, the hand-coded
DeLong test was replaced by the week-block bootstrap, and jargon was replaced by plain words. No model, threshold or
result changed.

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
- **Session 7 (2026-10-22), part 1: audit** (commits `1092762`, `b464a62`; pushed to origin).
  - **Verified correct:** target and feature timing (no week t+1 leakage), disjoint folds, byte-identical re-runs of
    both notebooks (tables, figures, models), script = notebook, independent recomputation of all metrics and costs.
  - **Interpretation fixes:** shock persistence measured against ordinary weeks (4.2% vs 1.9%); fiscal-year OR 5.3
    rests on 5 fiscal years (CI 1.4–19.5) and July shocks mostly fall after its first week; the 20:1 "never beat
    never-alert" claim; manuscript V-C contradiction with Table 20; permutation leaders; utility tariffs not significant
    (p = 0.10); KNN dip range; sister rows 82%; Fig B4 legend; Table 22 momentum row.
- **Session 7, part 2: lecture-scope pass** (user request: few methods from beyond the lecture slides, only meaningful
  ones). Slides now cover Units 01–11 (Unit 08–09 trees, 10 accuracy measures, 11 KNN); the syllabus also covers CV
  (Week 7), logistic regression (Week 9), regression (Week 10).
  - **Removed:** the year-level "oracle" diagnostic (the pooled-AUC caveat is now shown with the tree's own yearly AUCs:
    pooled 0.652 beats three of its four years); the hand-coded DeLong test (`_midrank`, `delong_test`, Sun & Xu); the
    Bayes-threshold formula (and Elkan ref); "prior shift" (and Moreno-Torres ref); "improper linear model" (Dawes ref);
    "bias–variance" wording; saga/liblinear intercept explanation; Platt/isotonic, "equal opportunity", "welfare
    weights" in the M4 plan (now plain words).
  - **H1 out of sample** now uses the week-block bootstrap only (gain +0.007, 95% CI −0.08 to +0.10, p = 0.45); the
    manuscript and notebook say why the DeLong test planned in M2 [9] was replaced (assumes independent rows).
    `m3_h1_tests.csv` lost its DeLong row; every other table, figure and model is byte-identical.
  - **Lecture ties added:** Euclidean distance and KNN limitations (Unit 11), Gini (Units 08–09), metrics, threshold
    sweep and PR-AUC homework (Unit 10), bootstrap and cluster sampling (Unit 04), CIs (Unit 06).
  - Manuscript references renumbered [11]–[17] in order of first citation; body 3,349 words, 12 pages; PDF re-exported.
  - Viva guide: new §5.8 "Methods beyond the lecture slides" and two viva questions (27 → 29); 29 pages.

## 3. Where we are now
- **M3 deliverables are complete, audited and lecture-scoped.** The team still needs a read-through.
- **Methods kept from beyond the slides** (see decisions below): expanding-window CV, permutation importance, standard
  errors clustered by week; carried from the M2 plan: logit LR test, OLS with HAC errors, Brier score, Diebold–Mariano
  (M4 plan only).
- **Rebuilding the viva guide:** `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js
  DS4SG_M3_Reference.docx` (the docx package is not in the project: `npm install docx` in any folder). Close the file
  in Word first, or the write fails with EBUSY.
- **Notebooks are the source** (the scratchpad builders are gone): edit them directly.
- **Word automation (COM):**
  - Works via a NEW hidden instance, exporting to a folder outside the project.
  - A start can fail with CO_E_SERVER_EXEC_FAILURE and leave a window-less WINWORD behind; stop only that new PID and
    retry (the second try worked).
  - In PowerShell use `$w.Quit()`, not `$w.Quit(0)`. Never touch the user's own Word process.
- **Known caveats (disclosed):**
  - The momentum basket was chosen on all training years (it sees later CV folds, never the test).
  - The LR is at the grid edge C = 1e-4 on a flat plateau, uncalibrated (Brier 0.24).
  - The test has 13 distinct shock weeks.
  - Pooled AUC partly rewards telling crisis years from calm ones (flattered the tree).
  - Edge-case drivers use Combined-index item impacts (no Q2–Q5 item weights exist).
- The lecture-scope commit is local (not pushed).

## 4. What's next
1. **By 2026-10-24 (M3 due):**
   - the team reads the PDF and the notebooks; to fix the manuscript, edit `tools/build_manuscript_m3.js`, rebuild,
     re-check `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx`, and re-export the PDF;
   - submit the PDF, `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`,
     `src/models/baseline.py` and `src/models/train_baselines.py` (plus `models/m3_baselines/` if artifacts are
     uploaded);
   - late penalty: 20% within 24 h.
2. **Viva prep (5 minutes, V-factor):**
   - every member studies the reference doc §5.8 (methods beyond the slides), §6 (decisions), §7 (numbers) and §8
     (Q&A, 29 questions);
   - be ready for "why was the tree best in CV but worst on test?" and "why a bootstrap instead of DeLong?";
   - re-run notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.** Keep new methods within the lectures/syllabus where
   possible (ensembles are Week 12, fairness Week 15).
   - Ensembles (random forest, gradient boosting) under the same protocol. Report within-year AUC next to pooled AUC
     and decide the selection criterion before looking at the test.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (probabilities that match observed shock rates; Brier score).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock rate.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano, planned in M2), equal recall across quintiles,
     quintile-specific thresholds.
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
- **Lecture scope (user, 2026-10-22):** methods should come from the lecture slides, syllabus or rubric; only a few
  meaningful outside methods, each with a one-line reason (reference doc §5.8). Kept: expanding-window CV (shuffled
  K-fold leaks, +0.05–0.14 AUC), permutation importance (KNN has no coefficients), week-clustered SEs (sister rows;
  LR χ² 94 vs 22.4). M2-plan items (LR test, HAC, Brier, Diebold–Mariano) stay because M2 committed to them.
- **M3 modelling** (IDs as in `baseline.py` and the reference doc):
  - B1: Q1–Q5 rows only. Combined is excluded as a near-duplicate average.
  - B2: chronological split (train ≤ 2024, test 2025–26; 74.8/25.2), fixed in M2. A stratified random split was
    rejected because it would leak the future and split sister rows.
  - B3: expanding-window CV with K = 4 calendar years 2021–24 and whole weeks together; no gap is needed for a
    1-week target.
  - B4: scaling inside pipelines. LR z-scores all features; KNN scales only the continuous features (z-score won);
    0/1 flags pass through; the tree is unscaled; the M2 `*_z` columns are not used (they leak inside CV).
  - B5: selection by **pooled out-of-fold ROC-AUC** (one threshold must work in every year); mean ± SD per fold also
    reported. Caveat: pooled AUC partly rewards telling crisis years apart; kept as planned (changing it after the test
    would be leakage, B16).
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: a Q1 shock's step is not given back (4.2% vs 1.9% after 8 weeks), Rs 355/month ≈ 8% of Kafaalat,
    and FAO's 7:1 return on early action.
  - B8: listwise deletion of 9 weeks.
  - B9: LR + KNN + shallow tree (the user chose this), with majority-class and persistence benchmarks.
  - B10: 18 features; only the 8-week FX change.
  - B11: grids were extended at their edges. LR uses saga (fits both L1 and L2). KNN k ≤ 250, limited by fold 1's size.
  - B12: three importance measures. Permutation importance is computed on the CV folds, not the test. Odds ratios
    come from an unpenalised logit with week-clustered SEs.
  - B13: H1 is tested with a week-clustered Wald test in sample and a week-block bootstrap out of sample (the DeLong
    test planned in M2 was replaced: it assumes independent rows).
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
- Should M4 include walk-forward retraining already (it would address the changing shock rate), or leave it for M5 as
  planned?
- Should the submitted M2 files in `milestones/M2_data_eda_hypotheses/` be committed as the official record?
- Carry-overs:
  - Which source did Sarah use for the Eid/Ramadan dates (for citation)?
  - Extend the series back to Sep 2018 with the year-ago columns?
  - Register for SBP EasyData (official PKR/USD)?

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **Lecture slides:** `course/lecture_slides/` Units 01–11 (not in git); syllabus in `course/syllabus/`.
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


<!-- ===== HANDOFF SNAPSHOT 2026-10-25 21:19:05 ===== -->
# Snapshot: 2026-10-25 21:19:05

# HANDOFF

**Last updated:** 2026-10-25 (session 8)
**Session summary:** Checked that the notebooks and code match the lecture-scoped M3 report (they did; one unused
import removed), and removed every Claude/tooling reference from the deliverables: notebooks now find the project root
via `requirements.txt`, and the script reference doc no longer lists the handoff hook or session files. All four
notebooks re-ran cleanly with byte-identical outputs.

M3 was due **2026-10-24**; its submission status was not recorded this session.

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
- **Session 7 (2026-10-22): audit and lecture-scope pass** (commits `1092762`, `b464a62`, `7d341d7`; all pushed).
  - Audit: target/feature timing, folds, reproducibility and every metric verified; interpretation fixes (shock
    persistence vs ordinary weeks, fiscal-year OR on 5 years, utility tariffs not significant, etc.).
  - Lecture scope: removed the year-level oracle, the hand-coded DeLong test, the Bayes-threshold formula and jargon
    (prior shift, improper linear model, bias–variance, Platt/isotonic, equal opportunity, welfare weights); H1 out of
    sample now uses the week-block bootstrap (gain +0.007, 95% CI −0.08 to +0.10, p = 0.45). Lecture ties added (Units
    04, 06, 08–11). Manuscript 12 pages, 3,349 body words; viva guide §5.8 "Methods beyond the lecture slides", 29
    questions.
- **Session 8 (2026-10-25): consistency and clean-up.**
  - Notebooks 03/04 and `baseline.py` already matched the trimmed report (no DeLong, oracle or dropped jargon left).
    Removed the unused `statsmodels` import from notebook 03.
  - All four notebooks found the project root by looking for `CLAUDE.md`; they now look for `requirements.txt`.
  - `tools/build_reference_doc.js`: removed the handoff-hook entry, the CLAUDE.md/HANDOFF/log/.claudeignore rows and
    the hook sentence; `DS4SG_Script_and_Data_Reference.docx` rebuilt (TOC updated in Word; text otherwise identical).
  - Grep of all tracked deliverables (notebooks incl. outputs, src, tools, docx/PDF text and metadata, README, data
    dictionaries, reports) finds no Claude/handoff/AI mention.
  - Re-ran notebooks 01–04 top to bottom: all pass; all 80 output files (data, tables, figures, models) byte-identical.

## 3. Where we are now
- **M3 deliverables are complete, audited, lecture-scoped and free of tooling references.**
- **Methods kept from beyond the slides:** expanding-window CV, permutation importance, standard errors clustered by
  week; carried from the M2 plan: logit LR test, OLS with HAC errors, Brier score, Diebold–Mariano (M4 plan only).
- **Repo-level session files stay** (CLAUDE.md, HANDOFF.md, logs/, .claude/, .claudeignore): the repo is for the team
  only; the instructor sees only the submitted reports and notebooks (user, 2026-10-25).
- The submitted M2 notebook copies in `milestones/M2_data_eda_hypotheses/` (untracked) still use the old root marker;
  they are left as submitted.
- **Rebuilding docs:** `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js
  DS4SG_M3_Reference.docx` (same pattern for `build_reference_doc.js`; `npm install docx` in any folder). Close the
  file in Word first (EBUSY). A docx-js TOC has no page numbers until Word updates it.
- **Notebooks are the source** (the scratchpad builders are gone): edit them directly.
- **Word automation (COM):**
  - Works via a NEW hidden instance, exporting to a folder outside the project.
  - A start can fail with CO_E_SERVER_EXEC_FAILURE and leave a window-less WINWORD behind; stop only that new PID and
    retry.
  - In PowerShell use `$w.Quit()`, not `$w.Quit(0)`. Never touch the user's own Word process.
- **Known caveats (disclosed):**
  - The momentum basket was chosen on all training years (it sees later CV folds, never the test).
  - The LR is at the grid edge C = 1e-4 on a flat plateau, uncalibrated (Brier 0.24).
  - The test has 13 distinct shock weeks.
  - Pooled AUC partly rewards telling crisis years from calm ones (flattered the tree).
  - Edge-case drivers use Combined-index item impacts (no Q2–Q5 item weights exist).
- The session-8 commit is local (not pushed).

## 4. What's next
1. **M3 (due 2026-10-24):** confirm it was submitted (PDF, notebooks 03 and 04, `src/models/baseline.py`,
   `src/models/train_baselines.py`, plus `models/m3_baselines/` if artifacts were uploaded). Late penalty: 20% within
   24 h; not accepted after.
2. **Viva prep (5 minutes, V-factor):**
   - every member studies the reference doc §5.8 (methods beyond the slides), §6 (decisions), §7 (numbers) and §8
     (Q&A, 29 questions);
   - be ready for "why was the tree best in CV but worst on test?" and "why a bootstrap instead of DeLong?";
   - re-run notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.** Keep new methods within the lectures/syllabus where
   possible (ensembles are Week 12, fairness Week 15).
   - Ensembles (random forest, gradient boosting) under the same protocol. Report within-year AUC next to pooled AUC
     and decide the selection criterion before looking at the test.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (probabilities that match observed shock rates; Brier score).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock rate.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano, planned in M2), equal recall across quintiles,
     quintile-specific thresholds.
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
- **Lecture scope (user, 2026-10-22):** methods should come from the lecture slides, syllabus or rubric; only a few
  meaningful outside methods, each with a one-line reason (reference doc §5.8). Kept: expanding-window CV (shuffled
  K-fold leaks, +0.05–0.14 AUC), permutation importance (KNN has no coefficients), week-clustered SEs (sister rows;
  LR χ² 94 vs 22.4). M2-plan items (LR test, HAC, Brier, Diebold–Mariano) stay because M2 committed to them.
- **No tooling references in deliverables (user, 2026-10-25):** notebooks, code, reports and team docs never mention
  the session files; notebooks locate the project root via `requirements.txt`.
- **M3 modelling** (IDs as in `baseline.py` and the reference doc):
  - B1: Q1–Q5 rows only. Combined is excluded as a near-duplicate average.
  - B2: chronological split (train ≤ 2024, test 2025–26; 74.8/25.2), fixed in M2. A stratified random split was
    rejected because it would leak the future and split sister rows.
  - B3: expanding-window CV with K = 4 calendar years 2021–24 and whole weeks together; no gap is needed for a
    1-week target.
  - B4: scaling inside pipelines. LR z-scores all features; KNN scales only the continuous features (z-score won);
    0/1 flags pass through; the tree is unscaled; the M2 `*_z` columns are not used (they leak inside CV).
  - B5: selection by **pooled out-of-fold ROC-AUC** (one threshold must work in every year); mean ± SD per fold also
    reported. Caveat: pooled AUC partly rewards telling crisis years apart; kept as planned (changing it after the test
    would be leakage, B16).
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: a Q1 shock's step is not given back (4.2% vs 1.9% after 8 weeks), Rs 355/month ≈ 8% of Kafaalat,
    and FAO's 7:1 return on early action.
  - B8: listwise deletion of 9 weeks.
  - B9: LR + KNN + shallow tree (the user chose this), with majority-class and persistence benchmarks.
  - B10: 18 features; only the 8-week FX change.
  - B11: grids were extended at their edges. LR uses saga (fits both L1 and L2). KNN k ≤ 250, limited by fold 1's size.
  - B12: three importance measures. Permutation importance is computed on the CV folds, not the test. Odds ratios
    come from an unpenalised logit with week-clustered SEs.
  - B13: H1 is tested with a week-clustered Wald test in sample and a week-block bootstrap out of sample (the DeLong
    test planned in M2 was replaced: it assumes independent rows).
  - B14: H2 uses a difference regression on the training period, with windows ending by 2024.
  - B15: H3 is tested as pre-stated, with the component split labelled exploratory.
  - B16: the test is used once; no re-tuning after seeing it (the audit respected this).
  - B17: a shock's driver is the largest *upward* PBS item impact (Combined index).
  - B18: the momentum-basket exception is disclosed.
  - B19: fixed seed 42, and the script reproduces the notebook.
- **Manuscript:** M3 = new sections only (user). Numbering continues M2. The style matches M2: black text, Times New
  Roman, no header or footer, three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Was M3 submitted on time (due 2026-10-24)?
- Does the team accept FN:FP = 5:1 as the headline cost ratio? This is a value judgement and the SDP members should
  sign off. The sensitivity analysis shows no ratio makes the baselines clearly valuable in 2025–26.
- M4 selection criterion: pooled AUC, within-year AUC, or both (e.g. within-year AUC plus a calibration check)? It must
  be fixed before the M4 test evaluation.
- Should M4 include walk-forward retraining already (it would address the changing shock rate), or leave it for M5 as
  planned?
- Should the submitted M2 files in `milestones/M2_data_eda_hypotheses/` be committed as the official record?
- Carry-overs:
  - Which source did Sarah use for the Eid/Ramadan dates (for citation)?
  - Extend the series back to Sep 2018 with the year-ago columns?
  - Register for SBP EasyData (official PKR/USD)?

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **Lecture slides:** `course/lecture_slides/` Units 01–11 (not in git); syllabus in `course/syllabus/`.
- **M3 code:** `src/models/baseline.py`, `src/models/train_baselines.py`.
- **M3 notebooks:** `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`.
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv` (23 files).
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline; built by `tools/build_reference_doc.js`).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`.


<!-- ===== HANDOFF SNAPSHOT 2026-10-25 21:49:15 ===== -->
# Snapshot: 2026-10-25 21:49:15

# HANDOFF

**Last updated:** 2026-10-25 (session 8)
**Session summary:** Checked that the notebooks and code match the lecture-scoped M3 report, removed every
Claude/tooling reference from the deliverables, removed the interactive scikit-learn pipeline diagram from notebook 03,
and documented what the decision labels (D, F, B, H-) mean. No result changed.

M3 was due **2026-10-24**; its submission status was not recorded this session.

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
- **Session 7 (2026-10-22): audit and lecture-scope pass** (commits `1092762`, `b464a62`, `7d341d7`; all pushed).
  - Audit: target/feature timing, folds, reproducibility and every metric verified; interpretation fixes (shock
    persistence vs ordinary weeks, fiscal-year OR on 5 years, utility tariffs not significant, etc.).
  - Lecture scope: removed the year-level oracle, the hand-coded DeLong test, the Bayes-threshold formula and jargon
    (prior shift, improper linear model, bias–variance, Platt/isotonic, equal opportunity, welfare weights); H1 out of
    sample now uses the week-block bootstrap (gain +0.007, 95% CI −0.08 to +0.10, p = 0.45). Lecture ties added (Units
    04, 06, 08–11). Manuscript 12 pages, 3,349 body words; viva guide §5.8 "Methods beyond the lecture slides", 29
    questions.
- **Session 8 (2026-10-25): consistency and clean-up** (commit `ffa0165` pushed; a second commit is local).
  - Notebooks 03/04 and `baseline.py` already matched the trimmed report. Removed the unused `statsmodels` import from
    notebook 03.
  - All four notebooks found the project root via `CLAUDE.md`; they now use `requirements.txt`.
  - `tools/build_reference_doc.js` and `DS4SG_Script_and_Data_Reference.docx`: handoff-hook entry and the
    CLAUDE.md/HANDOFF/log/.claudeignore rows removed (TOC updated in Word; text otherwise identical).
  - Notebook 03 §4: removed `models["KNN"]`, whose output was scikit-learn's interactive pipeline diagram (the only
    such diagram in any notebook); the grid printout stays.
  - Grep of all tracked deliverables finds no Claude/handoff/AI mention. Notebooks 01–04 re-run cleanly; all 80 output
    files byte-identical.

## 3. Where we are now
- **M3 deliverables are complete, audited, lecture-scoped and free of tooling references.**
- **Methods kept from beyond the slides:** expanding-window CV, permutation importance, standard errors clustered by
  week; carried from the M2 plan: logit LR test, OLS with HAC errors, Brier score, Diebold–Mariano (M4 plan only).
- **Decision labels are our own bookkeeping IDs, not course terms.** They were added when each script was written so
  that code, notebooks and the viva guide can point at the same choice. They do not appear in either submitted
  manuscript PDF. Where each set is defined:
  - D1–D5 (data cleaning): docstring of `src/cleaning/build_master.py`; counts in `cleaning_report.txt`.
  - F1–F4 (features): docstring of `src/features/build_features.py`.
  - B1–B8 (M3 modelling): docstring of `src/models/baseline.py`; B1–B19 in the M3 viva guide §6 and §5 below.
  - H-1, H-2 (hypothesis tests): notebook 04 markdown (training-period sample; difference regression).
  - Figures are also numbered B1–B10 (and E1–E5); "Figure B1" is not "decision B1".
- **Repo-level session files stay** (CLAUDE.md, HANDOFF.md, logs/, .claude/, .claudeignore): the repo is for the team
  only; the instructor sees only the submitted reports and notebooks (user, 2026-10-25).
- The submitted M2 notebook copies in `milestones/M2_data_eda_hypotheses/` (untracked) still use the old root marker;
  they are left as submitted.
- **Rebuilding docs:** `NODE_PATH=<folder with node_modules/docx> node tools/build_m3_reference_doc.js
  DS4SG_M3_Reference.docx` (same pattern for `build_reference_doc.js`; `npm install docx` in any folder). Close the
  file in Word first (EBUSY). A docx-js TOC has no page numbers until Word updates it.
- **Notebooks are the source** (the scratchpad builders are gone): edit them directly.
- **Word automation (COM):**
  - Works via a NEW hidden instance, exporting to a folder outside the project.
  - A start can fail with CO_E_SERVER_EXEC_FAILURE and leave a window-less WINWORD behind; stop only that new PID and
    retry.
  - In PowerShell use `$w.Quit()`, not `$w.Quit(0)`. Never touch the user's own Word process.
- **Known caveats (disclosed):**
  - The momentum basket was chosen on all training years (it sees later CV folds, never the test).
  - The LR is at the grid edge C = 1e-4 on a flat plateau, uncalibrated (Brier 0.24).
  - The test has 13 distinct shock weeks.
  - Pooled AUC partly rewards telling crisis years from calm ones (flattered the tree).
  - Edge-case drivers use Combined-index item impacts (no Q2–Q5 item weights exist).

## 4. What's next
1. **M3 (due 2026-10-24):** confirm it was submitted (PDF, notebooks 03 and 04, `src/models/baseline.py`,
   `src/models/train_baselines.py`, plus `models/m3_baselines/` if artifacts were uploaded). Late penalty: 20% within
   24 h; not accepted after.
2. **Viva prep (5 minutes, V-factor):**
   - every member studies the reference doc §5.8 (methods beyond the slides), §6 (decisions), §7 (numbers) and §8
     (Q&A, 29 questions);
   - be ready for "why was the tree best in CV but worst on test?", "why a bootstrap instead of DeLong?" and "what do
     decision B1/B8 mean?";
   - re-run notebook 03.
3. **M4 (Week 12, Nov 2–6): final model, fairness and ethics.** Keep new methods within the lectures/syllabus where
   possible (ensembles are Week 12, fairness Week 15).
   - Ensembles (random forest, gradient boosting) under the same protocol. Report within-year AUC next to pooled AUC
     and decide the selection criterion before looking at the test.
   - H4: quintile-specific vs pooled models (signal × group interactions, LR test).
   - Calibration (probabilities that match observed shock rates; Brier score).
   - New features: a NEPRA/OGRA tariff calendar, a first-month-of-FY window, a rolling shock rate.
   - H5 fairness: Brier and miss rate Q1 vs Q5 (Diebold–Mariano, planned in M2), equal recall across quintiles,
     quintile-specific thresholds.
   - Ethics: self-fulfilling warnings, transparency, rural exclusion.
   - Consider re-selecting the momentum basket inside each fold.
4. **M5 (Week 14):** walk-forward retraining with new weekly releases; measure how fast the thresholds adapt.
5. Carry-over items:
   - verify Eid ul-Adha 2026 (27 May per Umm al-Qura) in the overrides file;
   - write the abstract, introduction and literature review for the final paper.

## 5. Decisions & rationale
- **Data (M2), labels as in `build_master.py` / `build_features.py`:**
  - D1: each report's printed date is authoritative; off-day releases are aligned to the nearest Thursday.
  - D2: a missing week is filled from the next report's official "previous week" index (flagged, not imputed).
  - D3: `spi_prev_week(t)` is checked against `spi(t−1)`; PBS revisions use the revised figure.
  - D4: daily PKR/USD is averaged over the SPI week (Fri–Thu), after dropping known one-day bad ticks.
  - D5: a fuel-revision week is one where average petrol or diesel moved by more than 1%.
  - F1: a shock is a weekly SPI rise of ≥ 1%. F2: fuel-review calendar (1st and 16th of the month). F3: momentum items
    are chosen on training weeks only. F4: component inflation is Combined-weighted, the same for every group.
  - The sample is 5 Sep 2019 – 1 Oct 2026, base 2015-16; revised values use the latest vintage. Outliers are kept
    (they are the shocks). Signals are known at the end of week t, or are calendar facts. The event calendar
    overrides file is the single source of truth.
- **Lecture scope (user, 2026-10-22):** methods should come from the lecture slides, syllabus or rubric; only a few
  meaningful outside methods, each with a one-line reason (reference doc §5.8). Kept: expanding-window CV (shuffled
  K-fold leaks, +0.05–0.14 AUC), permutation importance (KNN has no coefficients), week-clustered SEs (sister rows;
  LR χ² 94 vs 22.4). M2-plan items (LR test, HAC, Brier, Diebold–Mariano) stay because M2 committed to them.
- **No tooling references in deliverables (user, 2026-10-25):** notebooks, code, reports and team docs never mention
  the session files; notebooks locate the project root via `requirements.txt`; no interactive estimator diagrams.
- **M3 modelling** (IDs as in `baseline.py` and the reference doc):
  - B1: Q1–Q5 rows only. Combined is excluded as a near-duplicate average.
  - B2: chronological split (train ≤ 2024, test 2025–26; 74.8/25.2), fixed in M2. A stratified random split was
    rejected because it would leak the future and split sister rows.
  - B3: expanding-window CV with K = 4 calendar years 2021–24 and whole weeks together; no gap is needed for a
    1-week target.
  - B4: scaling inside pipelines. LR z-scores all features; KNN scales only the continuous features (z-score won);
    0/1 flags pass through; the tree is unscaled; the M2 `*_z` columns are not used (they leak inside CV).
  - B5: selection by **pooled out-of-fold ROC-AUC** (one threshold must work in every year); mean ± SD per fold also
    reported. Caveat: pooled AUC partly rewards telling crisis years apart; kept as planned (changing it after the test
    would be leakage, B16).
  - B6: no resampling. Class weights are a tuning option; imbalance is handled by the cost threshold and by the
    metrics.
  - B7: the threshold minimises 1 × FP + 5 × FN on 2021–24 out-of-fold predictions. Ratios 1–20 are reported.
    Justification: a Q1 shock's step is not given back (4.2% vs 1.9% after 8 weeks), Rs 355/month ≈ 8% of Kafaalat,
    and FAO's 7:1 return on early action.
  - B8: listwise deletion of 9 weeks.
  - B9: LR + KNN + shallow tree (the user chose this), with majority-class and persistence benchmarks.
  - B10: 18 features; only the 8-week FX change.
  - B11: grids were extended at their edges. LR uses saga (fits both L1 and L2). KNN k ≤ 250, limited by fold 1's size.
  - B12: three importance measures. Permutation importance is computed on the CV folds, not the test. Odds ratios
    come from an unpenalised logit with week-clustered SEs.
  - B13: H1 is tested with a week-clustered Wald test in sample and a week-block bootstrap out of sample (the DeLong
    test planned in M2 was replaced: it assumes independent rows).
  - B14: H2 uses a difference regression on the training period, with windows ending by 2024 (notebook 04: H-1, H-2).
  - B15: H3 is tested as pre-stated, with the component split labelled exploratory.
  - B16: the test is used once; no re-tuning after seeing it (the audit respected this).
  - B17: a shock's driver is the largest *upward* PBS item impact (Combined index).
  - B18: the momentum-basket exception is disclosed.
  - B19: fixed seed 42, and the script reproduces the notebook.
- **Manuscript:** M3 = new sections only (user). Numbering continues M2. The style matches M2: black text, Times New
  Roman, no header or footer, three-rule tables. Every number traces to the notebooks.

## 6. Open questions
- Was M3 submitted on time (due 2026-10-24)?
- Keep the decision labels in the notebooks and code, or replace them with plain descriptions?
- Does the team accept FN:FP = 5:1 as the headline cost ratio? This is a value judgement and the SDP members should
  sign off. The sensitivity analysis shows no ratio makes the baselines clearly valuable in 2025–26.
- M4 selection criterion: pooled AUC, within-year AUC, or both (e.g. within-year AUC plus a calibration check)? It must
  be fixed before the M4 test evaluation.
- Should M4 include walk-forward retraining already (it would address the changing shock rate), or leave it for M5 as
  planned?
- Should the submitted M2 files in `milestones/M2_data_eda_hypotheses/` be committed as the official record?
- Carry-overs:
  - Which source did Sarah use for the Eid/Ramadan dates (for citation)?
  - Extend the series back to Sep 2018 with the year-ago columns?
  - Register for SBP EasyData (official PKR/USD)?

## 7. Key files
- `CLAUDE.md`: narrative, data facts, conventions, milestone dates. `milestones/M3_baseline_model/M3_rubric.md`.
- **Lecture slides:** `course/lecture_slides/` Units 01–11 (not in git); syllabus in `course/syllabus/`.
- **M3 code:** `src/models/baseline.py`, `src/models/train_baselines.py`.
- **M3 notebooks:** `notebooks/03_baseline_models.ipynb`, `notebooks/04_hypothesis_tests.ipynb`.
- **M3 outputs:** `models/m3_baselines/`, `reports/figures/figB1`–`figB10`, `reports/tables/m3_*.csv` (23 files).
- **M3 manuscript:** `tools/build_manuscript_m3.js` → `manuscript/M3_manuscript_sections_IV_V.docx` →
  `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`.
- **Viva guide:** `DS4SG_M3_Reference.docx` (built by `tools/build_m3_reference_doc.js`).
- **Project reference:** `DS4SG_Script_and_Data_Reference.docx` (M1–M2 pipeline; built by `tools/build_reference_doc.js`).
- **M2:** `notebooks/01_data_preparation.ipynb`, `notebooks/02_eda.ipynb`, `tools/build_manuscript_m2.js`.
- **Data:** `data/processed/master_features.csv` + `FEATURES_DICTIONARY.md`; `master_model_ready.csv` +
  `DATA_DICTIONARY.md`; `items_weekly_panel.csv`; `cleaning_report.txt`.
