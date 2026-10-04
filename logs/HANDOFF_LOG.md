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
