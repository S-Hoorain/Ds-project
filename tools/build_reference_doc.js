// Usage (from a folder where the npm package "docx" is installed: npm install docx):
//   node tools/build_reference_doc.js reports/DS4SG_Script_and_Data_Reference.docx
// Then open the file in Word and update the table of contents (or right-click it > Update Field).
// Keep the SCRIPTS / DATA / FIGURES / TABLES / DOCS / M arrays in sync with the repository.
// Builds "DS4SG_Script_and_Data_Reference.docx": every script and data file, with lineage.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, BorderStyle, LevelFormat, PageOrientation, Header, Footer,
  PageNumber, TableOfContents, PageBreak, VerticalAlign, TableLayoutType,
} = require("docx");

const OUT = process.argv[2];
const FONT = "Calibri";
const MONO = "Consolas";
const INK = "1F1F1F", MUTED = "5A5A5A", ACCENT = "1F4E79", HEAD_FILL = "DCE6F1", KEY_FILL = "F2F2F2";

// Portrait A4 with 1" margins -> 9026 DXA text width; landscape -> 13958.
const PORTRAIT_W = 11906 - 2 * 1440;
const LAND_W = 16838 - 2 * 1440;

// ---------------------------------------------------------------- text helpers
// `backticks` mark code/path fragments; **double stars** mark bold.
function runs(text, opts = {}) {
  const out = [];
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  for (const p of parts) {
    if (p.startsWith("`")) out.push(new TextRun({ text: p.slice(1, -1), font: MONO, size: (opts.size || 20) - 2, color: opts.color || INK }));
    else if (p.startsWith("**")) out.push(new TextRun({ text: p.slice(2, -2), bold: true, font: FONT, size: opts.size || 20, color: opts.color || INK }));
    else out.push(new TextRun({ text: p, font: FONT, size: opts.size || 20, color: opts.color || INK, bold: opts.bold, italics: opts.italics }));
  }
  return out;
}
const P = (text, opts = {}) => new Paragraph({ children: runs(text, opts), spacing: { after: opts.after ?? 120, before: opts.before ?? 0 }, alignment: opts.align });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t })], spacing: { before: 240, after: 160 } });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })], spacing: { before: 240, after: 120 } });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(t, { size: 22, color: ACCENT, bold: true }), spacing: { before: 200, after: 80 }, keepNext: true });
const BUL = (text, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, children: runs(text), spacing: { after: 60 } });

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(content, width, opts = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((c) =>
    c instanceof Paragraph ? c : new Paragraph({ children: runs(c, { size: opts.size || 19, bold: opts.bold, color: opts.color }), alignment: opts.align, spacing: { after: 40 } }));
  return new TableCell({
    children: paras, width: { size: width, type: WidthType.DXA }, borders,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: opts.valign || VerticalAlign.TOP,
  });
}

// Grid table with a shaded header row.
function grid(headers, rows, widths, opts = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: HEAD_FILL, size: opts.headSize || 19, align: opts.headAlign })) }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, widths[i], { size: opts.size || 19, align: opts.align && i > 0 ? opts.align : undefined })) })),
    ],
  });
}

// Two-column "property card" for a single file or script.
function card(pairs) {
  const w = [2000, PORTRAIT_W - 2000];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: PORTRAIT_W, type: WidthType.DXA }, columnWidths: w,
    rows: pairs.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) =>
      new TableRow({ children: [cell(k, w[0], { bold: true, fill: KEY_FILL }), cell(Array.isArray(v) ? v.map((x) => new Paragraph({ children: runs(x, { size: 19 }), spacing: { after: 30 } })) : v, w[1])] })),
  });
}
const spacer = () => new Paragraph({ children: [], spacing: { after: 80 } });

// ---------------------------------------------------------------- content
const SCRIPTS = [
  {
    path: "src/scraping/spi_catalogue.py", step: "1", lang: "Python script",
    purpose: "Builds a catalogue of every weekly SPI file PBS has published. PBS has no consolidated history: weekly reports sit on the current PBS website (from Jul 2023) and on the old PBS website, which survives only in the Internet Archive (Wayback Machine). The script lists both sources, parses each file's week date from its name (including typo repair, e.g. `spi_report_0204202` = 2 Apr 2020), and classifies each file as a summary report or a city-level annex.",
    reads: ["Internet: the current PBS price-statistics page (`https://www.pbs.gov.pk/price-statistics/`), whose embedded JavaScript array lists every weekly file", "Internet: the Wayback Machine CDX index API for the old site's folders `price_statistics/weekly_spi_nb/` and `price_statistics/weekly_spi/`"],
    writes: ["`data/raw/spi_weekly/catalogue.csv`"],
    run: "`python src/scraping/spi_catalogue.py`",
    notes: "Re-run whenever new weeks are needed (e.g. for M5). File kinds are inferred from filenames because the PBS page's own labels are swapped for its 2023 entries.",
  },
  {
    path: "src/scraping/spi_download.py", step: "2", lang: "Python script",
    purpose: "Downloads one weekly SPI summary report per week, politely and resumably. For each week it ranks the candidate files: current-site Excel, then current-site PDF, then the Wayback 'new base' folder, then the general Wayback folder. It checks that each file is a real PDF/XLSX and, for PDFs, that it is on the 2015-16 base, rejecting 2007-08-base files. Every attempt is logged with a SHA-256 checksum.",
    reads: ["`data/raw/spi_weekly/catalogue.csv` (candidate files)", "`data/raw/spi_weekly/manifest.csv` (to skip weeks already downloaded)", "Internet: PBS website and Wayback Machine (the file URLs in the catalogue)"],
    writes: ["Report files in `data/raw/spi_weekly/pbs_live/summary/` and `data/raw/spi_weekly/wayback/summary/`", "Appends one row per attempt to `data/raw/spi_weekly/manifest.csv`", "Console log; saved to `logs/spi_download_run.log` when output is redirected"],
    run: "`python src/scraping/spi_download.py` (options: `--start` default 2019-09-05, `--end`, `--kinds summary annex`, `--limit N`)",
    notes: "Pacing: 1 s between requests to PBS, 4 s to the Wayback Machine, exponential back-off, and an automatic stop after 3 consecutive failed weeks. Run only one Wayback scraper at a time: parallel streams get the IP blocked temporarily.",
  },
  {
    path: "src/cleaning/parse_spi.py", step: "3", lang: "Python script",
    purpose: "Extracts the two tables from every downloaded report: the quintile table (SPI for Q1-Q5 and Combined; this week, previous week, same week last year) and the 51-item table (national average prices, % changes, basket weights and item impacts). PDFs: positional column clustering for the quintile table, and text-flow extraction for the item table. Excel: cell values. It also detects the base year and maps raw item names to the 51 canonical items.",
    reads: ["`data/raw/spi_weekly/manifest.csv` (which files downloaded successfully)", "Raw report files in `data/raw/spi_weekly/.../summary/`", "`data/external/spi_items.csv` (canonical item names, for matching)"],
    writes: ["`data/interim/spi_quintile_weekly.csv`", "`data/interim/spi_items_weekly.csv`", "`data/interim/spi_parse_log.csv`"],
    run: "`python src/cleaning/parse_spi.py`",
    notes: "Result on the full run: 359/359 reports complete (6-row quintile table, 51/51 items, base 2015-16 confirmed). Renamed items ('Electricity/Gas Charges upto ...' became '... for Q1') are matched by prefix aliases.",
  },
  {
    path: "src/scraping/fx_rates.py", step: "4", lang: "Python script",
    purpose: "Downloads the daily PKR per USD exchange rate and flags suspicious one-day jumps (>5%) for review.",
    reads: ["Internet: Yahoo Finance ticker `PKR=X`, via the `yfinance` package"],
    writes: ["`data/raw/fx/pkr_usd_daily_yahoo.csv`"],
    run: "`python src/scraping/fx_rates.py`",
    notes: "A market quote, not the official SBP interbank rate (available from SBP EasyData with a free API key). Two bad-tick episodes (1-2 Aug 2022, 19-20 Sep 2022) are dropped later in `build_master.py`.",
  },
  {
    path: "src/features/build_event_calendar.py", step: "5", lang: "Python script",
    purpose: "Builds the Ramadan / Eid ul-Fitr / Eid ul-Adha calendar for 2018-2027. Dates are computed from the Umm al-Qura calendar (`hijridate` package), then replaced by Pakistan-specific dates where an override exists.",
    reads: ["`data/external/islamic_events_pk_overrides.csv`"],
    writes: ["`data/external/islamic_events.csv`"],
    run: "`python src/features/build_event_calendar.py`",
    notes: "Pakistan's moon-sighting dates are often one day after Umm al-Qura. All overrides are currently marked unverified, and the team should check them.",
  },
  {
    path: "src/scraping/sbp_mps.py", step: "6", lang: "Python script",
    purpose: "Builds the table of State Bank of Pakistan (SBP) monetary-policy decisions. The SBP site redesign removed the old statement archive, so the script lists archived Monetary Policy Statements via the Wayback CDX index, downloads the PDFs, and parses each one's date, action (hike, cut or hold), change in basis points and new policy rate. It then adds hand-coded entries and checks that stated changes match the rate path.",
    reads: ["Internet: Wayback Machine CDX index for `sbp.org.pk/m_policy/*` and the archived PDFs", "`data/raw/sbp_mps/cdx_listing.txt` (cached index, used if the CDX request fails)", "`data/raw/sbp_mps/*.pdf` (statements already downloaded)", "`data/external/sbp_mpc_decisions_manual.csv` (hand-coded decisions)"],
    writes: ["`data/raw/sbp_mps/*.pdf` (new statements)", "`data/raw/sbp_mps/cdx_listing.txt`", "`data/external/sbp_mpc_decisions.csv`", "Console log; saved to `logs/sbp_mps_run.log` when redirected"],
    run: "`python src/scraping/sbp_mps.py`",
    notes: "66 decisions, Jan 2018 - Sep 2026 (32 hold, 21 hike, 13 cut); every stated change agrees with the rate path.",
  },
  {
    path: "src/cleaning/build_master.py", step: "7", lang: "Python script",
    purpose: "Builds the master dataset: 1 row = 1 SPI week x 1 group (Q1-Q5, Combined). It applies the documented cleaning decisions D1-D5, merges the exchange rate, events and policy rate, derives log SPI, % changes, lags, the next-week target and group dummies. It also defines `nearest_thursday()`, which notebook 01 imports.",
    reads: ["`data/interim/spi_quintile_weekly.csv`", "`data/interim/spi_items_weekly.csv` (petrol/diesel, for fuel-revision flags)", "`data/raw/fx/pkr_usd_daily_yahoo.csv`", "`data/external/islamic_events.csv`", "`data/external/sbp_mpc_decisions.csv`"],
    writes: ["`data/processed/master_weekly_quintile.csv`", "`data/processed/cleaning_report.txt`"],
    run: "`python src/cleaning/build_master.py`",
    notes: "Decisions: D1 align reports to the nearest Thursday; D2 fill weeks without a report from the next report's previous-week value; D3 use PBS's revised values; D4 drop FX bad ticks; D5 flag fuel-revision weeks (|petrol or diesel weekly change| > 1%).",
  },
  {
    path: "notebooks/01_data_preparation.ipynb", step: "8", lang: "Jupyter notebook (kernel 'DS4SG (.venv)')",
    purpose: "Milestone 2, Section 2 (data preparation). Covers the inventory, the collection audit, the pivot/melt demonstration, the completed item panel (week x 51 items), category contributions from PBS item impacts, missing-data tables and strategy (including the selection-bias check), log transforms (Figure P1), Min-Max and Z-score scaling fitted on the training period only, and dummy encoding. It saves the modeling-ready datasets and the data dictionary.",
    reads: ["`data/processed/master_weekly_quintile.csv`", "`data/interim/spi_items_weekly.csv`", "`data/interim/spi_parse_log.csv`", "`data/external/spi_items.csv`", "`data/external/sbp_mpc_decisions.csv`", "`data/raw/spi_weekly/manifest.csv`", "Code: `nearest_thursday()` from `src/cleaning/build_master.py`; `src/utils/plot_style.py`"],
    writes: ["`data/processed/master_model_ready.csv`", "`data/processed/items_weekly_panel.csv`", "`data/processed/DATA_DICTIONARY.md`", "`reports/tables/missing_values_before.csv`, `missing_values_after.csv`, `scaling_parameters.csv`", "`reports/figures/figP1_log_transform.png`"],
    run: "Open in Jupyter and Run All, or `jupyter nbconvert --to notebook --execute --inplace notebooks/01_data_preparation.ipynb`",
    notes: "Interim files are not in git: run `parse_spi.py` first in a fresh copy of the project.",
  },
  {
    path: "src/features/build_features.py", step: "9", lang: "Python script",
    purpose: "Builds the early-warning feature set. It defines the shock target (weekly SPI rise of at least 1%) and lead signals known at the end of week t: the fuel-review calendar, the fiscal-year start, the Eid ul-Adha window, Ramadan, exchange-rate changes over 4/8/13 weeks, component inflation, recent shocks, and momentum-item spikes (items chosen on training data only). It also builds forward-looking targets for the pass-through analysis.",
    reads: ["`data/processed/master_model_ready.csv`", "`data/processed/items_weekly_panel.csv`", "`data/external/islamic_events.csv`"],
    writes: ["`data/processed/master_features.csv`", "`data/processed/FEATURES_DICTIONARY.md`"],
    run: "`python src/features/build_features.py`",
    notes: "Decisions F1-F4 are documented in the script header. Momentum items (training period): bananas, chilies powder, onions, potatoes, pulse gram, pulse moong, tea packet.",
  },
  {
    path: "src/analysis/quintile_insights.py", step: "10", lang: "Python script",
    purpose: "The exploratory analysis used to choose the project narrative. It covers inflation regimes by quintile, the variance decomposition from PBS item impacts (shocks vs grind), the implied exposure of all five quintiles to price components, volatility and baseline forecast errors, calendar windows, exchange-rate pass-through, and spike persistence.",
    reads: ["`data/processed/master_model_ready.csv`", "`data/processed/items_weekly_panel.csv`", "`data/external/islamic_events.csv`"],
    writes: ["14 tables `reports/tables/insights_*.csv`", "Console output (saved once to `logs/insights_run.log`)"],
    run: "`python src/analysis/quintile_insights.py`",
    notes: "The findings document `reports/quintile_insights.md` was written from this script's output; every number in it can be regenerated here.",
  },
  {
    path: "notebooks/02_eda.ipynb", step: "11", lang: "Jupyter notebook (kernel 'DS4SG (.venv)')",
    purpose: "Milestone 2, Sections 3-4 (EDA and hypotheses). It covers univariate summaries (resistant vs non-resistant statistics), outliers by both course rules plus masking, the rotating burden, shocks vs grind, contingency tests of the early-warning signals, exchange-rate pass-through with HAC errors, Spearman correlation matrices, and the formal hypotheses H1-H5 with variable mapping.",
    reads: ["`data/processed/master_features.csv`", "`data/processed/items_weekly_panel.csv`", "Code: `src/utils/plot_style.py`"],
    writes: ["Figures `reports/figures/figE1` to `figE5`", "12 tables `reports/tables/eda_*.csv`"],
    run: "Open in Jupyter and Run All, or `jupyter nbconvert --to notebook --execute --inplace notebooks/02_eda.ipynb`",
    notes: "Figures follow a shared colour-blind-validated palette: Q1 orange, Q5 blue, Combined grey.",
  },
];

const SUPPORT = [
  {
    path: "src/utils/plot_style.py", lang: "Python module (imported, not run)",
    purpose: "Shared figure style for every notebook: fixed group colours, quiet grids, dark text, and 300-dpi export, so all manuscript figures look consistent.",
    reads: ["No data"], writes: ["No data (sets matplotlib defaults)"], used: "Imported by `notebooks/01_data_preparation.ipynb` and `notebooks/02_eda.ipynb`.",
  },
  {
    path: ".claude/hooks/log_handoff.py", lang: "Python script (Claude Code hook)",
    purpose: "Runs automatically whenever `HANDOFF.md` is written. It appends a timestamped snapshot to the handoff log, skips identical versions, and rejects (does not log) a handoff longer than 400 lines.",
    reads: ["`HANDOFF.md`"], writes: ["Appends to `logs/HANDOFF_LOG.md`", "`logs/.handoff_last_hash`"],
    used: "Configured in `.claude/settings.json` (PostToolUse hook on Write/Edit). It can also be run by hand: `python .claude/hooks/log_handoff.py`.",
  },
];

// Data files: [path, layer, contents, origin, purpose, producedBy, usedBy, git]
const DATA = {
  raw: [
    {
      path: "data/raw/spi_weekly/catalogue.csv",
      contents: "2,204 rows x 8 columns: `week_date`, `kind` (summary/annex/other), `ext`, `source` (pbs_live/wayback), `folder`, `url` (original location), `fetch_url` (download address; for Wayback, the archived copy), `wayback_ts` (archive timestamp).",
      origin: "Generated by querying the current PBS price-statistics page and the Wayback Machine CDX index.",
      purpose: "The list of every candidate file for every week, from which the downloader chooses one report per week.",
      produced: "`spi_catalogue.py`", used: "`spi_download.py`", git: "Committed (small; documents provenance)",
    },
    {
      path: "data/raw/spi_weekly/manifest.csv",
      contents: "379 rows x 13 columns, one row per download attempt: `week_date`, `kind`, `source`, `folder`, `url`, `fetch_url`, `local_path`, `status` (ok / failed / base_mismatch), `bytes`, `sha256`, `base_check`, `downloaded_at`, `note`. 359 rows are successful downloads; 15 attempts were dead links (HTTP 404); 5 early-Aug-2019 files were rejected as old base.",
      origin: "Appended by the downloader as it runs.",
      purpose: "The audit trail of the data collection (M2 §2.1): which file was used for each week, where it came from, when, and its checksum.",
      produced: "`spi_download.py` (appends)", used: "`spi_download.py` (resume), `parse_spi.py` (which files to parse), `notebooks/01_data_preparation.ipynb` (audit summary)", git: "Committed",
    },
    {
      path: "data/raw/spi_weekly/wayback/summary/  (222 files)",
      contents: "222 PDF weekly SPI summary reports, named `YYYY-MM-DD_summary_<folder>.pdf`, where `<folder>` is `weekly_spi_nb` or `weekly_spi`. They cover 5 Sep 2019 - Dec 2024. Each report (PBS 'Annexure-III') contains the quintile table, a 10-week trend table and the 51-item price table with weights and impacts. From Mar 2020 an executive-summary page comes first.",
      origin: "Wayback Machine copies of the old PBS website (`pbs.gov.pk/sites/default/files/price_statistics/weekly_spi_nb/` and `.../weekly_spi/`), which no longer exists online.",
      purpose: "Primary source for the 2019-2023 part of the weekly SPI series.",
      produced: "`spi_download.py`", used: "`parse_spi.py`", git: "Not in git (66 MB); rebuild with `spi_catalogue.py` + `spi_download.py`",
    },
    {
      path: "data/raw/spi_weekly/pbs_live/summary/  (137 files)",
      contents: "137 weekly SPI reports from the current PBS website: 86 PDF and 51 Excel, named `YYYY-MM-DD_summary_live.pdf/.xlsx`. They cover 13 Jul 2023 - 1 Oct 2026; Excel is available from 23 Oct 2025. The Excel workbook has sheets 'Page 1' (quintile table and trend), 'Page 2' (51-item table) and 'Page 3' (monthly history).",
      origin: "Current PBS website, `https://www.pbs.gov.pk/wp-content/uploads/2020/07/...`, listed on the price-statistics page.",
      purpose: "Primary source for Jul 2023 onward. Excel files are preferred because they need no PDF parsing.",
      produced: "`spi_download.py`", used: "`parse_spi.py`", git: "Not in git (37 MB); rebuild with the scrapers",
    },
    {
      path: "data/raw/sbp_mps/*.pdf  (63 files)",
      contents: "63 PDFs, `MPS-<Month>-<Year>-Eng.pdf`: SBP Monetary Policy Statements, 2018 - Apr 2026. The first page states the decision date and the policy-rate decision.",
      origin: "Wayback Machine copies of `https://www.sbp.org.pk/m_policy/<year>/` (removed from the live SBP site in its redesign).",
      purpose: "Source of the monetary-policy decision dates and rates.",
      produced: "`sbp_mps.py`", used: "`sbp_mps.py` (parsed on each run)", git: "Not in git (18 MB)",
    },
    {
      path: "data/raw/sbp_mps/cdx_listing.txt",
      contents: "Plain-text Wayback CDX listing (timestamp, URL) of every archived file under `sbp.org.pk/m_policy/`.",
      origin: "Saved from the Wayback CDX API on the last successful query.",
      purpose: "Cache, so that the SBP scraper still works if the CDX request fails or is rate-limited.",
      produced: "`sbp_mps.py`", used: "`sbp_mps.py` (fallback)", git: "Not in git",
    },
    {
      path: "data/raw/fx/pkr_usd_daily_yahoo.csv",
      contents: "2,170 rows x 6 columns: `date`, `pkr_per_usd` (close), `high`, `low`, `pct_change_1d`, `flag_jump_gt5pct`. Trading days 1 Jun 2018 - 2 Oct 2026.",
      origin: "Yahoo Finance ticker PKR=X via `yfinance`.",
      purpose: "Exchange-rate predictor (weekly average and changes) for the early-warning model and the pass-through analysis.",
      produced: "`fx_rates.py`", used: "`build_master.py`", git: "Not in git; rebuild with `fx_rates.py`",
    },
    {
      path: "data/raw/ogra/  (empty)",
      contents: "Empty placeholder folder.",
      origin: "Reserved for OGRA fortnightly petroleum price notifications.",
      purpose: "Planned data extension (M5).",
      produced: "-", used: "-", git: "Folder only",
    },
  ],
  external: [
    {
      path: "data/external/spi_items.csv",
      contents: "51 rows x 6 columns: `item_id` (short code, e.g. `wheat_flour`), `item_name` (official PBS name), `unit`, `category` (food / energy / clothing_footwear / household), `weight_q1` and `weight_combined` (fixed 2015-16 basket weights, %).",
      origin: "Names, units and weights copied from the PBS SPI report of 1 Oct 2026 (Excel). `item_id` and `category` are team-defined. Created once; not regenerated by the pipeline.",
      purpose: "The canonical item list: used to match raw item names across years, and to group items into categories.",
      produced: "One-off, during setup (hand-curated lookup)", used: "`parse_spi.py`, `notebooks/01_data_preparation.ipynb`", git: "Committed",
    },
    {
      path: "data/external/islamic_events_pk_overrides.csv",
      contents: "20 rows x 5 columns: `event`, `hijri_year`, `date_pakistan`, `verified` (all False), `note`.",
      origin: "Hand-entered Pakistan dates for Ramadan and the Eids, 2018-2025, from recollection of official announcements. NOT yet verified.",
      purpose: "Correct the Umm al-Qura dates to Pakistan's moon-sighting dates.",
      produced: "Hand-entered", used: "`build_event_calendar.py`", git: "Committed",
    },
    {
      path: "data/external/islamic_events.csv",
      contents: "30 rows x 10 columns: `event` (ramadan_start / eid_ul_fitr / eid_ul_adha), `hijri_year` (1439-1448), `date_pakistan`, `date_end`, `duration_days`, `date_umm_al_qura`, `offset_days`, `date_source`, `verified`, `note`.",
      origin: "Computed by `build_event_calendar.py`.",
      purpose: "The calendar behind the Ramadan / Eid features and the calendar-window analyses.",
      produced: "`build_event_calendar.py`", used: "`build_master.py`, `build_features.py`, `quintile_insights.py`", git: "Committed",
    },
    {
      path: "data/external/sbp_mpc_decisions_manual.csv",
      contents: "6 rows x 6 columns (same as the decisions table): hand-coded decisions with the source URL and quoted evidence. Covers Jan, Mar and Nov 2018 (statements the parser could not read) and Jun, Jul and Sep 2026 (newer than the archive; from SBP press releases).",
      origin: "Hand-coded from the statements and SBP press releases.",
      purpose: "Fill gaps the automatic parser cannot cover.",
      produced: "Hand-entered", used: "`sbp_mps.py`", git: "Committed",
    },
    {
      path: "data/external/sbp_mpc_decisions.csv",
      contents: "66 rows x 6 columns: `decision_date`, `action` (hike/cut/hold), `change_bps` (signed), `policy_rate` (%), `source` (URL), `evidence` (sentence quoted from the statement). Jan 2018 - Sep 2026.",
      origin: "Parsed SBP Monetary Policy Statements plus the manual entries.",
      purpose: "Policy-rate level, MPC-week flag and MPC-action dummies.",
      produced: "`sbp_mps.py`", used: "`build_master.py`, `notebooks/01_data_preparation.ipynb`", git: "Committed",
    },
  ],
  interim: [
    {
      path: "data/interim/spi_quintile_weekly.csv",
      contents: "2,154 rows (359 reports x 6 groups) x 8 columns: `week_end` (date printed in the report), `group`, `spi`, `spi_prev_week`, `spi_year_ago`, `pct_wow_reported`, `pct_yoy_reported`, `source_file`.",
      origin: "Parsed from the raw reports.",
      purpose: "The quintile index exactly as published, before cleaning.",
      produced: "`parse_spi.py`", used: "`build_master.py`", git: "Not in git; regenerate with `parse_spi.py`",
    },
    {
      path: "data/interim/spi_items_weekly.csv",
      contents: "18,309 rows (359 reports x 51 items) x 15 columns: `week_end`, `item_id`, `match_score`, `item_name_raw`, `unit`, `price`, `price_prev_week`, `price_year_ago`, `pct_wow`, `pct_yoy`, `weight_q1`, `weight_combined`, `impact_q1`, `impact_combined`, `source_file`.",
      origin: "Parsed from the raw reports.",
      purpose: "Item-level prices and PBS's item impacts (each item's contribution to the weekly change).",
      produced: "`parse_spi.py`", used: "`build_master.py` (fuel flags), `notebooks/01_data_preparation.ipynb` (item panel)", git: "Not in git; regenerate with `parse_spi.py`",
    },
    {
      path: "data/interim/spi_parse_log.csv",
      contents: "359 rows x 7 columns: `catalogue_week`, `parsed_week`, `file`, `base`, `quintile_ok`, `n_items`, `error`.",
      origin: "Written by the parser, one row per report.",
      purpose: "Quality control: proves every report parsed completely and is on the 2015-16 base.",
      produced: "`parse_spi.py`", used: "`notebooks/01_data_preparation.ipynb` (audit summary)", git: "Not in git",
    },
  ],
  processed: [
    {
      path: "data/processed/master_weekly_quintile.csv",
      contents: "2,220 rows (370 weeks x 6 groups) x 36 columns: SPI and its reported fields, flags `filled_from_next_report` / `revised_by_next_report`, weekly FX average, petrol/diesel changes, fuel-revision flag, Ramadan/Eid day counts, weeks to Ramadan, policy rate, MPC-week flag, log SPI, weekly and y/y % changes, lags, `target_spi_wow_pct_next`, group dummies.",
      origin: "Output of the cleaning step (decisions D1-D5).",
      purpose: "The cleaned master dataset; input to the preparation notebook.",
      produced: "`build_master.py`", used: "`notebooks/01_data_preparation.ipynb`", git: "Committed",
    },
    {
      path: "data/processed/cleaning_report.txt",
      contents: "Plain-text log of cleaning decisions D1-D5 with counts (e.g. 14 reports realigned, 11 weeks filled, 13 PBS revisions applied).",
      origin: "Written by the cleaning step.",
      purpose: "Evidence for the cleaning decisions in the manuscript.",
      produced: "`build_master.py`", used: "Reference (manuscript)", git: "Committed",
    },
    {
      path: "data/processed/master_model_ready.csv",
      contents: "2,220 rows x 70 columns: the master dataset plus category contributions (`contrib_*_q1`, `contrib_*_comb`), year-ago SPI filled from the 52-week lag, recomputed fuel changes, `log_fx`, Min-Max (`*_mm`) and Z-score (`*_z`) scaled predictors, and MPC-action dummies. Every column is described in `DATA_DICTIONARY.md`.",
      origin: "Output of the preparation notebook.",
      purpose: "The modeling-ready dataset (M2 §2).",
      produced: "`notebooks/01_data_preparation.ipynb`", used: "`build_features.py`, `quintile_insights.py`", git: "Committed",
    },
    {
      path: "data/processed/items_weekly_panel.csv",
      contents: "18,870 rows (370 weeks x 51 items, complete grid) x 18 columns: `week_end`, `item_id`, `item_name`, `category`, `unit`, `price`, `log_price`, `price_wow_pct`, `price_prev_week`, `price_year_ago`, `pct_wow`, `pct_yoy`, `weight_q1`, `weight_combined`, `impact_q1`, `impact_combined`, `price_filled_from_next_report`, `source_file`.",
      origin: "The interim item table, completed for the 11 weeks without a report (prices from the next report) and joined to the item lookup.",
      purpose: "Item-level analysis: contributions, component inflation, spike momentum.",
      produced: "`notebooks/01_data_preparation.ipynb`", used: "`build_features.py`, `quintile_insights.py`, `notebooks/02_eda.ipynb`", git: "Committed",
    },
    {
      path: "data/processed/DATA_DICTIONARY.md",
      contents: "Markdown table of all 70 columns of `master_model_ready.csv`: name, data type, % missing, description.",
      origin: "Generated by the preparation notebook (it fails if any column is undocumented).",
      purpose: "Documentation of the modeling-ready dataset.",
      produced: "`notebooks/01_data_preparation.ipynb`", used: "Reference", git: "Committed",
    },
    {
      path: "data/processed/master_features.csv",
      contents: "2,220 rows x 105 columns: `master_model_ready.csv` plus 35 early-warning columns. These include the targets `target_shock_next`, `target_spi_chg_next4w/8w/13w`; calendar signals `fuel_review_next_week`, `fy_start_next_week`, `pre_eid_adha_4w`, `ramadan_next_week`; `fx_chg_4w/8w/13w`; component inflation `infl_*_wow` and `infl_*_4w`; `momentum_spikes_4w`, `momentum_basket_chg_4w`; `shock_now`, `shocks_last_4w`, `spi_chg_4w/13w`, `gap_q1_q5_wow`, `policy_rate_chg_13w`.",
      origin: "Output of the feature script.",
      purpose: "The dataset for the EDA (M2 §3-4) and for the models in M3-M5.",
      produced: "`build_features.py`", used: "`notebooks/02_eda.ipynb`; future modeling notebooks", git: "Committed",
    },
    {
      path: "data/processed/FEATURES_DICTIONARY.md",
      contents: "Markdown table describing the 35 columns that `build_features.py` adds, including the list of momentum items.",
      origin: "Generated by the feature script.",
      purpose: "Documentation of the early-warning features.",
      produced: "`build_features.py`", used: "Reference", git: "Committed",
    },
  ],
};

const FIGURES = [
  ["`figP1_log_transform.png`", "Why prices and the SPI are log-transformed: histograms of item prices (raw vs log) and SPI time plots (raw vs log scale)", "`notebooks/01_data_preparation.ipynb`", "`items_weekly_panel` (in memory), `master_weekly_quintile.csv`"],
  ["`figE1_rotating_burden.png`", "Year-on-year inflation for Q1, Q5 and Combined, plus the Q1-Q5 gap, with the two regimes shaded", "`notebooks/02_eda.ipynb`", "`master_features.csv`"],
  ["`figE2_shocks_vs_grind.png`", "Basket share vs share of weekly variance by price component, Q1 and Combined", "`notebooks/02_eda.ipynb`", "`items_weekly_panel.csv`"],
  ["`figE3_weekly_change_distribution.png`", "Box plots of weekly SPI changes by group, with outliers and the +1% shock threshold", "`notebooks/02_eda.ipynb`", "`master_features.csv`"],
  ["`figE4_early_warning_signals.png`", "Change in next-week shock probability for each signal, Q1 vs Q5, with 95% CIs", "`notebooks/02_eda.ipynb`", "`master_features.csv`"],
  ["`figE5_fx_passthrough.png`", "Cumulative SPI response to a 1% rupee depreciation by horizon, Q1 / Q5 / Combined", "`notebooks/02_eda.ipynb`", "`master_features.csv`"],
];

const TABLES = [
  ["`missing_values_before.csv` / `missing_values_after.csv`", "Missing counts and % per column, before and after treatment", "`notebooks/01_data_preparation.ipynb`"],
  ["`scaling_parameters.csv`", "Training-period min, max, mean and SD for each scaled predictor (reused by the models)", "`notebooks/01_data_preparation.ipynb`"],
  ["`eda_summary_target.csv`, `eda_summary_predictors.csv`", "Univariate summaries: mean, median, SD, IQR, robust SD, skewness, kurtosis", "`notebooks/02_eda.ipynb`"],
  ["`eda_outliers.csv`, `eda_extreme_weeks.csv`", "Outlier counts by both rules, masking check; the 10 largest weekly moves and their drivers", "`notebooks/02_eda.ipynb`"],
  ["`eda_cumulative_inflation.csv`, `eda_shock_rate.csv`", "Cumulative inflation and shock-week rate by group and period", "`notebooks/02_eda.ipynb`"],
  ["`eda_exposure_by_quintile.csv`", "Implied exposure of each group to six price components (OLS, HAC)", "`notebooks/02_eda.ipynb`"],
  ["`eda_shocks_vs_grind.csv`", "Basket weight, cumulative contribution and variance share by component (Q1, Combined)", "`notebooks/02_eda.ipynb`"],
  ["`eda_signal_contingency.csv`", "Shock probability with vs without each signal, difference with CI, Fisher p-value", "`notebooks/02_eda.ipynb`"],
  ["`eda_fx_passthrough.csv`", "Pass-through coefficient by horizon 1-13 weeks", "`notebooks/02_eda.ipynb`"],
  ["`eda_corr_with_targets.csv`, `eda_corr_predictors.csv`", "Spearman correlations: predictors vs targets (Q1, Q5), and among predictors", "`notebooks/02_eda.ipynb`"],
  ["`insights_1_*.csv` (4 files)", "Cumulative inflation, peaks, inflation by fiscal year and period, Q1/Q5 relative price level", "`src/analysis/quintile_insights.py`"],
  ["`insights_2_*.csv` (3 files)", "Variance decomposition, contributions by fiscal year, item contribution gap Q1 vs Combined", "`src/analysis/quintile_insights.py`"],
  ["`insights_3_implied_exposure.csv`", "Exposure regression for all quintiles", "`src/analysis/quintile_insights.py`"],
  ["`insights_4_*.csv` (2 files)", "Volatility by group; baseline (AR(1), no-change) forecast errors", "`src/analysis/quintile_insights.py`"],
  ["`insights_5_*.csv` (2 files)", "Weekly change around Ramadan and Eid ul-Adha", "`src/analysis/quintile_insights.py`"],
  ["`insights_6_fx_passthrough.csv`", "Pass-through at 1, 4, 8, 13 weeks for all groups", "`src/analysis/quintile_insights.py`"],
  ["`insights_7_spike_persistence.csv`", "Median price change in the 8 weeks after a >5% item spike", "`src/analysis/quintile_insights.py`"],
];

const DOCS = [
  ["`CLAUDE.md`", "Project instructions: overview, chosen narrative, data facts, repository layout, conventions, milestone dates, session protocol.", "Edited by hand", "Committed"],
  ["`HANDOFF.md`", "Current state of the project (done, now, next, decisions, open questions). Rewritten every session; maximum 400 lines.", "Edited by hand", "Committed"],
  ["`logs/HANDOFF_LOG.md`", "Append-only history of every version of HANDOFF.md.", "`.claude/hooks/log_handoff.py`", "Committed"],
  ["`logs/.handoff_last_hash`", "Hash of the last logged handoff (prevents duplicate entries).", "`.claude/hooks/log_handoff.py`", "Not in git"],
  ["`logs/spi_download_run.log`, `logs/sbp_mps_run.log`, `logs/insights_run.log`", "Console output of the SPI downloader, the SBP scraper and the insights script (saved when output was redirected).", "The respective scripts", "Not in git"],
  ["`README.md`", "Human-facing overview and setup instructions (virtual environment, notebook kernel).", "Edited by hand", "Committed"],
  ["`requirements.txt`", "Python packages needed by the scripts and notebooks.", "Edited by hand", "Committed"],
  ["`.gitignore`", "What git does not track: raw data (except catalogue and manifest), interim data, course materials, logs, the virtual environment.", "Edited by hand", "Committed"],
  ["`.claudeignore`, `.claude/settings.json`", "Files Claude should not read without permission (handoff log, raw data); the handoff-log hook configuration.", "Edited by hand", "Committed"],
  ["`manuscript/02_data_collection_audit.md`", "Draft of manuscript §II.1 / M2 §2.1: how the data were collected, coverage, parsing, supporting sources.", "Written from the pipeline results", "Committed"],
  ["`reports/quintile_insights.md`", "Quintile findings and the three candidate narratives (the chosen one: early warning + rotating burden).", "Written from `quintile_insights.py` output", "Committed"],
  ["`milestones/M1_proposal/Milestone1.docx`", "Submitted Milestone 1 proposal.", "Team", "Committed"],
  ["`milestones/M2_data_eda_hypotheses/Milestone2_description_rubric.md`", "Milestone 2 brief and grading rubric.", "Course", "Committed"],
  ["`course/syllabus/`, `course/lecture_slides/`", "Syllabus and lecture slides (Units 01-07), reference only.", "Course (Canvas)", "Not in git (copyright)"],
];

// Cross-reference matrix: data file x script (R = reads, W = writes, R/W = both).
const MCOLS = ["spi_ catalogue", "spi_ download", "parse_ spi", "fx_ rates", "build_ event_ calendar", "sbp_ mps", "build_ master", "nb 01 prep", "build_ features", "quintile_ insights", "nb 02 EDA"];
const M = [
  ["raw/spi_weekly/catalogue.csv", ["W", "R", "", "", "", "", "", "", "", "", ""]],
  ["raw/spi_weekly/manifest.csv", ["", "R/W", "R", "", "", "", "", "R", "", "", ""]],
  ["raw/spi_weekly/wayback/summary/*.pdf", ["", "W", "R", "", "", "", "", "", "", "", ""]],
  ["raw/spi_weekly/pbs_live/summary/*", ["", "W", "R", "", "", "", "", "", "", "", ""]],
  ["raw/sbp_mps/*.pdf", ["", "", "", "", "", "R/W", "", "", "", "", ""]],
  ["raw/sbp_mps/cdx_listing.txt", ["", "", "", "", "", "R/W", "", "", "", "", ""]],
  ["raw/fx/pkr_usd_daily_yahoo.csv", ["", "", "", "W", "", "", "R", "", "", "", ""]],
  ["external/spi_items.csv", ["", "", "R", "", "", "", "", "R", "", "", ""]],
  ["external/islamic_events_pk_overrides.csv", ["", "", "", "", "R", "", "", "", "", "", ""]],
  ["external/islamic_events.csv", ["", "", "", "", "W", "", "R", "", "R", "R", ""]],
  ["external/sbp_mpc_decisions_manual.csv", ["", "", "", "", "", "R", "", "", "", "", ""]],
  ["external/sbp_mpc_decisions.csv", ["", "", "", "", "", "W", "R", "R", "", "", ""]],
  ["interim/spi_quintile_weekly.csv", ["", "", "W", "", "", "", "R", "", "", "", ""]],
  ["interim/spi_items_weekly.csv", ["", "", "W", "", "", "", "R", "R", "", "", ""]],
  ["interim/spi_parse_log.csv", ["", "", "W", "", "", "", "", "R", "", "", ""]],
  ["processed/master_weekly_quintile.csv", ["", "", "", "", "", "", "W", "R", "", "", ""]],
  ["processed/cleaning_report.txt", ["", "", "", "", "", "", "W", "", "", "", ""]],
  ["processed/master_model_ready.csv", ["", "", "", "", "", "", "", "W", "R", "R", ""]],
  ["processed/items_weekly_panel.csv", ["", "", "", "", "", "", "", "W", "R", "R", "R"]],
  ["processed/DATA_DICTIONARY.md", ["", "", "", "", "", "", "", "W", "", "", ""]],
  ["processed/master_features.csv", ["", "", "", "", "", "", "", "", "W", "", "R"]],
  ["processed/FEATURES_DICTIONARY.md", ["", "", "", "", "", "", "", "", "W", "", ""]],
  ["reports/tables/missing_*, scaling_*", ["", "", "", "", "", "", "", "W", "", "", ""]],
  ["reports/tables/insights_*.csv", ["", "", "", "", "", "", "", "", "", "W", ""]],
  ["reports/tables/eda_*.csv", ["", "", "", "", "", "", "", "", "", "", "W"]],
  ["reports/figures/figP1", ["", "", "", "", "", "", "", "W", "", "", ""]],
  ["reports/figures/figE1-E5", ["", "", "", "", "", "", "", "", "", "", "W"]],
];

// ---------------------------------------------------------------- assemble
const body = [];

// Cover
body.push(new Paragraph({ children: [], spacing: { before: 2400 } }));
body.push(new Paragraph({ children: [new TextRun({ text: "Script & Data File Reference", font: FONT, size: 52, bold: true, color: ACCENT })], spacing: { after: 200 } }));
body.push(P("Early-warning system for essential-price shocks across income quintiles in Pakistan", { size: 28, color: MUTED, after: 120 }));
body.push(P("CS/SDP 312/314 Data Science for Social Good · Team: Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid", { size: 22, color: MUTED, after: 120 }));
body.push(P("Version: 4 October 2026 (state of the repository after commit `b10d72c`)", { size: 22, color: MUTED, after: 600 }));
body.push(P("This document lists every script and every data file in the project. For each one it explains what it contains, what it is for, where it came from, and which scripts produce and use it. A cross-reference matrix at the end connects every data file to every script.", { size: 22 }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// TOC
body.push(new Paragraph({ children: [new TextRun({ text: "Contents", font: FONT, size: 32, bold: true, color: ACCENT })], spacing: { after: 200 } }));
body.push(new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }));
body.push(new Paragraph({ children: [new PageBreak()] }));

// 1. How to read
body.push(H1("1. How to read this document"));
body.push(P("The project is a data pipeline: scripts download raw files, turn them into clean tables, and produce datasets, figures and tables for the manuscript. Data move through four layers, each in its own folder:"));
body.push(BUL("**Raw** (`data/raw/`): files exactly as downloaded (PDF/Excel reports, CSV downloads). Never edited by hand."));
body.push(BUL("**External** (`data/external/`): small lookup tables, either hand-built (with sources noted) or generated from such inputs."));
body.push(BUL("**Interim** (`data/interim/`): tables extracted from the raw files but not yet cleaned."));
body.push(BUL("**Processed** (`data/processed/`): cleaned, documented datasets used for analysis and modeling."));
body.push(P("Each entry gives these fields:", { before: 120 }));
body.push(BUL("**Contents:** rows, columns and the meaning of the main columns."));
body.push(BUL("**Origin:** where the data came from (website, archive, calculation, hand entry)."));
body.push(BUL("**Purpose:** why the project needs it."));
body.push(BUL("**Produced by / Used by:** the scripts that write and read it."));
body.push(BUL("**In git:** whether the file is version-controlled. Raw report files are too large and are rebuilt by the scrapers; interim files are rebuilt by the parser."));
body.push(P("Paths are relative to the project folder. In the cross-reference matrix (Section 7), R means the script reads the file and W means it writes it.", { before: 120 }));

// 2. Pipeline overview
body.push(H1("2. Pipeline overview: run order and data flow"));
body.push(P("Run the steps in this order from the project folder (with the `.venv` environment active). Steps 1, 2, 4 and 6 need internet access. Step 2 is slow because it deliberately paces its requests to the Internet Archive."));
const W2 = [500, 2300, 3113, 3113];
body.push(grid(["#", "Script", "Reads", "Writes"], SCRIPTS.map((s) => [s.step, "`" + s.path + "`", s.reads.map((x) => x.replace(/^Internet: /, "Internet: ")).join("; "), s.writes.join("; ")]), W2, { size: 17 }));
body.push(spacer());
body.push(P("**In short:** web sources → `catalogue.csv` → report files + `manifest.csv` → interim tables → `master_weekly_quintile.csv` → `master_model_ready.csv` + `items_weekly_panel.csv` → `master_features.csv` → EDA figures and tables. The exchange rate, event calendar and SBP decisions join the main flow at the master-dataset step."));

// 3. Scripts
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(H1("3. Scripts and notebooks"));
body.push(P("Pipeline scripts in run order, followed by two support files."));
for (const s of SCRIPTS) {
  body.push(H3(`Step ${s.step} · \`${s.path}\``));
  body.push(card([["Type", s.lang], ["Purpose", s.purpose], ["Reads", s.reads], ["Writes", s.writes], ["How to run", s.run], ["Notes", s.notes]]));
  body.push(spacer());
}
body.push(H2("Support files"));
for (const s of SUPPORT) {
  body.push(H3("`" + s.path + "`"));
  body.push(card([["Type", s.lang], ["Purpose", s.purpose], ["Reads", s.reads], ["Writes", s.writes], ["Used by", s.used]]));
  body.push(spacer());
}

// 4. Data files
const LAYERS = [
  ["raw", "4.1 Raw data (data/raw/)", "Files exactly as downloaded. Individual report files are grouped by folder; every single file, with its source URL and checksum, is listed in `data/raw/spi_weekly/manifest.csv`."],
  ["external", "4.2 External and lookup data (data/external/)", "Small tables that the pipeline needs but that do not come from the SPI reports: hand-built lookups and the tables generated from them."],
  ["interim", "4.3 Interim data (data/interim/)", "Tables extracted from the raw reports, before cleaning. Not stored in git; regenerate with `python src/cleaning/parse_spi.py`."],
  ["processed", "4.4 Processed data (data/processed/)", "Cleaned and documented datasets used for analysis and modeling."],
];
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(H1("4. Data files"));
for (const [key, title, intro] of LAYERS) {
  body.push(H2(title));
  body.push(P(intro));
  for (const d of DATA[key]) {
    body.push(H3("`" + d.path + "`"));
    body.push(card([["Contents", d.contents], ["Origin", d.origin], ["Purpose", d.purpose], ["Produced by", d.produced], ["Used by", d.used], ["In git", d.git]]));
    body.push(spacer());
  }
}

// 5. Outputs
body.push(new Paragraph({ children: [new PageBreak()] }));
body.push(H1("5. Output files (reports/)"));
body.push(H2("5.1 Figures (reports/figures/)"));
body.push(P("PNG at 300 dpi, in the shared style from `src/utils/plot_style.py`. All are committed to git."));
body.push(grid(["File", "What it shows", "Produced by", "Data used"], FIGURES, [2500, 3326, 1700, 1500], { size: 17 }));
body.push(H2("5.2 Tables (reports/tables/)"));
body.push(P("CSV tables behind the numbers quoted in the notebooks, the insights document and the manuscript. All are committed to git."));
body.push(grid(["File(s)", "Contents", "Produced by"], TABLES, [3100, 3926, 2000], { size: 17 }));

// 6. Documentation and configuration
body.push(H1("6. Documentation, configuration and other files"));
body.push(grid(["File", "What it is", "Produced by", "In git"], DOCS, [2700, 3826, 1500, 1000], { size: 17 }));
body.push(spacer());
body.push(P("Not listed: `.venv/` (the local Python environment, recreated with `pip install -r requirements.txt`) and `.git/` (version history)."));

// 7. Matrix (landscape section)
const matrixRows = M.map(([f, cells]) => [`\`${f}\``, ...cells]);
const firstW = 3558;
const colW = Math.floor((LAND_W - firstW) / MCOLS.length);
const mw = [firstW, ...Array(MCOLS.length).fill(colW)];
const matrixTable = new Table({
    layout: TableLayoutType.FIXED,
  width: { size: mw.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: mw,
  rows: [
    new TableRow({ tableHeader: true, children: ["Data file  ↓  /  script  →", ...MCOLS].map((h, i) => cell(h, mw[i], { bold: true, fill: HEAD_FILL, size: 15, align: i ? AlignmentType.CENTER : undefined, valign: VerticalAlign.BOTTOM })) }),
    ...matrixRows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, mw[i], {
      size: i ? 17 : 15, bold: i > 0 && c !== "", align: i ? AlignmentType.CENTER : undefined,
      fill: i && c.includes("W") ? "FCE4D6" : (i && c === "R" ? "E2EFDA" : undefined), valign: VerticalAlign.CENTER,
    })) })),
  ],
});

const STYLES = {
  default: { document: { run: { font: FONT, size: 20 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
  ],
};
const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "DS4SG · Script & Data File Reference", font: FONT, size: 16, color: MUTED })] })] });
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED })] })] });

const doc = new Document({
  creator: "DS4SG team", title: "Script & Data File Reference", styles: STYLES,
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] }] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: body },
    {
      properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
      headers: { default: header }, footers: { default: footer },
      children: [
        H1("7. Cross-reference matrix: data files x scripts"),
        P("**R** = the script reads the file; **W** = the script writes it; **R/W** = both (green = read only; orange = written). Scripts in run order: catalogue, download, parse, FX, event calendar, SBP decisions, master dataset, notebook 01 (preparation), features, quintile insights, notebook 02 (EDA). Paths are under `data/` unless they start with `reports/`.", { size: 18 }),
        matrixTable,
        P("Code dependencies (not data): notebook 01 imports `nearest_thursday()` from `build_master.py`; both notebooks import `src/utils/plot_style.py`. `.claude/hooks/log_handoff.py` reads `HANDOFF.md` and writes `logs/HANDOFF_LOG.md` and `logs/.handoff_last_hash`.", { size: 18, before: 160 }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
