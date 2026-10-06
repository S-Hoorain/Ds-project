// Builds the Milestone 2 manuscript draft (Sections I-IV): manuscript/M2_manuscript_draft.docx
//
// Usage (from the project root; needs the npm package "docx", e.g. NODE_PATH pointing at its node_modules):
//   python tools/prepare_manuscript_figures.py      # caption-free copies of the figures
//   node tools/build_manuscript_m2.js manuscript/M2_manuscript_draft.docx
// Then export to PDF from Word (File > Save As > PDF).
//
// Every number in this file comes from notebooks/01_data_preparation.ipynb, notebooks/02_eda.ipynb,
// reports/tables/*.csv or manuscript/02_data_collection_audit.md (run of 2026-10-06, verified event calendar).
// Style: plain professional paper. Black text and headings only, no header or footer, Times New Roman.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun,
  AlignmentType, BorderStyle, LevelFormat, HeadingLevel, TableLayoutType, VerticalAlign,
} = require("docx");

const OUT = process.argv[2] || "manuscript/M2_manuscript_draft.docx";
const ROOT = path.resolve(__dirname, "..");
const FIG = path.join(ROOT, "manuscript", "figures");
const FONT = "Times New Roman", MONO = "Consolas", BLACK = "000000";
const TEXT_W = 11906 - 2 * 1440;          // A4 portrait, 1-inch margins (DXA)
const BODY = 22, SMALL = 18, CAP = 19;    // half-points: 11 pt body, 9 pt tables, 9.5 pt captions

// ------------------------------------------------------------------ inline markup
// **bold**  *italic*  `code`  _{subscript}  ^{superscript}
function runs(text, o = {}) {
  const size = o.size || BODY;
  const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_\{[^}]+\}|\^\{[^}]+\})/g).filter(Boolean);
  return parts.map((p) => {
    const base = { font: FONT, size, color: BLACK, bold: o.bold, italics: o.italics };
    if (p.startsWith("**")) return new TextRun({ ...base, text: p.slice(2, -2), bold: true });
    if (p.startsWith("*")) return new TextRun({ ...base, text: p.slice(1, -1), italics: true });
    if (p.startsWith("`")) return new TextRun({ ...base, text: p.slice(1, -1), font: MONO, size: size - 3 });
    if (p.startsWith("_{")) return new TextRun({ ...base, text: p.slice(2, -1), subScript: true });
    if (p.startsWith("^{")) return new TextRun({ ...base, text: p.slice(2, -1), superScript: true });
    return new TextRun({ ...base, text: p });
  });
}
const P = (t, o = {}) => new Paragraph({
  children: runs(t, o), alignment: o.align || AlignmentType.JUSTIFIED,
  spacing: { after: o.after ?? 120, before: o.before ?? 0, line: 264 }, keepNext: o.keepNext,
  indent: o.indent,
});
const EQ = (t) => new Paragraph({ children: runs(t), alignment: AlignmentType.CENTER, spacing: { before: 60, after: 100 } });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t })], keepNext: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })], keepNext: true });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t })], keepNext: true });
const BUL = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 264 } });
const NUM = (t, ref = "findings") => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 264 } });

// ------------------------------------------------------------------ tables (three-rule, "booktabs" style)
const RULE = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: BLACK });
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
let tableNo = 0, figNo = 0;

function tcell(text, width, o) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: o.top ? RULE(o.top) : NONE, bottom: o.bottom ? RULE(o.bottom) : NONE, left: NONE, right: NONE },
    margins: { top: 30, bottom: 30, left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: runs(text, { size: SMALL, bold: o.bold }), alignment: o.align, spacing: { after: 0 }, keepNext: o.keepNext })],
  });
}
// widths in DXA; align: array of "l" | "c" | "r" per column
function table(caption, headers, rows, widths, align, note) {
  tableNo += 1;
  const al = (i) => ({ l: AlignmentType.LEFT, c: AlignmentType.CENTER, r: AlignmentType.RIGHT }[(align || [])[i] || (i ? "c" : "l")]);
  const total = widths.reduce((a, b) => a + b, 0);
  const out = [
    new Paragraph({ children: [new TextRun({ text: `Table ${tableNo}. `, bold: true, font: FONT, size: CAP }), ...runs(caption, { size: CAP })],
      keepNext: true, spacing: { before: 160, after: 80 }, alignment: AlignmentType.LEFT }),
    new Table({
      layout: TableLayoutType.FIXED, width: { size: total, type: WidthType.DXA }, columnWidths: widths,
      alignment: AlignmentType.CENTER,
      borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => tcell(h, widths[i], { top: 12, bottom: 6, bold: true, align: al(i), keepNext: true })) }),
        ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((c, i) => tcell(c, widths[i], { bottom: k === rows.length - 1 ? 12 : 0, align: al(i), keepNext: k < rows.length - 1 })) })),
      ],
    }),
  ];
  out.push(note ? new Paragraph({ children: runs(note, { size: SMALL }), spacing: { before: 60, after: 200 }, alignment: AlignmentType.JUSTIFIED })
                : new Paragraph({ children: [], spacing: { after: 120 } }));
  return out;
}

// ------------------------------------------------------------------ figures
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }
function figure(file, caption, widthIn = 6.2) {
  figNo += 1;
  const buf = fs.readFileSync(path.join(FIG, file));
  const { w, h } = pngSize(buf);
  const wpx = Math.round(widthIn * 96), hpx = Math.round(wpx * h / w);
  return [
    new Paragraph({ children: [new ImageRun({ type: "png", data: buf, transformation: { width: wpx, height: hpx },
      altText: { title: `Figure ${figNo}`, description: caption.replace(/[*`_^{}]/g, ""), name: file } })],
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: `Fig. ${figNo}. `, bold: true, font: FONT, size: CAP }), ...runs(caption, { size: CAP })],
      alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, keepLines: true }),
  ];
}

// ================================================================== CONTENT
const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));

// ---------------------------------------------------------------- title block
add(
  new Paragraph({ children: runs("An Early-Warning System for Essential-Price Shocks Across Income Quintiles in Pakistan", { size: 32, bold: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
  new Paragraph({ children: runs("Manuscript draft: Sections I–IV (Data and Preprocessing; Exploratory Data Analysis; Hypotheses)", { size: 22, italics: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new Paragraph({ children: runs("Syeda Hoorain Imran (Computer Science)  ·  Muhammad Munib Sattar (Social Development and Policy)  ·  Sarah Khalid (Social Development and Policy)", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: runs("CS/SDP 312/314: Data Science for Social Good  ·  Milestone 2  ·  6 October 2026", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 280 } }),
);

add(
  P("**Abstract.** Sudden jumps in the price of essentials are hardest to absorb for the poorest households, and in Pakistan they are frequent. We build an early-warning dataset for weekly price shocks, separately for each consumption quintile, from the Pakistan Bureau of Statistics (PBS) weekly Sensitive Price Indicator (SPI). Because PBS publishes no consolidated history, we reconstructed every week of the current (2015-16) base by scraping the PBS website and the Internet Archive: 359 weekly reports, with the 11 unpublished weeks recovered from official figures, give a complete series of 370 weeks (5 September 2019 – 1 October 2026) for five quintiles and the national index. These are merged with exchange-rate, monetary-policy and religious-calendar data into a modelling-ready dataset of 2,220 quintile-weeks. Exploratory analysis shows that weekly price changes have calm cores and heavy tails. Shock weeks (a rise of at least 1%) make up 13–17% of weeks and are driven mainly by administered utility tariffs, which account for about 61% of the weekly variance of the poorest quintile's index on 10% of its basket. The inflation burden rotates between groups: the poorest quintile faced the highest inflation in the food-driven 2020–21 period and the lowest in the energy- and currency-driven 2022–24 period. Simple lead signals are informative. A rupee depreciation of more than 2% over eight weeks raises the probability of a shock next week from 11% to 23% for the poorest quintile and from 8% to 27% for the richest. We state five formal hypotheses to be tested with predictive models in the next milestones.", { after: 120 }),
  P("**Keywords:** inflation; price shocks; early warning; income quintiles; Sensitive Price Indicator; Pakistan; social protection; SDG 1; SDG 2; SDG 10.", { after: 240 }),
);

// ---------------------------------------------------------------- I. Introduction (short)
add(
  H1("I. Introduction"),
  P("Pakistan has experienced persistent and volatile inflation in essential goods. Year-on-year inflation in the weekly SPI peaked at 48% in 2023. Low-income households spend a larger share of their budgets on essentials and have little savings to smooth sudden price jumps, so price shocks translate directly into reduced food intake and deeper poverty. The problem relates to three Sustainable Development Goals [14]: SDG 1 (No Poverty), SDG 2 (Zero Hunger) and SDG 10 (Reduced Inequalities). It also matters for policy: Pakistan's main cash-transfer programme, the Benazir Income Support Programme (BISP) [15], pays fixed quarterly instalments, so knowing *when* a shock is coming, and *for whom*, could inform the timing of top-ups."),
  P("**Research question.** Can weekly price shocks in essential items be predicted, and how do their size and predictability differ across income (consumption) quintiles?"),
  P("We approach the question as an early-warning problem. At the end of each week we ask whether the following week will be a price-shock week for each quintile, using only signals available at that time: the administered-price calendar, recent price momentum and exchange-rate movements. We then ask whether such a forecast is as accurate for the poorest households as for the richest. The exploratory analysis in Section III motivates a quintile-specific approach: the source of inflation determines which group is hit hardest, so a single national forecast would serve some groups worse than others."),
  P("**Team.** Syeda Hoorain Imran (Computer Science) leads data collection, the pipeline and modelling. Muhammad Munib Sattar and Sarah Khalid (Social Development and Policy) lead the problem framing, the interpretation of results in Pakistan's social and economic context, and the fairness and ethics analysis. All three contribute to data curation and analysis. *This draft covers the data, exploratory analysis and hypotheses; the introduction and literature review will be expanded in the final manuscript.*"),
);

// ---------------------------------------------------------------- II. Data and preprocessing
add(H1("II. Data and Preprocessing"));

add(
  H2("A. Master Dataset Overview"),
  P("The analysis uses one master dataset in long (\"tidy\") format [6]. The observational unit is **one SPI week for one consumption group**. An SPI week ends on a Thursday. The groups are the five consumption quintiles, from Q1 (poorest, monthly household expenditure up to Rs 17,732) to Q5 (richest, above Rs 44,175), plus the national Combined index. A companion item-level panel holds the national average price of each of the 51 items for every week. Table 1 summarises both."),
  table("Inventory of the master analytical dataset.", ["Property", "Master dataset", "Item panel"], [
    ["File", "`master_features.csv` (built on `master_model_ready.csv`)", "`items_weekly_panel.csv`"],
    ["Observational unit", "1 row = 1 SPI week (ending Thursday) × 1 consumption group", "1 row = 1 SPI week × 1 of 51 items"],
    ["Rows", "2,220 (370 weeks × 6 groups)", "18,870 (370 weeks × 51 items)"],
    ["Columns", "105 (70 prepared variables + 35 early-warning features)", "18"],
    ["Period", "5 Sep 2019 – 1 Oct 2026 (370 consecutive weeks, none missing)", "same"],
    ["Groups / items", "Q1–Q5 and Combined", "51 essential items in 4 categories"],
    ["Sources", "PBS weekly SPI reports (PBS website and Wayback Machine); Yahoo Finance PKR/USD; SBP Monetary Policy Statements; Ramadan/Eid calendar; fuel revisions derived from SPI items", "PBS weekly SPI reports"],
    ["Targets", "`target_shock_next` (classification); `target_spi_wow_pct_next`, `target_spi_chg_next4w/8w/13w` (regression)", "—"],
  ], [1900, 4300, 2826], ["l", "l", "l"]),
);

add(
  H2("B. Data Sources"),
  P("**Primary source: the weekly SPI.** The PBS publishes the SPI every week [1]. It tracks 51 essential items (food, energy, clothing and household goods) priced in 50 markets across 17 cities. On the current base (2015-16 = 100), PBS reports a separate index for each consumption quintile and for the Combined group. Each weekly report contains (i) a *quintile table* with index levels for the current week, the previous week and the same week a year earlier, and (ii) an *item table* with the national average price of each item for the same three weeks, its percentage changes, two fixed expenditure weights (lowest quintile and combined) and its *impact*, the percentage-point contribution of the item to that week's index change."),
  P("**Supporting sources.** Table 2 lists the auxiliary data. The 51 items were grouped into four categories. Shares of the fixed 2015-16 weights are: food (32 items) 68.95% of the lowest quintile's basket vs 62.34% of the combined basket; energy (6 items) 17.60% vs 25.42%; clothing and footwear (7) 9.19% vs 8.80%; household and other (6) 4.25% vs 3.44%. The poorest quintile's basket is therefore more food-heavy but *less* energy-heavy than the national basket, mainly because petrol carries little weight for Q1."),
  table("Data sources and how each was collected.", ["Data", "Source", "Collection", "Notes and limitations"], [
    ["Weekly SPI: quintile and item tables", "PBS website (Jul 2023 onward) and old PBS website via the Wayback Machine (2019–2025) [1], [2]", "`spi_catalogue.py`, `spi_download.py`, `parse_spi.py`", "Urban only (17 cities); fixed 2015-16 weights"],
    ["PKR/USD exchange rate, daily", "Yahoo Finance `PKR=X` [4]", "`fx_rates.py`", "Market quote, not the official SBP rate; 2 bad-tick episodes removed"],
    ["SBP policy-rate decisions", "SBP Monetary Policy Statements (archived) and press releases [3]", "`sbp_mps.py`; 6 entries hand-coded with evidence", "66 decisions since 2018 (32 hold, 21 hike, 13 cut)"],
    ["Ramadan and Eid dates", "Umm al-Qura calendar [5] with Pakistan-specific dates", "`build_event_calendar.py`", "Pakistani dates verified by the team for May 2018 – Mar 2026"],
    ["Fuel-price revisions", "Derived from the SPI items petrol (super) and hi-speed diesel", "cleaning step (decision D5)", "Weekly resolution; OGRA notifications are a planned extension"],
  ], [1750, 2500, 2150, 2626], ["l", "l", "l", "l"]),
);

add(
  H2("C. Data Collection Audit"),
  P("**Why scraping was necessary.** PBS publishes no consolidated historical file: each week is a separate report, and the publication format changed several times. From September 2019 to mid-2025 reports were PDF files on the old PBS website, which has since been taken down and survives only in the Internet Archive's Wayback Machine. The current PBS website lists reports from July 2023 onward, as PDF files and, from October 2025, also as Excel files."),
  P("**Pipeline.** Collection runs in three steps (scripts in `src/scraping/`):"),
  NUM("*Catalogue.* The current price-statistics page embeds its full download table as a JavaScript array, which is parsed directly. The Wayback Machine's CDX index API [2] is queried for every archived file under the old site's SPI folders. Week dates come from the catalogue or from file names, which use at least six date formats and contain typos (e.g. `spi_report_0204202` for 2 April 2020); the parser handles both. Result: 2,204 catalogued files.", "steps"),
  NUM("*Download.* One summary report is chosen per week, by priority: current-site Excel, current-site PDF, archived \"new base\" folder, archived general folder. The downloader is *polite* (1 s between requests to PBS and 4 s to the archive, with exponential back-off, stopping after three consecutive failures), *resumable* (weeks already downloaded are skipped) and *validated* (each file's signature is checked, and every PDF must contain the text \"2015-16=100\"; files on the old 2007-08 base are rejected).", "steps"),
  NUM("*Audit trail.* Every attempt is logged in a manifest with the source URL, archive timestamp, file size, SHA-256 checksum, base-year check and download time.", "steps"),
  P("**Coverage.** Between 5 September 2019, the first week published on the 2015-16 base, and 1 October 2026 there are 370 Thursdays. A report was found and validated for 359 of them (97%): 222 from the Wayback Machine and 137 from the current website (86 PDF, 51 Excel). Fifteen current-site links were dead (HTTP 404); for 5 of them the archived copy was used, and the other 10 were mis-dated duplicates of weeks already obtained. The remaining 11 weeks have no report of their own, often because PBS did not publish in Eid weeks; Section II-F explains how they were recovered.", { before: 80 }),
  P("**Scope change from the proposal.** The Milestone 1 proposal assumed 2015-16-base weekly data from 2016 (about 540 weeks). In fact, PBS began publishing the 2015-16-base weekly SPI only in September 2019. Earlier weekly data use the 2007-08 base, with 53 items and different quintile cut-offs, and are not comparable without splicing, which is outside our scope. The sample is therefore 370 weeks."),
);

add(
  H2("D. Parsing and Validation"),
  P("Excel reports are read cell by cell. PDF reports need two techniques, because the two tables are stored differently. In the quintile table, labels and number columns are separate text blocks that are sometimes vertically misaligned, so numbers are collected by position, grouped into columns by their right edge, and read top to bottom as Q1–Q5 and Combined. In the item table each row is one text run, so words are read in the PDF's internal order, which keeps long item names intact. Raw item names are mapped to 51 canonical items by exact normalised match, then by fuzzy match with the score recorded. Only one PBS typo (\"Gad Charges for Q1\") needed the fuzzy match (score 0.93). Two items were renamed by PBS (\"Electricity Charges upto 50 Units\" became \"Electricity Charges for Q1\", and similarly for gas); both series are flagged for level-break checks."),
  P("Every parsed file was checked for the 2015-16 base, a complete six-row quintile table and 51 uniquely matched items. **All 359 files passed**, giving 18,309 item-week rows with no duplicates. As a further check, the item impacts in each report should add up to the reported weekly change of the index. They do: the median absolute difference is 0.002 percentage points (pp) and the maximum 0.011 pp, i.e. rounding. One formatting error was found: in the first new-base report (5 September 2019) PBS printed the lowest-quintile impact column twice, so the Combined impacts for that week were set to missing."),
);

add(
  H2("E. Data Alignment and Structural Organisation"),
  P("The reports arrive in a presentation layout: groups as rows and weeks as columns in the quintile table, and items sorted by \"increased / decreased / unchanged\" in the item table. The parser stores both in long format. The following alignment, reshaping and merging steps produce the master dataset:"),
  BUL("**Week alignment (D1).** A few reports were released on a Wednesday or Saturday because of holidays. Every report is aligned to the nearest Thursday, the usual SPI week-ending day (14 reports realigned), giving a regular weekly grid on which lags are well defined."),
  BUL("**Pivot and melt.** The quintile data move losslessly between the long layout used for modelling and a wide week × group layout used for comparisons; a pivot followed by a melt reproduces all 2,220 rows exactly."),
  BUL("**Item panel on a complete grid.** Items are placed on a complete week × item grid of 370 × 51 = 18,870 rows, so the 11 weeks without a report become explicit rows. Their prices (561 values) are filled from the next report's \"previous week\" column, an official PBS figure. The fixed basket weights are verified to be constant over time for every item."),
  BUL("**Category contributions (aggregate, pivot, join).** Item impacts are summed by category and week, pivoted to one column per category (food, energy, clothing and footwear, household; for Q1 and Combined), and joined onto every group's row for that week. The join leaves the row count unchanged (2,220)."),
  BUL("**Merging auxiliary data.** Daily PKR/USD is averaged over each SPI week (Friday–Thursday) after dropping two one-day bad ticks (D4). The SBP policy rate in force at the end of each week is attached as of that date, with the decision type in the week. Calendar variables (Ramadan and Eid days in the week, weeks to the next Ramadan) come from the verified event calendar. Fuel-revision weeks are flagged where petrol or diesel moved by more than 1% (D5): 127 of 369 weeks."),
);

add(
  H2("F. Missing Data"),
  P("Before treatment, 25 of 44 columns in the merged dataset had missing values, all at low rates (at most 3.24%). Every missing value falls into one of three types, each with its own strategy (Table 3)."),
  table("Missing values by type and the strategy used. Counts are out of 2,220 rows.", ["Type", "Columns (examples)", "Missing", "Cause", "Strategy"], [
    ["A. Structural", "lags, weekly changes, next-week target", "6–30 (0.3–1.4%)", "first week has no previous week; last week has no next week", "keep as missing; listwise deletion of these rows when fitting models"],
    ["B. Weeks without a report", "year-ago SPI, fuel % changes, reported % columns", "66 (2.97%)", "11 weeks × 6 groups not published (mostly Eid weeks)", "recover from other official figures; no statistical imputation"],
    ["C. Contributions", "`contrib_*` (category impacts)", "66–72 (2.97–3.24%)", "impacts exist only in a week's own report", "keep as missing; analyses using them drop these weeks"],
  ], [1450, 1950, 1250, 2200, 2176], ["l", "l", "c", "l", "l"]),
  P("**Why no mean or median imputation.** A weekly price index is a time series. Replacing a missing week with the sample mean would invent a price jump and its reversal, which is exactly the kind of event we want to forecast. Where an official value exists elsewhere, it is used instead:"),
  BUL("**The index itself (D2).** Every report states the previous week's index, so each unpublished week's SPI is taken from the following report. All 11 weeks were recovered: the SPI and the main target have **no missing weeks** (370/370)."),
  BUL("**Year-ago SPI.** Where not reported, it is taken from the group's own value 52 weeks earlier. Where both exist (1,842 pairs), the two agree to within 0.5 index points in 99.7% of cases (median difference 0.000)."),
  BUL("**Fuel prices.** Petrol and diesel changes are recomputed from the completed item panel, reducing their missing values from 66 to 6 (type A only)."),
  P("**Revisions (D3).** In 13 cases a report's \"previous week\" value differs from what was first published, so PBS had revised the index; the latest published value is used and flagged. The largest is a 2.04-point revision of Q1 on 20 November 2025, traced to a correction of the Q1 electricity tariff."),
  P("**Selection bias.** Missing weeks are not random. Weeks within the Eid holiday window make up 8.9% of all weeks but 63.6% (7 of 11) of the weeks without a report. Simply dropping unpublished weeks would therefore under-represent the calendar events we study and bias any estimated Eid effect. Because the index was recovered from PBS's own figures, the target and the SPI-based predictors keep every week, Eid weeks included. Bias can enter only analyses that use category contributions (type C); those analyses state this, and will be repeated without Eid windows as a robustness check. After treatment, the only remaining gaps are of types A and C."),
);

add(
  H2("G. Transformations and Encoding"),
  H3("1) Log transformation"),
  P("Table 4 reports skewness and excess kurtosis. A log transform suits positive, right-skewed variables and variables that grow multiplicatively. **Item prices** are the textbook case: cheap items (a matchbox) sit next to expensive ones (an LPG cylinder), giving a strong right skew (2.66). The log reduces the skewness to −0.97 and the excess kurtosis from 7.92 to 1.85 (Fig. 1, top). **The SPI and the exchange rate** are not skewed as distributions, because they are trending series, but they grow multiplicatively. On the log scale, equal percentage changes become equal steps and differences of logs approximate percentage changes (Fig. 1, bottom). We therefore use `log_spi` and `log_fx`. **Weekly percentage changes** cannot be logged (they can be negative). They are only moderately skewed but have very heavy tails (excess kurtosis above 30), which Section III-B examines."),
  table("Shape of the main continuous variables before and after transformation.", ["Variable", "Skewness", "Excess kurtosis", "Treatment"], [
    ["Item price, all items (PKR)", "2.66", "7.92", "log"],
    ["log item price", "−0.97", "1.85", "used in item-level analysis"],
    ["SPI level (index)", "−0.03", "−1.64", "log (multiplicative growth)"],
    ["log SPI", "−0.23", "−1.59", "used; then scaled"],
    ["PKR/USD weekly average", "−0.28", "−1.76", "log (multiplicative growth)"],
    ["SBP policy rate (%)", "0.52", "−0.95", "none; scaled"],
    ["Weekly SPI change (%)", "1.29", "31.09", "kept; outliers examined (III-B)"],
    ["Year-on-year SPI change (%)", "0.64", "−0.34", "none"],
    ["Weekly PKR/USD change (%)", "3.58", "33.90", "kept; outliers examined"],
  ], [3200, 1300, 1600, 2926], ["l", "r", "r", "l"]),
  ...figure("figP1_log_transform.png", "Why prices and the SPI are log-transformed. Top: distribution of item prices (51 items × 370 weeks) in PKR per unit on the raw scale (left) and the log scale (right); the log compresses a range from Rs 1.79 to over Rs 5,000 and reduces the skewness from 2.66 to −0.97. The remaining left tail consists of very cheap per-unit items (telephone call charge, electricity tariff per unit, matchbox). Bottom: the Combined SPI (index, 2015-16 = 100) on the raw and log scales; on the log scale the 2022–23 surge and the later slowdown are directly comparable. Source: PBS weekly SPI reports, September 2019 – October 2026."),
  H3("2) Scaling"),
  P("Predictors are on very different scales: the policy rate runs from 7% to 22%, weekly changes are around ±3%, and log PKR/USD runs from about 5.0 to 5.7. Distance-based models such as k-nearest neighbours, and regularised regressions, need comparable scales. Ten continuous predictors are provided in two versions: Min-Max normalised, *x′* = (*x* − min) / (max − min), which maps the training range to [0, 1] (suffix `_mm`), and Z-score standardised, *z* = (*x* − *x̄*) / *s*, with mean 0 and standard deviation 1 (suffix `_z`)."),
  P("**Leakage rule.** The minimum, maximum, mean and standard deviation are computed on the **training period only** (weeks up to 31 December 2024: 278 weeks, 1,668 rows) and applied unchanged to the 92 held-out weeks (552 rows). Otherwise the scaling would reveal future price levels to the model. Held-out values can therefore fall outside [0, 1]; for example, the scaled log SPI reaches 1.107 in 2026 because prices are now higher than at any point in the training period."),
  H3("3) Categorical encoding"),
  P("Nominal categories are converted into Boolean (0/1) dummy indicators. The consumption group becomes `grp_Q1` … `grp_Q5` and `grp_Combined`; in regressions `grp_Combined` is the reference category, which avoids perfect collinearity with the intercept (the dummy-variable trap). The monetary-policy action in each week becomes `mpc_hike` (12 weeks), `mpc_cut` (13) and `mpc_hold` (31), with weeks without a Monetary Policy Committee meeting (314) as the reference. Yes/no flags (fuel-revision week, recovered week, revised value) are stored as 0/1 integers."),
);

add(
  H2("H. Early-Warning Features"),
  P("The forecasting question is: standing at the end of week *t*, will week *t*+1 be a price-shock week for group *g*? Every feature therefore uses only information available at the end of week *t*, or calendar facts known in advance. The script `build_features.py` adds 35 columns to the prepared dataset."),
  BUL("**Target (F1).** A *shock week* is a week in which a group's SPI rises by **at least 1%**. This threshold marks 13.2–16.5% of weeks as shocks, depending on the group: rare enough to be a shock, frequent enough to model. `target_shock_next` = 1 if next week is a shock week for the same group. Continuous targets give the cumulative SPI change over the next 4, 8 and 13 weeks."),
  BUL("**Administered-price calendar (F2).** Fuel prices are reviewed fortnightly, effective on the 1st and 16th of each month: 64% of SPI weeks containing those dates had a fuel revision, compared with 9% of other weeks. `fuel_review_next_week` flags them. `fy_start_next_week` flags the week containing 1 July, when the federal budget, new taxes and levies take effect."),
  BUL("**Religious calendar.** `ramadan_next_week` and `pre_eid_adha_4w` (Eid ul-Adha within four weeks), built from the verified Pakistani dates."),
  BUL("**Exchange rate.** Log change in weekly average PKR/USD over the past 4, 8 and 13 weeks (`fx_chg_4w/8w/13w`)."),
  BUL("**Component inflation (F4).** Weighted average weekly price change of six components (utility tariffs, motor fuel, market energy, perishables, staple food, non-food), this week and summed over the past four weeks."),
  BUL("**Momentum (F3).** Items whose price spikes tend to be followed by further rises, selected **using training weeks only**: bananas, chilli powder, onions, potatoes, gram and moong pulses, and packaged tea. `momentum_spikes_4w` counts their spikes above 5% in the past four weeks."),
  BUL("**Own history.** Number of shock weeks in the past four weeks, and the group's SPI change over the past 4 and 13 weeks."),
);

add(
  H2("I. Summary of Preprocessing Decisions"),
  P("Table 5 collects every preparation decision with its rationale and effect; each is implemented in code and reported with counts in the preparation notebook."),
  table("Preprocessing decisions, their rationale and effect.", ["#", "Decision", "Rationale", "Effect"], [
    ["D1", "Align report dates to the nearest Thursday", "regular weekly grid needed for lags", "14 reports realigned"],
    ["D2", "Fill unpublished weeks from the next report's previous-week value", "official PBS figure, not imputation", "11 weeks recovered; 0 missing SPI"],
    ["D3", "Use revised values when PBS revises a week", "latest vintage is the best estimate", "13 values revised, flagged"],
    ["D4", "Drop FX bad ticks before weekly averaging", "one-day spikes that fully reverse", "2 days dropped"],
    ["D5", "Fuel-revision week: petrol or diesel moved > 1%", "administered prices change in discrete steps", "127 of 369 weeks"],
    ["P1", "Complete week × item grid, filled by the D2 rule", "explicit missing weeks", "18,870 rows, 0 missing prices"],
    ["P2", "Set Combined impacts of 5 Sep 2019 to missing", "PBS printed the Q1 column twice", "1 week"],
    ["P3", "Year-ago SPI from the 52-week lag where not reported", "agrees with reported value (99.7%)", "66 rows filled"],
    ["P4", "No mean/median imputation; listwise deletion of structural gaps", "imputing a time series invents jumps", "≤ 1.4% of rows per variable"],
    ["P5", "Log of SPI, FX and item prices", "multiplicative growth; right skew", "Table 4, Fig. 1"],
    ["P6", "Min-Max and Z-score using training-period statistics", "prevents look-ahead leakage", "10 predictors × 2 versions"],
    ["P7", "Dummy-encode group and MPC action", "nominal categories", "references: Combined; no meeting"],
    ["F1", "Shock = weekly SPI rise ≥ 1%", "interpretable, 13–17% of weeks", "`target_shock_next`"],
    ["F3", "Momentum items chosen on training weeks only", "no peeking at the test period", "7 items"],
    ["—", "Keep all outliers", "they are genuine shocks (III-B)", "resistant statistics, HAC errors"],
  ], [500, 3300, 2900, 2326], ["c", "l", "l", "l"]),
);

add(
  H2("J. Limitations of the Data"),
  P("The SPI covers 17 cities only, so rural price movements are not captured, although rural households are poorer on average. The expenditure weights date from the 2015-16 household survey and may no longer reflect consumption, particularly after the large relative price changes of 2022–24. PBS publishes item impacts only for the lowest quintile and the Combined index, so the composition of inflation for Q2–Q5 must be inferred (Section III-C). The exchange rate is a market quote rather than the official State Bank of Pakistan (SBP) rate. Pakistani religious dates follow local moon sighting; they were verified by the team up to Eid ul-Fitr 2026, and later dates use the Umm al-Qura calendar. Finally, the 2015-16 base limits the sample to seven years, which contain only a few events of some types (e.g. seven fiscal-year starts)."),
);

// ---------------------------------------------------------------- III. EDA
add(H1("III. Exploratory Data Analysis"));

add(
  H2("A. Univariate Summary Statistics"),
  P("Table 6 summarises the weekly SPI change, the basis of the forecasting target, for each group. Each statistic is paired with its resistant counterpart [7]. The mean and standard deviation (SD) are non-resistant: a few extreme weeks pull them. The median and interquartile range (IQR) are resistant. For a normal distribution IQR / 1.349 equals the SD, so we report this \"robust SD\" to compare spread directly."),
  table("Weekly SPI change (%) by consumption group, 369 weeks each.", ["Group", "Mean", "Median", "SD", "IQR", "Robust SD", "SD / robust SD", "Skew.", "Ex. kurt.", "Min", "Max"], [
    ["Q1 (poorest)", "0.284", "0.176", "1.078", "0.995", "0.738", "1.46", "0.18", "18.1", "−8.45", "6.65"],
    ["Q2", "0.299", "0.176", "1.282", "0.998", "0.740", "1.73", "−0.24", "34.0", "−11.91", "10.34"],
    ["Q3", "0.307", "0.182", "1.151", "0.888", "0.658", "1.75", "2.97", "44.9", "−8.02", "12.80"],
    ["Q4", "0.301", "0.184", "1.024", "0.846", "0.627", "1.63", "2.56", "30.8", "−6.07", "10.50"],
    ["Q5 (richest)", "0.296", "0.168", "0.962", "0.785", "0.582", "1.65", "1.98", "13.8", "−4.08", "8.07"],
    ["Combined", "0.302", "0.178", "1.093", "0.852", "0.631", "1.73", "1.29", "26.2", "−8.11", "9.95"],
  ], [1290, 720, 760, 720, 720, 860, 960, 700, 800, 760, 736], ["l", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r"]),
  P("Three features stand out. First, the *typical* week is calmer than the *average* week: the median change (0.17–0.18%) is well below the mean (0.28–0.31%) in every group, because a few large jumps pull the mean up. Second, the tails are heavy: the SD is 1.5–1.75 times the robust SD and the excess kurtosis ranges from 14 to 45. Most weeks move a little, and a handful move a lot; that handful is the shock weeks we want to forecast. Third, Q5 is the calmest group by every measure of spread, yet its SD / robust SD ratio is high: a narrow core with rare large jumps."),
  table("Week-level predictors, 2019–2026 (n = 362–370 weeks).", ["Predictor", "Mean", "Median", "SD", "IQR", "Skew.", "Min", "Max"], [
    ["SPI year-on-year inflation, Combined (%)", "17.58", "15.23", "12.66", "18.60", "0.65", "−3.52", "48.35"],
    ["PKR/USD weekly change (%)", "0.16", "0.01", "1.31", "0.47", "3.59", "−5.45", "13.52"],
    ["PKR/USD change over 8 weeks (%)", "1.25", "0.05", "4.02", "2.65", "2.06", "−9.00", "21.13"],
    ["SBP policy rate (%)", "13.26", "12.00", "5.08", "7.00", "0.52", "7.00", "22.00"],
    ["Staple food, weekly price change (%)", "0.26", "0.17", "0.49", "0.43", "2.60", "−1.65", "3.88"],
    ["Perishable food, weekly price change (%)", "0.60", "0.35", "4.03", "5.33", "0.20", "−9.09", "14.57"],
    ["Utility tariffs, weekly change (%)", "0.72", "0.00", "7.61", "0.00", "5.45", "−51.91", "79.05"],
    ["Petrol and diesel, weekly change (%)", "0.41", "0.00", "3.81", "0.00", "2.61", "−19.75", "33.88"],
    ["Momentum-item spikes, past 4 weeks (count)", "1.97", "2.00", "1.54", "2.00", "0.96", "0", "8"],
  ], [3600, 700, 760, 700, 700, 680, 900, 986], ["l", "r", "r", "r", "r", "r", "r", "r"]),
  P("Among the predictors (Table 7), utility tariffs and motor fuel show the signature of administered prices: their median and IQR are zero because they do not move in most weeks, and they jump by large amounts when a decision is announced (skewness 5.45 and 2.61). Staple food, in contrast, moves a little in almost every week: a slow \"grind\". The exchange rate is similarly calm in most weeks with occasional large depreciations."),
);

add(
  H2("B. Outlier Diagnostics"),
  P("We apply both rules from the course, each in a *mild* and a *regular* version: the quartile rule (beyond Q1 − 1.5·IQR or Q3 + 1.5·IQR for mild outliers, 3·IQR for regular outliers), which uses resistant fences, and the Z-score rule (|*z*| > 2 for mild, |*z*| > 3 for regular outliers), which uses the non-resistant mean and SD. To expose *masking*, the Z-score rule is recomputed with the SD estimated after removing the regular quartile-rule outliers (Table 8)."),
  table("Outliers in the weekly SPI change by rule (number of weeks out of 369).", ["Group", "Quartile, mild (1.5 IQR)", "Quartile, regular (3 IQR)", "Z, mild (|z| > 2)", "Z, regular (|z| > 3)", "SD, all weeks", "SD, without regular outliers", "|z| > 3 after unmasking"], [
    ["Q1", "17", "6", "13", "6", "1.078", "0.788", "10"],
    ["Q2", "17", "6", "10", "6", "1.282", "0.831", "12"],
    ["Q3", "18", "6", "10", "4", "1.151", "0.753", "11"],
    ["Q4", "19", "5", "13", "5", "1.024", "0.752", "11"],
    ["Q5", "23", "11", "20", "6", "0.962", "0.701", "19"],
    ["Combined", "20", "9", "15", "7", "1.093", "0.731", "14"],
  ], [1100, 1150, 1150, 1050, 1100, 1000, 1300, 1176], ["l", "c", "c", "c", "c", "c", "c", "c"]),
  P("The two rules disagree, and the quartile rule flags more weeks (e.g. 17 mild outliers for Q1 against 13 by |*z*| > 2), because the extreme weeks cannot widen resistant fences. **Masking is substantial**: excluding the extreme weeks lowers the SD by 25–35%, and the number of |*z*| > 3 weeks rises from 6 to 10 for Q1 and from 6 to 19 for Q5. The extremes inflate the variance and so hide one another. Q5 is most affected because it has the narrowest core. The resistant quartile rule is therefore preferred for these data."),
  P("**Are the outliers errors?** No. Table 9 lists the largest weekly moves of the Combined index with the component and item that drove each, from PBS's item impacts. Every one coincides with an administered-price decision (a gas or electricity tariff change, or a fuel-price revision) or a broad staple-food move. None is a data error."),
  table("The ten largest weekly moves of the Combined SPI and their main driver.", ["Week ending", "Combined (%)", "Q1 (%)", "Q5 (%)", "Main component", "Largest item change"], [
    ["16 Nov 2023", "9.95", "6.63", "8.07", "utility tariffs", "gas, Q1 tariff (+480%)"],
    ["22 Sep 2022", "−8.11", "−8.45", "−4.08", "utility tariffs", "electricity, Q1 tariff (−64%)"],
    ["27 Oct 2022", "4.13", "4.64", "0.88", "utility tariffs", "electricity, Q1 tariff (+89%)"],
    ["24 Jul 2025", "4.07", "3.98", "3.03", "utility tariffs", "gas, Q1 tariff (+30%)"],
    ["27 Jul 2023", "3.73", "2.49", "3.87", "utility tariffs", "electricity, Q1 tariff (+21%)"],
    ["28 Jul 2022", "3.68", "3.27", "3.54", "utility tariffs", "electricity, Q1 tariff (+26%)"],
    ["30 Jun 2022", "3.63", "3.79", "3.00", "utility tariffs", "electricity, Q1 tariff (+28%)"],
    ["16 Jun 2022", "3.38", "2.85", "3.10", "motor fuel", "petrol (+11%)"],
    ["18 Aug 2022", "3.35", "1.80", "3.94", "utility tariffs", "electricity, Q1 tariff (+7%)"],
    ["16 Feb 2023", "2.89", "2.45", "2.94", "staple food", "petrol (+9%)"],
  ], [1350, 1200, 900, 900, 1900, 2776], ["l", "r", "r", "r", "l", "l"]),
  P("**Decision: keep all outliers.** They are genuine shocks and the events the early-warning model must learn; removing or capping them would delete the signal. Instead, summaries report resistant statistics alongside classical ones, inference uses heteroskedasticity- and autocorrelation-consistent (HAC, Newey–West [8]) standard errors and non-parametric tests, and the binary target is itself robust to the size of a shock. Fig. 2 shows the distributions."),
  ...figure("figE3_weekly_change_distribution.png", "Weekly price changes by consumption group: calm cores, heavy tails. Week-on-week change in the SPI (%), September 2019 – October 2026, 369 weeks per group. Boxes span the IQR with the median line; whiskers reach 1.5 × IQR (the mild-outlier fence); circles are mild outliers. The axis is cut at −3% and +4%, with the number of weeks beyond printed at the edges. The dashed line marks the +1% shock threshold used as the forecasting target. Source: PBS weekly SPI reports."),
);

add(
  H2("C. The Rotating Burden: Who Faces More Inflation, and When?"),
  P("Table 10 compares cumulative inflation and the share of shock weeks by quintile over three periods. Contrary to the Milestone 1 expectation that the poorest quintile faces the highest inflation, Q1's cumulative inflation over the full sample (179%) was the *lowest* of all groups, below Q5's (193%). The ranking, however, depends on the period. In 2019–21, when food prices drove inflation, Q1 faced the most inflation (38.8% against 33.9% for Q5). In 2022–23, when electricity and gas tariffs, fuel prices and the rupee drove inflation, Q1 faced the least (74.0% against 83.1% for Q5 and 91.5% for Q3). Fig. 3 shows this rotation week by week: the Q1−Q5 gap in year-on-year inflation was positive from March 2020 to November 2021 and negative from February 2022 to December 2024. Shock weeks were most frequent in 2022–23, when about a quarter of weeks were shocks in every group."),
  table("Cumulative inflation and share of shock weeks by period and consumption group (%).", ["Period", "Q1", "Q2", "Q3", "Q4", "Q5", "Combined"], [
    ["*Cumulative SPI inflation (%)*", "", "", "", "", "", ""],
    ["2019–21", "38.8", "36.8", "34.4", "33.5", "33.9", "35.1"],
    ["2022–23", "74.0", "80.8", "91.5", "89.5", "83.1", "85.1"],
    ["2024–26", "15.0", "17.2", "16.7", "16.7", "18.2", "18.1"],
    ["Full sample", "179.1", "191.9", "202.3", "197.7", "192.8", "197.9"],
    ["*Share of shock weeks (%)*", "", "", "", "", "", ""],
    ["2019–21", "9.0", "13.1", "11.5", "13.1", "10.7", "12.3"],
    ["2022–23", "26.9", "28.8", "25.0", "27.9", "24.0", "25.0"],
    ["2024–26", "9.0", "10.4", "9.0", "9.7", "7.6", "9.7"],
    ["Full sample", "14.1", "16.5", "14.3", "15.9", "13.2", "14.9"],
  ], [2826, 1000, 1000, 1000, 1000, 1000, 1200], ["l", "r", "r", "r", "r", "r", "r"]),
  ...figure("figE1_rotating_burden.png", "The burden rotates: the poorest and richest quintiles swap places as the source of inflation changes. Top: year-on-year SPI inflation (%) for the poorest quintile (Q1), the richest (Q5) and the national index (Combined). Bottom: the gap between Q1 and Q5 (percentage points); orange bars mean the poorest faced higher inflation. Shaded spans mark the two longest regimes (Q1 higher, March 2020 – November 2021; Q5 higher, February 2022 – December 2024). Source: PBS weekly SPI reports (base 2015-16)."),
  P("**What drives the rotation?** PBS does not publish the composition of the Q2–Q5 baskets, so we estimate each group's *exposure* to six price components: each group's weekly SPI change is regressed on the weekly price change of each component (OLS with HAC errors). A coefficient of 10 means that 10% of a 1% rise in the component's prices appears in that group's index (Table 11). The components explain 76–82% of weekly movement in every group, and the exposures follow income: exposure to motor fuel rises steadily from 2.7 (Q1) to 10.7 (Q5), and LPG and firewood from 2.4 to 6.4, while exposure to staple food is 41–48 for Q1–Q4 but only 33 for Q5. Exposure to utility tariffs peaks in the middle quintiles (13.2 for Q2). These differences are why a single national model would misjudge shocks for some quintiles."),
  table("Estimated exposure of each group's SPI to six price components (OLS coefficients × 100, HAC errors).", ["Group", "Utility tariffs", "Motor fuel", "LPG & firewood", "Perishables", "Staple food", "Non-food", "R²"], [
    ["Q1", "10.20", "2.66", "2.43", "12.40", "45.07", "11.14", "0.80"],
    ["Q2", "13.21", "4.23", "2.82", "12.25", "40.96", "8.54", "0.81"],
    ["Q3", "11.31", "4.99", "3.20", "11.24", "47.66", "5.95", "0.79"],
    ["Q4", "9.02", "6.69", "3.57", "11.15", "46.05", "8.22", "0.78"],
    ["Q5", "6.92", "10.73", "6.36", "9.52", "33.25", "16.48", "0.76"],
    ["Combined", "10.36", "8.41", "4.97", "10.46", "34.95", "11.01", "0.82"],
  ], [1300, 1200, 1100, 1250, 1150, 1150, 1100, 776], ["l", "r", "r", "r", "r", "r", "r", "r"]),
);

add(
  H2("D. Shocks Versus the Grind"),
  P("PBS's item impacts show how each component contributes to the *level* of inflation and to its *week-to-week variability*, measured as each component's share of the variance of weekly SPI changes (the covariances of the components with the total sum to 100%). Fig. 4 shows a sharp contrast. For the poorest quintile, staple food is 57% of the basket and accounts for about half of its cumulative inflation (53 of the 103 percentage points of summed weekly changes), but explains only about 8% of the weekly variance: it is a steady grind. Utility tariffs are 10% of the basket yet explain about 61% of weekly variance, and perishables (12% of the basket) explain 28%. The pattern is similar for the Combined index (utility tariffs 65%). For early warning this means that the shocks are concentrated in a few administered prices and volatile perishables, while most of the cost-of-living burden accumulates slowly through staple food."),
  ...figure("figE2_shocks_vs_grind.png", "Shocks versus the grind. Each price component's share of the 2015-16 basket (%) and its share of the variance of weekly SPI changes (%), for the poorest quintile (left) and the national Combined index (right), computed from PBS item impacts. Utility tariffs (electricity, gas) are about 10% of the poorest quintile's basket but cause about 61% of its week-to-week variability; staple food is 57% of the basket but causes about 8%. PBS publishes impacts only for the lowest quintile and Combined. Source: PBS weekly SPI reports, September 2019 – October 2026."),
);

add(
  H2("E. Early-Warning Signals"),
  P("Contingency tables cross each candidate signal, known at the end of week *t*, with whether week *t*+1 is a shock week. Independence is tested with Fisher's exact test [9], which is valid for small cells such as the seven fiscal-year-start weeks. Continuous signals are made binary with pre-stated cut-offs: a rupee depreciation of more than 2% over eight weeks, at least one shock in the past four weeks, and at least two momentum-item spikes in the past four weeks. Table 12 and Fig. 5 report the results for Q1 and Q5. The base rates of shock weeks are 14.1% (Q1) and 13.2% (Q5)."),
  table("Probability that next week is a shock week, with and without each signal (Q1 and Q5).", ["Signal at week t", "Group", "Weeks with signal", "P(shock | signal) %", "P(shock | no signal) %", "Difference (pp) [95% CI]", "Fisher p"], [
    ["Rupee fell > 2% in past 8 weeks", "Q1", "100", "23.0", "10.8", "+12.2 [3.2, 21.3]", "0.004"],
    ["", "Q5", "100", "27.0", "8.2", "+18.8 [9.5, 28.1]", "< 0.001"],
    ["Shock in past 4 weeks", "Q1", "146", "21.2", "9.4", "+11.8 [4.2, 19.5]", "0.002"],
    ["", "Q5", "133", "21.8", "8.5", "+13.3 [5.5, 21.2]", "< 0.001"],
    ["Momentum-item spikes (≥ 2 in 4 weeks)", "Q1", "214", "16.4", "11.0", "+5.4 [−1.6, 12.4]", "0.17"],
    ["", "Q5", "214", "16.4", "9.0", "+7.3 [0.6, 14.0]", "0.04"],
    ["Fiscal year starts next week", "Q1", "7", "42.9", "13.5", "+29.3 [−7.5, 66.2]", "0.06"],
    ["", "Q5", "7", "42.9", "12.7", "+30.2 [−6.7, 67.0]", "0.05"],
    ["Fuel-price review next week", "Q1", "170", "14.7", "13.6", "+1.1 [−6.0, 8.3]", "0.77"],
    ["", "Q5", "170", "16.5", "10.6", "+5.9 [−1.1, 12.9]", "0.12"],
    ["Eid ul-Adha within 4 weeks", "Q1", "28", "14.3", "14.1", "+0.2 [−13.3, 13.7]", "1.00"],
    ["", "Q5", "28", "10.7", "13.5", "−2.8 [−14.8, 9.2]", "1.00"],
    ["Ramadan next week", "Q1", "37", "8.1", "14.8", "−6.7 [−16.2, 2.9]", "0.33"],
    ["", "Q5", "37", "13.5", "13.3", "+0.3 [−11.3, 11.9]", "1.00"],
  ], [2350, 800, 950, 1100, 1150, 1650, 1026], ["l", "c", "r", "r", "r", "c", "r"]),
  P("Two signals stand out. **Rupee depreciation** of more than 2% over eight weeks roughly doubles the chance of a shock next week for Q1 (23.0% against 10.8%) and more than triples it for Q5 (27.0% against 8.2%). **Recent shocks** raise it by 12–13 percentage points in both groups: shocks cluster. Momentum-item spikes add 5–7 points, significant for Q5 but not for Q1. The fiscal-year start has the largest point estimate (+29 to +30 points), but with only seven occurrences its confidence interval is wide and the evidence is suggestive (p = 0.05–0.06). Fuel-price reviews raise Q5's shock probability by about 6 points but Q1's by only 1 point, consistent with Q5's greater exposure to motor fuel. Neither Ramadan nor the run-up to Eid ul-Adha changes the probability of a shock week. They are therefore kept as control variables rather than hypothesised signals. Eid ul-Adha also coincides with the fiscal-year start in 2022–25, which confounds any separate effect. These results use the team-verified Pakistani dates; correcting two Ramadan start dates changed the Ramadan row only marginally (37 instead of 36 signal weeks)."),
  ...figure("figE4_early_warning_signals.png", "Early-warning signals: exchange-rate moves and recent shocks matter most. Difference in the probability that week t+1 is a shock week (SPI rise of at least 1%), between weeks with and without each signal at week t, in percentage points, for Q1 (orange) and Q5 (blue), with 95% confidence intervals. All signals are known in advance. Fiscal-year-start weeks are rare (7), hence the wide interval. Base rate of shock weeks: Q1 14%, Q5 13%. Source: PBS weekly SPI reports, Yahoo Finance PKR=X, team-built event calendar; September 2019 – October 2026."),
);

add(
  H2("F. Exchange-Rate Pass-Through by Quintile"),
  P("How much of a 1% depreciation of the rupee in week *t* appears in each group's SPI over the following *k* weeks? For each horizon *k* = 1, …, 13 we regress the cumulative SPI change over weeks *t* to *t* + *k* − 1 on the week-*t* change in PKR/USD (OLS with HAC errors), a local-projection design [10]. Fig. 6 shows that pass-through builds up over about seven weeks and is larger for Q5 at every horizon: after four weeks, 0.34% for Q5 against 0.10% for Q1 per 1% depreciation; after 13 weeks, 0.68% against 0.51%. The confidence bands overlap, however, so the Q1–Q5 difference is not established by this descriptive analysis. It is stated as hypothesis H2 and will be tested formally with a pooled interaction model."),
  ...figure("figE5_fx_passthrough.png", "Exchange-rate shocks pass through faster to the richest quintile (point estimates). Cumulative SPI change (%) per 1% weekly depreciation of the rupee against the US dollar, by horizon in weeks (OLS of the cumulative SPI change on the week-t PKR/USD change), with 95% HAC confidence bands for Q1 and Q5. The bands overlap, so the Q1–Q5 difference is not established here; it is tested formally as H2. Source: PBS weekly SPI reports; Yahoo Finance PKR=X.", 5.8),
);

add(
  H2("G. Correlations Among Predictors and Targets"),
  P("Spearman rank correlations are used because they are resistant to the heavy tails found above. Table 13 shows how selected predictors relate to next week's SPI change and to the change over the next four weeks, for Q1 and Q5. The exchange rate is the strongest lead at the four-week horizon (ρ ≈ 0.28–0.29 for the eight-week change) but weaker for next week alone, consistent with the gradual pass-through in Fig. 6. Recent momentum (this week's change, staple-food inflation, recent shocks) correlates positively with future changes. Utility-tariff and motor-fuel momentum relate more strongly to Q5's future inflation than to Q1's (e.g. ρ = 0.26 against 0.12 for utilities at four weeks), while staple-food momentum matters for both: different exposures show up as different predictors. The calendar signals have small correlations on their own; their value lies in pinpointing *when* a shock can occur, which a classifier can combine with other signals."),
  table("Spearman correlations of selected predictors with future SPI changes, Q1 and Q5.", ["Predictor (week t)", "Q1: next week", "Q1: next 4 weeks", "Q5: next week", "Q5: next 4 weeks"], [
    ["This week's SPI change", "0.24", "0.17", "0.21", "0.17"],
    ["Shock weeks in past 4 weeks", "0.11", "0.12", "0.10", "0.14"],
    ["PKR/USD change, past 8 weeks", "0.14", "0.29", "0.14", "0.28"],
    ["PKR/USD change, past 13 weeks", "0.16", "0.28", "0.14", "0.22"],
    ["Staple-food inflation, past 4 weeks", "0.17", "0.26", "0.15", "0.23"],
    ["Perishables inflation, past 4 weeks", "−0.02", "−0.10", "0.00", "−0.05"],
    ["Utility-tariff inflation, past 4 weeks", "0.08", "0.12", "0.14", "0.26"],
    ["Motor-fuel inflation, past 4 weeks", "0.06", "0.06", "0.11", "0.14"],
    ["Fuel-price review next week", "0.08", "0.01", "0.08", "0.01"],
    ["Fiscal year starts next week", "0.16", "0.15", "0.10", "0.12"],
    ["Ramadan next week", "−0.02", "−0.09", "0.01", "−0.04"],
  ], [3626, 1350, 1350, 1350, 1350], ["l", "r", "r", "r", "r"]),
  P("Among the predictors themselves, three pairs have |ρ| ≥ 0.6 and are candidates for redundancy: the eight- and 13-week FX changes (0.76), the four-week SPI change and the number of recent shocks (0.70), and the four- and eight-week FX changes (0.65). These pairs should not all enter the same model without regularisation."),
);

add(
  H2("H. Summary of Exploratory Findings"),
  NUM("**Calm cores, heavy tails.** The median week (0.18%) is calmer than the mean week (0.30%), and the SD is 1.5–1.75 times the robust SD. Outliers are genuine shocks, mostly tariff and fuel decisions, and are kept."),
  NUM("**Masking.** Extreme weeks inflate the SD, so the Z-score rule under-detects them; the resistant quartile rule is preferred."),
  NUM("**The burden rotates.** The poorest quintile faced the most inflation in the food-driven 2019–21 period and the least in the energy- and currency-driven 2022–24 period; over the full sample its cumulative inflation (179%) was below Q5's (193%)."),
  NUM("**Exposures follow income.** Exposure to fuel rises with income; exposure to staple food is highest below Q5."),
  NUM("**Shocks versus the grind.** Utility tariffs cause about 61% of the poorest quintile's week-to-week variability on about 10% of its basket; staple food is most of the basket but a slow grind."),
  NUM("**Early warning is plausible.** Rupee depreciation and recent shocks roughly double the chance of a shock next week; the fiscal-year start is a strong but rare signal; Ramadan and Eid ul-Adha are not shock signals."),
  NUM("**Pass-through looks faster and larger for the richest quintile**, but the difference is not yet statistically established."),
);

// ---------------------------------------------------------------- IV. Hypotheses
add(
  H1("IV. Hypotheses and Analytical Plan"),
  P("The exploratory findings lead to five testable hypotheses. Each is grounded in the SDG framing: H1 asks whether shocks can be anticipated at all, H2–H4 ask whether the poor and the rich face different shocks and therefore need different warnings (SDG 10), and H5 asks whether a warning system would serve the poorest households as well as the richest (SDGs 1 and 2). Notation: *t* indexes weeks and *g* groups; *Y*_{g,t+1} = 1 if group *g*'s SPI rises by at least 1% in week *t*+1 (`target_shock_next`); **s**_{t} is the vector of lead signals and **h**_{g,t} the group's own recent history. All tests use a 5% significance level and the p-value approach."),
  H2("A. Formal Hypotheses"),
  H3("H1: Shock weeks can be predicted from lead signals"),
  EQ("logit *P*(*Y*_{g,t+1} = 1) = α_{g} + **γ**′**h**_{g,t} + **β**′**s**_{t}"),
  P("*H*_{0}: **β** = **0**: the lead signals carry no information beyond the group's own history; out of sample, the signal model's area under the ROC curve (AUC) equals that of the own-history baseline.  *H*_{1}: at least one β_{j} ≠ 0, and the signal model's out-of-sample AUC exceeds the baseline's. *Evidence:* rupee depreciation and recent shocks raise the shock probability by 12–19 percentage points (Table 12)."),
  H3("H2: Exchange-rate pass-through is larger for the richest quintile"),
  EQ("Δ log SPI_{g, t→t+8} = α_{g} + β^{FX}_{g} Δ log FX_{t−8→t} + **θ**′**x**_{g,t} + ε_{g,t}"),
  P("*H*_{0}: β^{FX}_{Q5} = β^{FX}_{Q1}.  *H*_{1}: β^{FX}_{Q5} > β^{FX}_{Q1} (one-sided). *Evidence:* four-week pass-through point estimates of 0.34 (Q5) against 0.10 (Q1), with overlapping confidence bands (Fig. 6)."),
  H3("H3: The Q1−Q5 inflation gap depends on the source of the shock (rotating burden)"),
  EQ("π^{Q1}_{t} − π^{Q5}_{t} = α + β_{food} π^{food}_{t} + β_{energy} π^{energy}_{t} + **θ**′**x**_{t} + ε_{t}"),
  P("where π denotes weekly inflation. *H*_{0}: β_{food} = β_{energy} = 0.  *H*_{1}: β_{food} > 0 and β_{energy} < 0: food shocks widen the gap against the poor and energy shocks reverse it. *Evidence:* the regime pattern in Fig. 3 and the exposure gradient in Table 11."),
  H3("H4: The predictive signals differ by quintile"),
  EQ("logit *P*(*Y*_{g,t+1} = 1) = α + **γ**′**h**_{g,t} + **β**′**s**_{t} + **δ**′(**s**_{t} × *D*^{Q5}_{g}),   *g* ∈ {Q1, Q5}"),
  P("*H*_{0}: **δ** = **0**: the signals have the same effect for Q1 and Q5.  *H*_{1}: at least one δ_{j} ≠ 0; we expect fuel, utility and FX signals to be stronger for Q5 and staple and perishable momentum to be relatively stronger for Q1. *Evidence:* a fuel review raises Q5's shock probability by about 6 points but Q1's by about 1 point (Table 12); utility and fuel momentum correlate with Q5's future inflation more than with Q1's (Table 13)."),
  H3("H5: The early-warning model is less accurate for the poorest quintile (fairness)"),
  P("Let *L*_{g,t} = (*p̂*_{g,t} − *Y*_{g,t})^{2} be the Brier score [13] of the out-of-sample forecast for group *g* in week *t*. *H*_{0}: E[*L*_{Q1,t}] = E[*L*_{Q5,t}].  *H*_{1}: E[*L*_{Q1,t}] > E[*L*_{Q5,t}]. A secondary measure is the miss rate (1 − recall) on true shock weeks. *Evidence:* a simple autoregressive baseline's error is about 12% higher for Q1 than for Q5 in the training period, and a larger share of Q1's variance comes from hard-to-predict perishables (Fig. 4)."),
);

add(
  H2("B. Variable Mapping and Analytical Plan"),
  P("Table 14 maps each hypothesis to the target, predictor and control columns of the master dataset, and to the test planned for it."),
  table("Mapping of each hypothesis to columns of the master dataset (`master_features.csv`).", ["Hyp.", "Target / response (Y)", "Primary predictors (X)", "Controls / confounders", "Planned test", "Milestone"], [
    ["H1", "`target_shock_next`", "`fx_chg_8w`, `shocks_last_4w`, `momentum_spikes_4w`, `infl_staples_4w`, `fuel_review_next_week`, `fy_start_next_week`", "`spi_wow_pct`, `spi_chg_4w`, `policy_rate`, `grp_*`, `ramadan_next_week`, `pre_eid_adha_4w`", "Logit likelihood-ratio test of β = 0; out-of-sample AUC vs baseline (DeLong test [11]), test period 2025–26", "M3"],
    ["H2", "`target_spi_chg_next8w` (also 4w, 13w)", "`fx_chg_8w` × group", "`spi_chg_4w`, `infl_motor_fuel_4w`, `policy_rate`", "OLS with HAC errors; one-sided Wald test of β^{FX}_{Q5} − β^{FX}_{Q1} = 0", "M3"],
    ["H3", "`gap_q1_q5_wow`", "`infl_food_wow`, `infl_energy_wow`", "`fx_wow_pct`, `fuel_revision_week`, period dummies", "OLS with HAC errors; one-sided t-tests on β_{food} and β_{energy}", "M3"],
    ["H4", "`target_shock_next` (Q1 and Q5 rows)", "H1 signals × `grp_Q5`", "as H1", "Likelihood-ratio test of all interactions δ = 0", "M3–M4"],
    ["H5", "Brier score and miss rate by group (out of sample)", "model forecasts for Q1 vs Q5", "—", "Diebold–Mariano test [12] on weekly loss differences; recall gap on shock weeks", "M4, re-tested in M5"],
  ], [650, 1850, 2000, 1700, 1726, 1100], ["c", "l", "l", "l", "l", "c"]),
  P("**Analytical plan.** Models are trained on weeks up to 31 December 2024 and evaluated on 2025–26, with no shuffling across time and all scaling and feature selection fitted on the training weeks only. Milestone 3 will fit baseline classifiers (logistic regression, k-nearest neighbours) for `target_shock_next` and test H1–H3; Milestone 4 will add the final model and the fairness analysis (H4–H5); Milestone 5 will re-test the models on SPI weeks published after this draft, a true out-of-sample test. Ramadan and Eid ul-Adha enter as controls, not as hypotheses, because the exploratory analysis found no shock effect and Eid ul-Adha is confounded with the fiscal-year start."),
);

add(
  H1("Data and Code Availability"),
  P("All data are public. The pipeline (`src/`), the notebooks `01_data_preparation.ipynb` (Section II) and `02_eda.ipynb` (Section III), the data dictionaries and the figure and table files are in the project repository (github.com/S-Hoorain/Ds-project). Raw downloaded reports are not redistributed but can be rebuilt with the scraping scripts, whose manifest records the source URL and checksum of every file."),
);

// ---------------------------------------------------------------- References
const REFS = [
  "Pakistan Bureau of Statistics, \"Price statistics: Weekly Sensitive Price Indicator (SPI),\" https://www.pbs.gov.pk/price-statistics/ (weekly reports, Sep. 2019 – Oct. 2026; accessed Oct. 2026).",
  "Internet Archive, \"Wayback Machine CDX server API,\" https://web.archive.org/cdx/search/cdx (archived copies of the former PBS website; accessed Oct. 2026).",
  "State Bank of Pakistan, \"Monetary Policy Statements,\" https://www.sbp.org.pk/ (archived statements 2018–2026; accessed Oct. 2026).",
  "Yahoo Finance, \"USD/PKR (PKR=X) historical data,\" https://finance.yahoo.com/quote/PKR=X/ (accessed Oct. 2026).",
  "M. Alshehri, \"hijridate: Hijri–Gregorian dates converter based on the Umm al-Qura calendar,\" Python package, version 2.6.0.",
  "H. Wickham, \"Tidy data,\" *Journal of Statistical Software*, vol. 59, no. 10, pp. 1–23, 2014.",
  "J. W. Tukey, *Exploratory Data Analysis*. Reading, MA: Addison-Wesley, 1977.",
  "W. K. Newey and K. D. West, \"A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix,\" *Econometrica*, vol. 55, no. 3, pp. 703–708, 1987.",
  "A. Agresti, *Categorical Data Analysis*, 3rd ed. Hoboken, NJ: Wiley, 2013.",
  "Ò. Jordà, \"Estimation and inference of impulse responses by local projections,\" *American Economic Review*, vol. 95, no. 1, pp. 161–182, 2005.",
  "E. R. DeLong, D. M. DeLong, and D. L. Clarke-Pearson, \"Comparing the areas under two or more correlated receiver operating characteristic curves: A nonparametric approach,\" *Biometrics*, vol. 44, no. 3, pp. 837–845, 1988.",
  "F. X. Diebold and R. S. Mariano, \"Comparing predictive accuracy,\" *Journal of Business & Economic Statistics*, vol. 13, no. 3, pp. 253–263, 1995.",
  "G. W. Brier, \"Verification of forecasts expressed in terms of probability,\" *Monthly Weather Review*, vol. 78, no. 1, pp. 1–3, 1950.",
  "United Nations General Assembly, \"Transforming our world: The 2030 Agenda for Sustainable Development,\" Resolution A/RES/70/1, 2015.",
  "Benazir Income Support Programme, Government of Pakistan, https://bisp.gov.pk/ (accessed Oct. 2026).",
];
add(H1("References"));
REFS.forEach((r, i) => body.push(new Paragraph({
  children: [new TextRun({ text: `[${i + 1}]`, font: FONT, size: 20, color: BLACK }), new TextRun({ text: "\t", font: FONT, size: 20 }), ...runs(r, { size: 20 })],
  tabStops: [{ type: "left", position: 500 }], indent: { left: 500, hanging: 500 }, spacing: { after: 80 }, alignment: AlignmentType.LEFT,
})));

// ================================================================== DOCUMENT
const heading = (id, name, size, opts = {}) => ({
  id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
  run: { font: FONT, size, bold: true, italics: opts.italics, color: BLACK, allCaps: opts.caps },
  paragraph: { spacing: { before: opts.before, after: opts.after }, outlineLevel: opts.level, keepNext: true },
});
const numbered = (ref) => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 400, hanging: 300 } }, run: { font: FONT, size: BODY, color: BLACK } } }] });

const doc = new Document({
  creator: "Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid",
  title: "An Early-Warning System for Essential-Price Shocks Across Income Quintiles in Pakistan (M2 draft)",
  styles: {
    default: { document: { run: { font: FONT, size: BODY, color: BLACK } } },
    paragraphStyles: [
      heading("Heading1", "Heading 1", 24, { before: 300, after: 140, level: 0 }),
      heading("Heading2", "Heading 2", 22, { before: 220, after: 100, level: 1 }),
      heading("Heading3", "Heading 3", 22, { before: 160, after: 80, level: 2, italics: true }),
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: BLACK } } }] },
      numbered("steps"), numbered("findings"),
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${OUT}: ${tableNo} tables, ${figNo} figures`);
});
