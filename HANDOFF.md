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
