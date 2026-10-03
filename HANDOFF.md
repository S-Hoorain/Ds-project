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
