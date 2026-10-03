# CLAUDE.md: DS4SG Project (Pakistan SPI Price Shocks)

Course project for **CS/SDP 312/314: Data Science for Social Good**. The final deliverable is a
publishable-style research paper, written incrementally across milestones.

## Session protocol (read this first)

1. **Start of every session:** read `HANDOFF.md`. It is the single source of truth for where
   the project stands. Do **not** read `logs/HANDOFF_LOG.md` (see below).
2. **During the session:** follow the conventions below; commit meaningful progress to git.
3. **End of every session (or when the user says to wrap up):** overwrite `HANDOFF.md`.
   - Rewrite it in **one `Write` call** (not a series of Edits). The hook logs every version
     it sees, so piecemeal edits put half-finished snapshots in the log.
   - **Hard limit: 400 lines.** Condense older detail; history lives in the log anyway.
   - Required sections, in this order:
     1. **Project overview**: 3–6 lines; what we're building and why.
     2. **Done so far**: cumulative, condensed; the most recent session in more detail.
     3. **Where we are now**: current state, what's half-finished, known issues/bugs.
     4. **What's next**: concrete, ordered next steps, with the upcoming milestone and its due date.
     5. **Decisions & rationale**: methodological choices and why (useful for the manuscript).
     6. **Open questions**: things that need the team's or instructor's input.
     7. **Key files**: pointers to the scripts, notebooks, and data files that matter right now.
   - Put the date (YYYY-MM-DD) and a one-line session summary at the top.

### The handoff log
- `logs/HANDOFF_LOG.md` is an **append-only history** of every `HANDOFF.md` version.
- It is appended **automatically** by a PostToolUse hook (`.claude/hooks/log_handoff.py`,
  configured in `.claude/settings.json`) whenever `HANDOFF.md` is written or edited.
  Identical versions are skipped, and a handoff over 400 lines is rejected and not logged.
- **Never read the log unless it is genuinely needed** (e.g., recovering a past decision that
  is no longer in the handoff). When needed, `grep` for `Snapshot:` or a keyword and read
  only the relevant range. Reading it is set to prompt the user for permission.
- Never hand-edit or truncate the log.
- If `HANDOFF.md` was changed outside Claude, log it manually:
  `python .claude/hooks/log_handoff.py`

## Project overview

- **Team:** Syeda Hoorain Imran (CS: scraping, pipeline, models), Muhammad Munib Sattar (SDP)
  and Sarah Khalid (SDP: problem framing, interpretation, fairness/ethics). Everyone works on
  curation and analysis.
- **Problem:** Persistent, volatile inflation in essential items in Pakistan erodes purchasing
  power, and hits low-income households hardest because food and fuel take a larger share of their budgets.
- **SDGs:** SDG 1 (No Poverty), SDG 2 (Zero Hunger), SDG 10 (Reduced Inequalities).
- **Research question:** Can weekly price shocks in essential items be predicted, and how do
  their size and predictability differ across income quintiles? Policy angle: better timing
  and targeting of social protection (e.g., BISP).
- **Initial hypotheses (M1):**
  - H1: recent SPI trends, exchange-rate changes, and calendar events (Ramadan/Eid) predict
    next week's SPI movement.
  - H2: the lowest quintile (Q1) faces higher average inflation **and** higher forecast error
    than the highest (Q5), because of its larger food/fuel budget share.

### Data (verified 2026-10-03; details in `manuscript/02_data_collection_audit.md`)
- **Primary:** PBS Weekly Sensitive Price Indicator (SPI). It covers 51 essential items across
  50 markets in 17 cities, with an index for each of the 5 consumption quintiles (Q1–Q5) plus
  Combined, on base 2015-16. Each weekly report has a quintile table (current week, previous week,
  same week last year) and a 51-item national-average price table with fixed basket weights.
- **Where the files are** (no consolidated history exists):
  - the current PBS site, which embeds a JS catalogue (Jul 2023 onward; Excel only from Oct 2025);
  - the *old* PBS site, preserved only in the **Wayback Machine** (2013–2025).
  - `src/scraping/spi_catalogue.py` lists both sources; `spi_download.py` downloads them.
- **Scope (corrected from M1):** the 2015-16-base weekly SPI only **started on 5 Sep 2019**.
  Earlier weekly data is base 2007-08, with 53 items and different quintiles, so it is not
  comparable. The sample is therefore Sep 2019 – present, about 370 weeks
  (≈2,200 quintile-week rows, ≈18,900 item-week rows).
- **Supporting inputs:**
  - Ramadan/Eid calendar: `src/features/build_event_calendar.py`. The Pakistan dates are
    *unverified*.
  - SBP policy decisions: `src/scraping/sbp_mps.py`, from archived Monetary Policy Statements.
  - PKR/USD exchange rate: `src/scraping/fx_rates.py`, Yahoo `PKR=X` (a market quote, not the
    official SBP rate).
  - Fuel revisions: derived from the SPI petrol/diesel items.
- **Wayback Machine etiquette:** run only ONE download stream at a time. It blocks the IP (connection
  refused) for some minutes when hit by parallel scrapers. The downloaders back off and stop after
  repeated failures; re-run them later to resume.
- **Extensions:** OGRA fortnightly petroleum notifications. New weekly SPI releases up to course
  Week 14 serve as a true out-of-sample test set (M5).
- **Known limitations:**
  - Coverage is urban only (17 cities, no rural areas).
  - The 2015-16 expenditure weights may be outdated.
  - Two items were renamed: "Electricity/Gas Charges upto X" became "... for Q1". Check these
    series for level breaks.
  - There is no cross-base splicing (out of scope).

### Milestones (syllabus "Week-Wise Schedule", tentative)
| # | Topic | Syllabus week | Folder | Status |
|---|-------|---------------|--------|--------|
| M1 | Problem framing & dataset curation (4 marks) | Wk 4–5 (Sep 7–18) | `milestones/M1_proposal/` | Submitted |
| M2 | EDA & hypothesis report (5) (manuscript §II–III) | Wk 7 (Sep 28–Oct 2) | `milestones/M2_data_eda_hypotheses/` | Current; confirm actual due date |
| M3 | Baseline model & initial findings (5) | Wk 10 (Oct 21–23) | | |
| M4 | Final model, fairness & ethics (6) | Wk 12 (Nov 2–6) | | |
| M5 | New data integration & re-training (5) | Wk 14 (Nov 16–20) | | |
| M6 | Presentations (5); poster + manuscript (5) | Wk 16 (Nov 30–Dec 8) | | |

The M2 rubric (`milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`) is the
grading spec. Check deliverables against it. Weights: data prep 35%, EDA/visualisation 35%,
hypotheses 15%, manuscript and code quality 15%.

### Course conventions to follow (from the lecture slides in `course/lecture_slides/`)
- **Outliers (Unit 05):** use both rules.
  - Quartile rule: *mild* outlier beyond Q1/Q3 ± 1.5×IQR; *regular* outlier beyond ±3×IQR.
  - Mean/SD rule: *mild* beyond mean ± 2SD; *regular* beyond ±3SD.
  - Discuss resistant (median, IQR) vs non-resistant (mean, SD) statistics.
- **Scaling (Unit 04):** Min-Max normalisation and Z-score standardisation. Missing data
  (Unit 03): deletion vs constant/mean/model-based imputation, and say why.
- **Tidy data (Unit 03):** long format, with melt/pivot as needed.
- **Hypothesis tests (Unit 07):** state H0/H1 in terms of population parameters; use the
  p-value approach.
- **Late policy:** 20% penalty within 24 h; not accepted after 24 h.
- **Generative-AI policy (syllabus):** AI use on assessments requires the instructor's
  permission and must be declared and cited. Remind the team when preparing submissions.

## Repository layout

```
CLAUDE.md                 project instructions (this file)
HANDOFF.md                current state; overwritten each session, ≤400 lines
README.md                 human-facing overview and setup
requirements.txt          Python dependencies
course/                   course materials (reference only; not committed to git)
  syllabus/  lecture_slides/
milestones/               one folder per milestone: brief/rubric + submitted report
data/
  raw/spi_weekly/         downloaded PBS weekly files, exactly as fetched (never modify)
  raw/ogra/               OGRA petroleum price notifications
  external/               hand-built inputs (event calendar CSVs, lookup tables)
  interim/                parsed/combined but not yet final
  processed/              master analytical dataset(s), ready for modelling
notebooks/                numbered analysis notebooks (01_..., 02_...)
src/                      reusable Python code
  scraping/ cleaning/ features/ models/ utils/
reports/figures/          exported publication-quality figures
reports/tables/           exported summary tables
manuscript/               paper drafts, section by section
logs/HANDOFF_LOG.md       append-only handoff history (do not read unless needed)
.claude/                  settings.json (hook + permissions), hooks/log_handoff.py
```

## Working conventions

### Data
- `data/raw/` is **immutable**. Scripts read from it and write to `interim/` and `processed/`.
  Never hand-edit data files; every transformation must be reproducible from code.
- Scrapers must be **polite and resumable**: rate-limit requests, skip files already
  downloaded, and log failures rather than crash. Record the source URL and download date for each file.
- Keep a data dictionary (`data/processed/DATA_DICTIONARY.md`) for the master dataset: column,
  type, unit, source, description.
- Record every cleaning decision (missing-data handling, outlier treatment, transforms, encoding)
  with its rationale. M2 grades this explicitly, and it feeds the manuscript.
- Don't load large raw files into context. Inspect them with `head`, shapes, or summaries.

### Code
- Python 3. pandas/numpy for data; matplotlib/seaborn for figures; statsmodels/scikit-learn for models.
- Use `pathlib` paths relative to the project root; no absolute paths and no `D:\...`.
- Logic shared across notebooks goes in `src/`. Notebooks stay readable and narrative.
- Notebooks are named `NN_short_description.ipynb` and must **run top-to-bottom cleanly**.
- Comment generously and explain *why*, because the rubric grades "well-commented, executable"
  notebooks. Audience: the SDP teammates should be able to follow along.
- Set random seeds. Use time-aware splits for forecasting (no shuffling across time; no leakage
  from future weeks into features).

### Figures (Grammar of Graphics standard, required by the rubric)
- Informative title and a detailed caption; both axes labelled **with units** (PKR, %, index points);
  clear legends; accessible, colour-blind-safe palettes.
- Export figures to `reports/figures/` (PNG at ≥300 dpi, plus PDF/SVG where useful), with descriptive filenames.

### Writing
- Manuscript sections go in `manuscript/` (M2 = Section II Data & Preprocessing, Section III EDA).
- Use a scientific paper style: precise, cite sources (PBS, SBP, OGRA), and state limitations honestly.
- Keep the social-impact framing (SDGs, quintile inequality, BISP targeting) visible throughout.

### Git
- Commit small, logical units with clear messages (`scraping: add weekly SPI downloader`).
- Don't commit raw scraped data, large binaries, `.venv/`, or course materials (see `.gitignore`).
  Processed datasets go in only if small (< ~20 MB).
- Commit `HANDOFF.md` and `logs/HANDOFF_LOG.md` together at the end of each session.

## Ignore files
- `.gitignore`: what git doesn't track.
- `.claudeignore`: what Claude should not read or explore. It is kept for tooling that
  honours it. **Claude Code itself enforces these rules through `permissions` in `.claude/settings.json`**,
  so update both when adding a new exclusion.
