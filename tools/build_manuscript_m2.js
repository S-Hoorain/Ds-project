// Builds the Milestone 2 manuscript draft (Sections II-III): manuscript/M2_manuscript_draft.docx
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
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t })], keepNext: true });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })], keepNext: true });
const BUL = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 264 } });
const NUM = (t) => new Paragraph({ numbering: { reference: "findings", level: 0 }, children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 264 } });

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
// Draft of Sections II and III only (no abstract or introduction). Limit: 3,000 words of body text
// (tables, captions and references are not counted).
const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));

// ---------------------------------------------------------------- title block
add(
  new Paragraph({ children: runs("An Early-Warning System for Essential-Price Shocks Across Income Quintiles in Pakistan", { size: 32, bold: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 120 } }),
  new Paragraph({ children: runs("Draft of Section II (Data and Preprocessing) and Section III (Exploratory Data Analysis)", { size: 22, italics: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new Paragraph({ children: runs("Syeda Hoorain Imran (Computer Science)  ·  Muhammad Munib Sattar (Social Development and Policy)  ·  Sarah Khalid (Social Development and Policy)", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: runs("CS/SDP 312/314: Data Science for Social Good  ·  Milestone 2  ·  6 October 2026", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  P("**Research question:** Can weekly price shocks in essential items be predicted, and how do their size and predictability differ across income quintiles? (SDGs 1, 2 and 10)", { align: AlignmentType.CENTER, after: 240 }),
);

// ---------------------------------------------------------------- II. Data and preprocessing
add(H1("II. Data and Preprocessing"));

add(
  H2("A. Sources and Master Dataset"),
  P("The primary source is the Pakistan Bureau of Statistics (PBS) weekly Sensitive Price Indicator (SPI) [1]. It prices 51 essential items in 50 markets across 17 cities and reports an index (2015-16 = 100) for five consumption quintiles, from Q1 (poorest, monthly expenditure up to Rs 17,732) to Q5 (richest, above Rs 44,175), plus a Combined index. Each weekly report has a quintile table (current week, previous week, same week last year) and an item table (national average prices, fixed basket weights and each item's percentage-point impact on the weekly change). Food (32 items) makes up 69.0% of the lowest quintile's basket against 62.3% of the combined basket, and energy (6 items) 17.6% against 25.4%: the poorest households' basket is more food-heavy but less energy-heavy, mainly because petrol carries little weight for them."),
  P("We add the daily PKR/USD rate [2], State Bank of Pakistan (SBP) policy-rate decisions from archived Monetary Policy Statements [3], and a Ramadan/Eid calendar built from the Umm al-Qura calendar with Pakistani dates verified by the team. Fuel-price revisions are derived from the SPI petrol and diesel items. Table 1 summarises the master dataset."),
  table("Master dataset inventory.", ["Property", "Value"], [
    ["Observational unit", "1 row = 1 SPI week (ending Thursday) × 1 group (Q1–Q5, Combined)"],
    ["Rows × columns", "2,220 × 105 (370 weeks × 6 groups; 70 prepared variables + 35 features)"],
    ["Period", "5 Sep 2019 – 1 Oct 2026; no missing weeks"],
    ["Companion item panel", "18,870 rows (370 weeks × 51 items) × 18 columns"],
    ["Sources", "PBS SPI reports (PBS website, Wayback Machine); Yahoo Finance; SBP; event calendar"],
    ["Targets", "`target_shock_next` (classification); `target_spi_chg_next4w/8w/13w` (regression)"],
  ], [2400, 6626], ["l", "l"]),
);

add(
  H2("B. Collection Audit"),
  P("PBS publishes no consolidated history. Reports up to mid-2025 were PDF files on the former PBS website, which survives only in the Internet Archive's Wayback Machine [4]; the current website lists reports from July 2023 (with Excel files from October 2025). Our pipeline (i) catalogues every file from the current site's embedded JavaScript table and the Wayback CDX index (2,204 files, with dates parsed from at least six file-name formats); (ii) downloads one report per week politely (1–4 s between requests, back-off, automatic stop after repeated failures) and resumably, rejecting any file that is not a genuine PDF or Excel file on the 2015-16 base; and (iii) logs the URL, timestamp and SHA-256 checksum of every file. Of the 370 Thursdays from 5 September 2019 (the first 2015-16-base week) to 1 October 2026, reports were obtained for 359 (222 archived, 137 current). Fifteen current-site links were dead: five were replaced by archived copies and ten were mis-dated duplicates of weeks already obtained. The 11 missing weeks, mostly Eid holidays when PBS did not publish, are recovered as described in Section II-D. The 2015-16 base begins in 2019, not 2016 as assumed in our proposal; earlier weekly data use an incompatible 2007-08 base."),
);

add(
  H2("C. Parsing, Alignment and Reshaping"),
  P("Excel reports were read cell by cell. In the PDF quintile table, labels and numbers are separate text blocks that are sometimes misaligned, so numbers were grouped into columns by position and read top to bottom; item rows were read in the PDF's internal text order, which keeps long item names intact. Raw item names were mapped to 51 canonical items (only one fuzzy match was needed, for a PBS typo). All 359 files passed validation (base year, complete six-row quintile table, 51 unique items), and each week's item impacts sum to the reported index change to within 0.011 percentage points (pp). One PBS formatting error was found: the first report (5 September 2019) printed the lowest-quintile impact column twice, so that week's Combined impacts were set to missing. The data were then structured for modelling:"),
  BUL("**Tidy long format** [5]: one row per week and group. A pivot to a wide week × group layout and a melt back reproduce all 2,220 rows."),
  BUL("**Week alignment:** 14 holiday releases dated Wednesday or Saturday were aligned to the nearest Thursday, giving a regular grid for lags."),
  BUL("**Item panel:** a complete 370 × 51 grid, so unpublished weeks become explicit rows."),
  BUL("**Aggregate, pivot, join:** item impacts were summed by category (food, energy, clothing, household), pivoted to one column each, and joined to every group's row without changing the row count."),
  BUL("**Merges:** PKR/USD averaged over each Friday–Thursday week after removing two bad ticks; the SBP rate in force at the end of the week; calendar days per week; and a fuel-revision flag (petrol or diesel moved by more than 1%; 127 of 369 weeks)."),
);

add(
  H2("D. Missing Data"),
  P("Before treatment, 25 of 44 columns had gaps, none above 3.24% (Table 2)."),
  table("Missing values by type and strategy (out of 2,220 rows).", ["Type", "Columns", "Missing (%)", "Strategy"], [
    ["Structural", "lags, weekly changes, next-week target", "0.3–1.4", "listwise deletion when fitting models"],
    ["Unpublished weeks", "SPI, year-ago SPI, fuel changes", "2.97", "recovered from official figures"],
    ["Contributions", "category impacts", "2.97–3.24", "left missing; those analyses drop these weeks"],
  ], [1800, 3000, 1300, 2926], ["l", "l", "c", "l"]),
  P("We do not use mean or median imputation: in a weekly price series it would invent a jump and its reversal, the very event we forecast. Instead, each unpublished week's SPI is taken from the next report's official \"previous week\" value, so the index and the target have **no missing weeks**. Year-ago values come from the 52-week lag, which agrees with the reported value in 99.7% of 1,842 overlapping cases, and fuel changes are recomputed from the completed item panel (66 missing values reduced to 6). For the 13 values that PBS later revised, we use the latest vintage; the largest revision (2.04 points for Q1, 20 November 2025) reflects a corrected Q1 electricity tariff."),
  P("**Selection bias.** Missingness is not random. Eid weeks are 8.9% of all weeks but 63.6% of unpublished weeks, so dropping them would under-represent the calendar events we study and bias any Eid effect. Because the index was recovered, only analyses that use category contributions are affected; they will be repeated without the Eid windows."),
);

add(
  H2("E. Transformations and Encoding"),
  P("**Log transform.** Item prices are strongly right-skewed (skewness 2.66, excess kurtosis 7.92), because a matchbox sits beside an LPG cylinder; the log reduces these to −0.97 and 1.85 (Fig. 1). The SPI and the exchange rate are not skewed but grow multiplicatively, so we use `log_spi` and `log_fx`, whose differences approximate percentage changes. Weekly percentage changes can be negative and are kept as they are; their heavy tails (excess kurtosis above 30) are examined in Section III-B."),
  ...figure("figP1_log_transform.png", "Item prices (PKR per unit; 51 items × 370 weeks) and the Combined SPI (index, 2015-16 = 100) on raw and log scales. Source: PBS weekly SPI reports.", 5.6),
  P("**Scaling.** Ten continuous predictors are provided both Min-Max normalised, *x′* = (*x* − min) / (max − min), and Z-score standardised, *z* = (*x* − *x̄*) / *s*. To prevent look-ahead leakage, the parameters are computed on the training period only (up to 31 December 2024: 278 weeks) and applied unchanged to the 92 test weeks. Test values may therefore fall outside [0, 1]; the scaled log SPI reaches 1.107 in 2026 because prices now exceed any level seen in training."),
  P("**Encoding.** The group becomes the dummies `grp_Q1` … `grp_Q5` and `grp_Combined` (reference: Combined, avoiding the dummy-variable trap); the weekly SBP action becomes `mpc_hike` (12 weeks), `mpc_cut` (13) and `mpc_hold` (31), with no meeting (314 weeks) as the reference; yes/no flags are coded 0/1."),
);

add(
  H2("F. Early-Warning Features"),
  P("Standing at the end of week *t*, the model asks whether week *t*+1 will be a **shock week**, defined as an SPI rise of at least 1% (13–17% of weeks, depending on the group; `target_shock_next`). The threshold is rare enough to mark a genuine shock yet frequent enough to model. All 35 features use only information available at week *t* or calendar facts known in advance: the fortnightly fuel-price review dates (the 1st and 16th of each month; 64% of weeks containing them had a fuel revision, against 9% of other weeks), the fiscal-year start (1 July), Ramadan, and the four weeks before Eid ul-Adha; PKR/USD changes over 4, 8 and 13 weeks; component inflation (utilities, motor fuel, perishables, staples and others); recent shocks; and spikes in seven \"momentum\" items whose price spikes tend to persist, chosen from training weeks only. Continuous targets give the cumulative SPI change over the next 4, 8 and 13 weeks."),
);

add(
  H2("G. Summary of Preprocessing Decisions and Limitations"),
  P("Table 3 lists every preparation decision with its rationale and effect."),
  table("Preprocessing decisions.", ["Decision", "Rationale", "Effect"], [
    ["Align report dates to the nearest Thursday", "regular weekly grid for lags", "14 reports realigned"],
    ["Fill unpublished weeks from the next report's previous-week value", "official PBS figure, not imputation", "11 weeks recovered; 0 missing SPI"],
    ["Use revised values when PBS revises a week", "latest vintage is the best estimate", "13 values, flagged"],
    ["Drop FX bad ticks before weekly averaging", "one-day spikes that fully reverse", "2 days dropped"],
    ["Fuel-revision week: petrol or diesel moved > 1%", "administered prices change in steps", "127 of 369 weeks"],
    ["Year-ago SPI from the 52-week lag where not reported", "agrees with reported value (99.7%)", "66 rows filled"],
    ["No mean/median imputation; listwise deletion of structural gaps", "imputation invents price jumps", "≤ 1.4% of rows per variable"],
    ["Log of SPI, FX and item prices", "multiplicative growth; right skew", "Fig. 1"],
    ["Min-Max and Z-score from training-period statistics", "prevents look-ahead leakage", "10 predictors × 2 versions"],
    ["Dummy-encode group and MPC action", "nominal categories", "references: Combined; no meeting"],
    ["Shock = weekly SPI rise ≥ 1%", "interpretable; 13–17% of weeks", "`target_shock_next`"],
    ["Momentum items chosen on training weeks only", "no peeking at the test period", "7 items"],
    ["Keep all outliers", "genuine shocks (Section III-B)", "resistant statistics, HAC errors"],
  ], [3800, 2900, 2326], ["l", "l", "l"]),
  P("**Limitations.** The SPI covers urban markets only, so rural price movements are missed; its weights date from 2015-16 and may no longer reflect consumption; PBS publishes item impacts only for Q1 and Combined; the exchange rate is a market quote rather than the official rate; and the 2015-16 base gives only seven years of data (e.g. seven fiscal-year starts)."),
);

// ---------------------------------------------------------------- III. EDA
add(H1("III. Exploratory Data Analysis"));

add(
  H2("A. Univariate Statistics"),
  P("Table 4 pairs non-resistant statistics (mean, standard deviation) with resistant ones (median, IQR; robust SD = IQR / 1.349). In every group the median week (0.17–0.18%) is calmer than the mean week (0.28–0.31%), and the SD is 1.5–1.75 times the robust SD, with excess kurtosis of 14–45: most weeks move little and a few move a lot. That handful of weeks is exactly what we want to forecast. Q5 is the calmest group by every measure of spread, yet its narrow core makes its rare jumps stand out."),
  table("Weekly SPI change (%) by group, 369 weeks each.", ["Group", "Mean", "Median", "SD", "IQR", "Robust SD", "Skewness", "Ex. kurtosis"], [
    ["Q1 (poorest)", "0.28", "0.18", "1.08", "1.00", "0.74", "0.18", "18.1"],
    ["Q2", "0.30", "0.18", "1.28", "1.00", "0.74", "−0.24", "34.0"],
    ["Q3", "0.31", "0.18", "1.15", "0.89", "0.66", "2.97", "44.9"],
    ["Q4", "0.30", "0.18", "1.02", "0.85", "0.63", "2.56", "30.8"],
    ["Q5 (richest)", "0.30", "0.17", "0.96", "0.79", "0.58", "1.98", "13.8"],
    ["Combined", "0.30", "0.18", "1.09", "0.85", "0.63", "1.29", "26.2"],
  ], [1626, 900, 900, 900, 900, 1100, 1300, 1400], ["l", "r", "r", "r", "r", "r", "r", "r"]),
  P("Among the predictors (Table 5), utility tariffs and motor fuel have a median and IQR of zero but extreme skewness (5.45 and 2.61), the signature of administered prices that stay fixed for weeks and jump on decision dates. Staple food moves a little every week: a slow grind. The exchange rate is calm in most weeks, with occasional large depreciations."),
  table("Week-level predictors (n = 362–370 weeks).", ["Predictor", "Mean", "Median", "SD", "IQR", "Skewness", "Min", "Max"], [
    ["SPI year-on-year inflation, Combined (%)", "17.58", "15.23", "12.66", "18.60", "0.65", "−3.52", "48.35"],
    ["PKR/USD change over 8 weeks (%)", "1.25", "0.05", "4.02", "2.65", "2.06", "−9.00", "21.13"],
    ["SBP policy rate (%)", "13.26", "12.00", "5.08", "7.00", "0.52", "7.00", "22.00"],
    ["Staple food, weekly price change (%)", "0.26", "0.17", "0.49", "0.43", "2.60", "−1.65", "3.88"],
    ["Perishables, weekly price change (%)", "0.60", "0.35", "4.03", "5.33", "0.20", "−9.09", "14.57"],
    ["Utility tariffs, weekly change (%)", "0.72", "0.00", "7.61", "0.00", "5.45", "−51.91", "79.05"],
    ["Petrol and diesel, weekly change (%)", "0.41", "0.00", "3.81", "0.00", "2.61", "−19.75", "33.88"],
    ["Momentum-item spikes, past 4 weeks (count)", "1.97", "2.00", "1.54", "2.00", "0.96", "0", "8"],
  ], [3500, 700, 760, 700, 700, 900, 880, 886], ["l", "r", "r", "r", "r", "r", "r", "r"]),
);

add(
  H2("B. Outlier Diagnostics"),
  P("Both course rules were applied (Table 6): the quartile rule (mild beyond 1.5 × IQR, regular beyond 3 × IQR) and the Z-score rule (mild |*z*| > 2, regular |*z*| > 3). The resistant quartile rule flags more weeks (17 against 13 mild outliers for Q1), because extremes cannot widen its fences. **Masking** is substantial: without the regular outliers the SD falls by 25–35%, and the number of weeks with |*z*| > 3 rises from 6 to 10 for Q1 and from 6 to 19 for Q5. The extremes inflate the variance and hide one another, so the quartile rule is preferred."),
  table("Outliers in the weekly SPI change (weeks out of 369).", ["Group", "Quartile, mild", "Quartile, regular", "|z| > 2", "|z| > 3", "|z| > 3, unmasked"], [
    ["Q1", "17", "6", "13", "6", "10"],
    ["Q2", "17", "6", "10", "6", "12"],
    ["Q3", "18", "6", "10", "4", "11"],
    ["Q4", "19", "5", "13", "5", "11"],
    ["Q5", "23", "11", "20", "6", "19"],
    ["Combined", "20", "9", "15", "7", "14"],
  ], [1626, 1500, 1500, 1300, 1300, 1800], ["l", "c", "c", "c", "c", "c"]),
  P("The outliers are not errors. Table 7 traces the ten largest Combined moves through PBS item impacts: each coincides with a utility-tariff change, a fuel revision or a broad staple-food move. They are the shocks we aim to forecast, so all are kept; analyses use resistant statistics, HAC (Newey–West) standard errors [6] and non-parametric tests, and the binary target is itself robust to the size of a shock (Fig. 2)."),
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
  ...figure("figE3_weekly_change_distribution.png", "Weekly SPI change (%) by group, September 2019 – October 2026. Boxes show the IQR and median; whiskers reach the 1.5 × IQR fence; the dashed line is the +1% shock threshold. Axis cut at −3% and +4%. Source: PBS.", 5.8),
);

add(
  H2("C. The Rotating Burden"),
  P("Over the full sample, Q1's cumulative inflation (179%) was the lowest of all groups and below Q5's (193%), contradicting our Milestone 1 expectation (Table 8). The ranking depends on the source of inflation (Fig. 3). Q1 faced more inflation in the food-driven 2019–21 period (38.8% against 33.9% for Q5) and less in the energy- and currency-driven 2022–23 period (74.0% against 83.1%). Shocks were also most frequent in 2022–23, when about a quarter of weeks were shocks in every group, against 8–13% in the other periods."),
  table("Cumulative inflation and share of shock weeks by period (%).", ["Period", "Q1", "Q2", "Q3", "Q4", "Q5", "Combined"], [
    ["*Cumulative SPI inflation*", "", "", "", "", "", ""],
    ["2019–21", "38.8", "36.8", "34.4", "33.5", "33.9", "35.1"],
    ["2022–23", "74.0", "80.8", "91.5", "89.5", "83.1", "85.1"],
    ["2024–26", "15.0", "17.2", "16.7", "16.7", "18.2", "18.1"],
    ["Full sample", "179.1", "191.9", "202.3", "197.7", "192.8", "197.9"],
    ["*Share of shock weeks*", "", "", "", "", "", ""],
    ["2019–21", "9.0", "13.1", "11.5", "13.1", "10.7", "12.3"],
    ["2022–23", "26.9", "28.8", "25.0", "27.9", "24.0", "25.0"],
    ["2024–26", "9.0", "10.4", "9.0", "9.7", "7.6", "9.7"],
    ["Full sample", "14.1", "16.5", "14.3", "15.9", "13.2", "14.9"],
  ], [2826, 1000, 1000, 1000, 1000, 1000, 1200], ["l", "r", "r", "r", "r", "r", "r"]),
  ...figure("figE1_rotating_burden.png", "Year-on-year SPI inflation (%) for Q1, Q5 and Combined (top) and the Q1 − Q5 gap in percentage points (bottom; orange means Q1 higher). Shaded spans mark the two longest regimes. Source: PBS.", 5.8),
  P("Regressing each group's weekly SPI change on six component price changes (OLS with HAC errors; R² 0.76–0.82) recovers exposures that PBS does not publish for Q2–Q5 (Table 9). Motor-fuel exposure rises steadily from 2.7 (Q1) to 10.7 (Q5), while staple-food exposure is 41–48 for Q1–Q4 but only 33 for Q5; utility-tariff exposure peaks in the middle quintiles. Because exposures differ, a single national forecast would misjudge some quintiles."),
  table("Exposure of each group's SPI to six price components (OLS coefficients × 100).", ["Group", "Utility tariffs", "Motor fuel", "LPG & firewood", "Perishables", "Staple food", "Non-food", "R²"], [
    ["Q1", "10.2", "2.7", "2.4", "12.4", "45.1", "11.1", "0.80"],
    ["Q2", "13.2", "4.2", "2.8", "12.2", "41.0", "8.5", "0.81"],
    ["Q3", "11.3", "5.0", "3.2", "11.2", "47.7", "5.9", "0.79"],
    ["Q4", "9.0", "6.7", "3.6", "11.1", "46.1", "8.2", "0.78"],
    ["Q5", "6.9", "10.7", "6.4", "9.5", "33.2", "16.5", "0.76"],
    ["Combined", "10.4", "8.4", "5.0", "10.5", "34.9", "11.0", "0.82"],
  ], [1300, 1200, 1100, 1250, 1150, 1150, 1100, 776], ["l", "r", "r", "r", "r", "r", "r", "r"]),
);

add(
  H2("D. Shocks Versus the Grind"),
  P("PBS item impacts, available for Q1 and Combined, separate the level of inflation from its week-to-week variability (Fig. 4). For Q1, staple food is 57% of the basket and about half of cumulative inflation, but only 8% of the weekly variance; utility tariffs are 10% of the basket but 61% of the variance, and perishables 28%. Shocks are therefore concentrated in a few administered prices and volatile perishables, while most of the cost-of-living burden accumulates slowly through staple food. For an early-warning system, this means that the tariff and fuel calendar carries much of the signal."),
  ...figure("figE2_shocks_vs_grind.png", "Each component's share of the 2015-16 basket and of the variance of weekly SPI changes (%), for Q1 and Combined, from PBS item impacts. Source: PBS."),
);

add(
  H2("E. Early-Warning Signals"),
  P("Table 10 crosses each signal at week *t* with a shock in week *t*+1. Fisher's exact test [7] suits the small cells, such as the seven fiscal-year starts. Continuous signals were made binary with pre-stated cut-offs. Base rates are 14.1% (Q1) and 13.2% (Q5)."),
  table("Probability (%) that next week is a shock week, with / without each signal.", ["Signal at week t", "Q1", "Q1 p", "Q5", "Q5 p"], [
    ["Rupee fell > 2% in past 8 weeks", "23.0 / 10.8", "0.004", "27.0 / 8.2", "< 0.001"],
    ["Shock in past 4 weeks", "21.2 / 9.4", "0.002", "21.8 / 8.5", "< 0.001"],
    ["≥ 2 momentum-item spikes in 4 weeks", "16.4 / 11.0", "0.17", "16.4 / 9.0", "0.04"],
    ["Fiscal year starts next week (n = 7)", "42.9 / 13.5", "0.06", "42.9 / 12.7", "0.05"],
    ["Fuel-price review next week", "14.7 / 13.6", "0.77", "16.5 / 10.6", "0.12"],
    ["Eid ul-Adha within 4 weeks", "14.3 / 14.1", "1.00", "10.7 / 13.5", "1.00"],
    ["Ramadan next week", "8.1 / 14.8", "0.33", "13.5 / 13.3", "1.00"],
  ], [3626, 1500, 1000, 1500, 1400], ["l", "c", "r", "c", "r"]),
  P("Rupee depreciation roughly doubles the shock probability for Q1 and triples it for Q5, and recent shocks add 12–13 pp, so shocks cluster. Momentum-item spikes add 5–7 pp, significant for Q5 but not for Q1. The fiscal-year start has the largest effect (about +30 pp), but with only seven occurrences the evidence is suggestive. Fuel reviews matter for Q5 (+6 pp) but barely for Q1 (+1 pp), matching their fuel exposure. Ramadan and Eid ul-Adha show no effect, using the team-verified dates, and are kept as controls; Eid ul-Adha also coincides with the fiscal-year start in 2022–25 (Fig. 5)."),
  ...figure("figE4_early_warning_signals.png", "Difference in the probability that week t+1 is a shock week with and without each signal (pp), for Q1 and Q5, with 95% confidence intervals. Sources: PBS, Yahoo Finance, team event calendar."),
);

add(
  H2("F. Exchange-Rate Pass-Through and Correlations"),
  P("Local-projection regressions [8] of the cumulative SPI change over *k* = 1–13 weeks on the week-*t* PKR/USD change show pass-through building over about seven weeks. It is larger for Q5 (0.34% against 0.10% per 1% depreciation after four weeks), although the HAC confidence bands overlap (Fig. 6), so the difference is not yet established."),
  ...figure("figE5_fx_passthrough.png", "Cumulative SPI response (%) to a 1% weekly rupee depreciation, by horizon in weeks, with 95% HAC bands for Q1 and Q5. Sources: PBS; Yahoo Finance.", 5.4),
  P("Spearman correlations, which resist the heavy tails, confirm the eight-week FX change as the strongest lead of four-week-ahead inflation (Table 11). Recent momentum also correlates positively with future changes. Utility-tariff and motor-fuel momentum matter more for Q5 than for Q1, while staple-food momentum matters for both: different exposures appear as different predictors. Calendar signals have small correlations on their own; their value lies in pinpointing when a shock can occur. Three predictor pairs are redundant (|ρ| ≥ 0.6): the overlapping FX horizons, and the four-week SPI change with recent shocks."),
  table("Spearman correlations of predictors with future SPI changes.", ["Predictor (week t)", "Q1: next week", "Q1: next 4 weeks", "Q5: next week", "Q5: next 4 weeks"], [
    ["This week's SPI change", "0.24", "0.17", "0.21", "0.17"],
    ["Shock weeks in past 4 weeks", "0.11", "0.12", "0.10", "0.14"],
    ["PKR/USD change, past 8 weeks", "0.14", "0.29", "0.14", "0.28"],
    ["Staple-food inflation, past 4 weeks", "0.17", "0.26", "0.15", "0.23"],
    ["Utility-tariff inflation, past 4 weeks", "0.08", "0.12", "0.14", "0.26"],
    ["Motor-fuel inflation, past 4 weeks", "0.06", "0.06", "0.11", "0.14"],
    ["Fiscal year starts next week", "0.16", "0.15", "0.10", "0.12"],
    ["Ramadan next week", "−0.02", "−0.09", "0.01", "−0.04"],
  ], [3626, 1350, 1350, 1350, 1350], ["l", "r", "r", "r", "r"]),
);

add(
  H2("G. Summary of Findings"),
  NUM("Weekly price changes have calm cores and heavy tails; the outliers are genuine tariff and fuel shocks and are kept."),
  NUM("Extreme weeks mask one another under the Z-score rule; the resistant quartile rule is preferred."),
  NUM("The burden rotates: the poorest faced the most inflation in the food-driven period and the least in the energy- and currency-driven period."),
  NUM("Fuel exposure rises with income; staple-food exposure is highest below Q5."),
  NUM("Utility tariffs drive most weekly variability; staple food is a slow grind."),
  NUM("Rupee depreciation and recent shocks roughly double the chance of a shock next week; Ramadan and Eid ul-Adha do not."),
);

add(
  H2("H. Hypotheses and Analytical Plan"),
  P("The findings motivate five hypotheses, tested at the 5% level with the p-value approach. Let *Y*_{g,t+1} = 1 if group *g*'s SPI rises by at least 1% in week *t*+1, **s**_{t} be the lead signals and **h**_{g,t} the group's own history. Table 12 maps each hypothesis to dataset columns."),
  BUL("**H1 (early warning).** In logit *P*(*Y*_{g,t+1} = 1) = α_{g} + **γ**′**h**_{g,t} + **β**′**s**_{t}, *H*_{0}: **β** = **0**; *H*_{1}: **β** ≠ **0**, and the out-of-sample AUC exceeds that of the own-history baseline. Evidence: Table 10."),
  BUL("**H2 (FX pass-through).** In the eight-week pass-through regression, *H*_{0}: β^{FX}_{Q5} = β^{FX}_{Q1}; *H*_{1}: β^{FX}_{Q5} > β^{FX}_{Q1}. Evidence: Fig. 6."),
  BUL("**H3 (rotating burden).** In π^{Q1}_{t} − π^{Q5}_{t} = α + β_{food} π^{food}_{t} + β_{energy} π^{energy}_{t} + ε_{t}, *H*_{0}: β_{food} = β_{energy} = 0; *H*_{1}: β_{food} > 0 and β_{energy} < 0. Evidence: Fig. 3, Table 9."),
  BUL("**H4 (quintile-specific signals).** In a pooled logit for Q1 and Q5, *H*_{0}: all signal × Q5 interactions δ = 0; *H*_{1}: at least one δ ≠ 0. Evidence: fuel reviews and utility momentum matter more for Q5."),
  BUL("**H5 (fairness).** With Brier loss *L*, *H*_{0}: E[*L*_{Q1}] = E[*L*_{Q5}]; *H*_{1}: E[*L*_{Q1}] > E[*L*_{Q5}]. Evidence: a simple autoregressive baseline errs about 12% more for Q1, whose variance leans on hard-to-predict perishables."),
  table("Variable mapping (columns of `master_features.csv`).", ["Hyp.", "Target (Y)", "Predictors (X)", "Controls", "Test"], [
    ["H1", "`target_shock_next`", "`fx_chg_8w`, `shocks_last_4w`, `momentum_spikes_4w`, `fuel_review_next_week`, `fy_start_next_week`", "`spi_chg_4w`, `policy_rate`, `ramadan_next_week`, `pre_eid_adha_4w`", "Logit LR test; AUC, DeLong test [9]"],
    ["H2", "`target_spi_chg_next8w`", "`fx_chg_8w` × group", "`infl_motor_fuel_4w`, `policy_rate`", "OLS, HAC; one-sided Wald test"],
    ["H3", "`gap_q1_q5_wow`", "`infl_food_wow`, `infl_energy_wow`", "`fx_wow_pct`, period dummies", "OLS, HAC; t-tests"],
    ["H4", "`target_shock_next` (Q1, Q5)", "H1 signals × `grp_Q5`", "as H1", "LR test of δ = 0"],
    ["H5", "Brier loss by group", "Q1 vs Q5 forecasts", "—", "Diebold–Mariano test [10]"],
  ], [650, 2000, 2350, 2150, 1876], ["c", "l", "l", "l", "l"]),
  P("Models are trained on weeks up to 31 December 2024 and tested on 2025–26; H1–H3 will be tested in Milestone 3 and H4–H5 in Milestone 4."),
);

// ---------------------------------------------------------------- References
const REFS = [
  "Pakistan Bureau of Statistics, \"Weekly Sensitive Price Indicator (SPI),\" https://www.pbs.gov.pk/price-statistics/ (accessed Oct. 2026).",
  "Yahoo Finance, \"USD/PKR (PKR=X) historical data,\" https://finance.yahoo.com/quote/PKR=X/ (accessed Oct. 2026).",
  "State Bank of Pakistan, \"Monetary Policy Statements,\" https://www.sbp.org.pk/ (accessed Oct. 2026).",
  "Internet Archive, \"Wayback Machine CDX server API,\" https://web.archive.org/cdx/search/cdx (accessed Oct. 2026).",
  "H. Wickham, \"Tidy data,\" *Journal of Statistical Software*, vol. 59, no. 10, pp. 1–23, 2014.",
  "W. K. Newey and K. D. West, \"A simple, positive semi-definite, heteroskedasticity and autocorrelation consistent covariance matrix,\" *Econometrica*, vol. 55, no. 3, pp. 703–708, 1987.",
  "A. Agresti, *Categorical Data Analysis*, 3rd ed. Hoboken, NJ: Wiley, 2013.",
  "Ò. Jordà, \"Estimation and inference of impulse responses by local projections,\" *American Economic Review*, vol. 95, no. 1, pp. 161–182, 2005.",
  "E. R. DeLong, D. M. DeLong, and D. L. Clarke-Pearson, \"Comparing the areas under two or more correlated receiver operating characteristic curves,\" *Biometrics*, vol. 44, no. 3, pp. 837–845, 1988.",
  "F. X. Diebold and R. S. Mariano, \"Comparing predictive accuracy,\" *Journal of Business & Economic Statistics*, vol. 13, no. 3, pp. 253–263, 1995.",
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

const doc = new Document({
  creator: "Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid",
  title: "An Early-Warning System for Essential-Price Shocks Across Income Quintiles in Pakistan (Sections II-III draft)",
  styles: {
    default: { document: { run: { font: FONT, size: BODY, color: BLACK } } },
    paragraphStyles: [
      heading("Heading1", "Heading 1", 24, { before: 300, after: 140, level: 0 }),
      heading("Heading2", "Heading 2", 22, { before: 220, after: 100, level: 1 }),
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 400, hanging: 260 } }, run: { color: BLACK } } }] },
      { reference: "findings", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 400, hanging: 300 } }, run: { font: FONT, size: BODY, color: BLACK } } }] },
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
