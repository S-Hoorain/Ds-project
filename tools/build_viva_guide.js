// Builds "DS4SG_Viva_Guide_M2_M3.docx": one viva preparation guide for Milestones 2 and 3 (the instructor examines
// both together). For every decision it says what we did, why, which other values or methods we checked (and when),
// and why we did not use the alternatives. It also has the chosen numbers, the methods used and not used, the key
// numbers and a question bank.
// Usage (from a folder where the npm package "docx" is installed, or with NODE_PATH pointing at its node_modules):
//   node tools/build_viva_guide.js DS4SG_Viva_Guide_M2_M3.docx
// The contents list is static (clickable links to bookmarked headings), so no field update is needed in Word.
// Same layout as tools/build_m3_reference_doc.js. Numbers come from notebooks 01-04, reports/tables/ and, for the
// checks made after the M3 submission, from src/models/sensitivity_checks.py (run of 2026-10-26).
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, BorderStyle, LevelFormat, Header, Footer,
  PageNumber, PageBreak, VerticalAlign, TableLayoutType, Bookmark, InternalHyperlink,
} = require("docx");

const OUT = process.argv[2] || "DS4SG_Viva_Guide_M2_M3.docx";
const FONT = "Calibri";
const MONO = "Consolas";
const INK = "1F1F1F", MUTED = "5A5A5A", ACCENT = "1F4E79", HEAD_FILL = "DCE6F1", KEY_FILL = "F2F2F2";
const SIMPLE_FILL = "EAF4EA", DETAIL_FILL = "F7F7F7", CHECK_FILL = "FFF7E0";

// Portrait A4 with 1" margins -> 9026 DXA text width.
const PORTRAIT_W = 11906 - 2 * 1440;

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
const P = (text, opts = {}) => new Paragraph({ children: runs(text, opts), spacing: { after: opts.after ?? 120, before: opts.before ?? 0 }, alignment: opts.align, keepNext: opts.keepNext });
// H1/H2 headings carry a bookmark and are listed in HEADINGS, from which the contents page is built.
const HEADINGS = [];
function heading(t, level) {
  const id = `h${HEADINGS.length + 1}`;
  HEADINGS.push({ id, text: t, level });
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    children: [new Bookmark({ id, children: [new TextRun({ text: t })] })],
    spacing: level === 1 ? { before: 240, after: 160 } : { before: 240, after: 120 }, keepNext: level === 2,
  });
}
const H1 = (t) => heading(t, 1);
const H2 = (t) => heading(t, 2);
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: runs(t, { size: 22, color: ACCENT, bold: true }), spacing: { before: 200, after: 80 }, keepNext: true });
const BUL = (text, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, children: runs(text), spacing: { after: 60 } });
// `list` restarts the numbering: each numbered list in the document gets its own instance.
const NUM = (text, list = 1) => new Paragraph({ numbering: { reference: "steps", level: 0, instance: list }, children: runs(text), spacing: { after: 60 } });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

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
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: HEAD_FILL, size: opts.headSize || 19 })) }),
      ...rows.map((r) => new TableRow({ cantSplit: opts.cantSplit, children: r.map((c, i) => cell(c, widths[i], { size: opts.size || 19, fill: opts.firstFill && i === 0 ? KEY_FILL : undefined, bold: opts.firstBold && i === 0 })) })),
    ],
  });
}

// Two-column card for one decision. A value may be a string or a list of strings.
function card(pairs, keyW = 2100) {
  const w = [keyW, PORTRAIT_W - keyW];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: PORTRAIT_W, type: WidthType.DXA }, columnWidths: w,
    rows: pairs.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v, fill]) =>
      new TableRow({ cantSplit: true, children: [cell(k, w[0], { bold: true, fill: fill || KEY_FILL }), cell(Array.isArray(v) ? v.map((x) => new Paragraph({ children: runs(x, { size: 19 }), spacing: { after: 40 } })) : v, w[1], { fill: fill && fill !== KEY_FILL ? fill : undefined })] })),
  });
}
const spacer = () => new Paragraph({ children: [], spacing: { after: 80 } });

// When a check was made. Every "Other options checked" entry starts with one of these.
const AT = "**At the time:**", AFTER = "**Afterwards (26 Oct):**", NOT = "**Not checked:**";

// ================================================================ CONTENT
// ---------------------------------------------------------------- contributions
const TEAM = [
  ["Syeda Hoorain Imran", "CS", "Scraping and the data pipeline; the models.", ["", "", ""]],
  ["Muhammad Munib Sattar", "SDP", "Problem framing, policy interpretation, fairness and ethics; data curation and analysis.", ["", "", ""]],
  ["Sarah Khalid", "SDP", "Problem framing, policy interpretation, fairness and ethics; data curation and analysis.", ["", "", ""]],
];

// ---------------------------------------------------------------- numbers we chose (Section 3)
const M2_NUMBERS = [
  ["Sample starts 5 Sep 2019 (370 weeks to 1 Oct 2026)", "First week of the weekly SPI on the 2015-16 base, the only version with today's five quintile indices.", "Earlier weekly reports use base 2007-08 (53 items, different quintile bands), so they cannot be joined without splicing.", "fixed by the data"],
  ["Shock = weekly SPI rise of at least 1%", "A big week: the median week moves 0.18%, and 1% is the 85th percentile of quintile-weeks. 13–17% of weeks are shocks, rare but enough to learn from. Round and easy to explain to an official.", "0.5%: 37% of training rows become 'shocks'; 0.75%: 26%; 1.5%: 8% (only 6 test shock weeks); 2%: 4.5% (no shock at all in 2024, 4 test weeks). Cross-validated AUC with the same model settings: 0.60–0.64 at 0.5%, 0.64–0.65 at 1%, 0.66–0.71 (pooled) at 1.5%.", "afterwards"],
  ["Fuel-revision week: petrol or diesel moved by more than 1%", "Fuel prices are set by the government and change in steps; between revisions the average price barely moves.", "232 weeks move by 0.1% or less and only 10 weeks move between 0.25% and 1%, so the cut-off sits in a gap. Cut-offs of 0.25%, 0.5%, 1% and 2% flag 137, 135, 127 and 97 weeks.", "afterwards"],
  ["Fuel reviews on the 1st and 16th", "The government's fortnightly review dates, known in advance.", "64% of SPI weeks containing those days had a fuel revision, against 9% of other weeks.", "at the time"],
  ["Two exchange-rate bad ticks removed", "One-day spikes (1 Aug and 19 Sep 2022) that fully reversed the next day.", "Found by eye on the daily series; with two cases no automatic rule was needed.", "at the time"],
  ["Year-ago value from the 52-week lag", "One year of weekly data back; used only where a report did not print the year-ago value.", "Agrees with the printed value within 0.5 points in 99.7% of 1,842 cases (median difference 0.000).", "at the time"],
  ["Outlier fences: 1.5 and 3 × IQR; |z| above 2 and 3", "The two course rules (Unit 05), each in a mild and a regular version.", "Both computed and compared; masking shown by recomputing the SD without the regular outliers.", "at the time"],
  ["Robust SD = IQR / 1.349", "For a normal distribution the IQR equals 1.349 SD, so this puts the resistant spread on the SD's scale.", "—", "definition"],
  ["EDA signal cut-offs: rupee fell more than 2% in 8 weeks; at least 1 shock in 4 weeks; at least 2 momentum spikes", "Simple round numbers, fixed before looking at the results.", "Rupee: cut-offs of 1, 2, 3 and 5% all give +14 to +23 points (p < 0.001). Recent shocks: at least 1 and at least 2 both significant. Momentum: at least 1 spike is strongest (+14.5 points); ours (2) gives +7.9 (p = 0.04); 3 or more is not significant.", "afterwards"],
  ["Eid ul-Adha window: the 4 weeks before", "About a month of run-up to the festival.", "Windows of 1, 2, 6 and 8 weeks: no effect at any length (all p ≥ 0.3), so 'Eid ul-Adha is not a shock signal' does not depend on the window.", "afterwards"],
  ["8-week rupee change", "Pass-through builds over about seven weeks (Figure E5), so 8 weeks captures most of it; H2 uses the same window.", "On its own each window ranks shocks with AUC 0.58 (1 week), 0.65 (4), 0.67 (8) and 0.68 (13). The 13-week change is slightly stronger but correlated 0.76 with the 8-week one, so only one enters the models.", "at the time (Figure E5); afterwards (AUC)"],
  ["4-week windows (SPI change, recent shocks, component inflation)", "About one month: long enough to show a build-up, short enough to be recent.", "SPI change over 1, 4 and 13 weeks: AUC 0.62, 0.65 and 0.60, so 4 weeks is best. 4-week sums beat single weeks for perishables, staples and utilities; motor fuel is about equal.", "afterwards"],
  ["Momentum rule: weekly spike above 5%, at least 5 spikes, median further rise of at least 5% over 8 weeks", "A 5% weekly jump is large for one item; 8 weeks (two months) is long enough to see whether a rise persists.", "Cut-offs of 3, 5 and 10%: between 3 and 24 items. Onions and potatoes are chosen in all nine versions. At 10% the rule picks petrol and diesel, which are administered steps, not momentum.", "afterwards"],
  ["HAC lags: 4 for weekly regressions; horizon + 2 for k-week windows", "Errors in nearby weeks stay correlated for about a month; overlapping k-week windows share k − 1 weeks.", "H2 with 4 to 16 lags: p = 0.25–0.28. H3 with 1 to 13 lags: food p = 0.001–0.006; energy never narrows the gap (p ≥ 0.90).", "afterwards"],
  ["Redundancy flag: |Spearman ρ| ≥ 0.6", "A common rule of thumb for a strong correlation.", "Not varied. Three pairs flagged: rupee 8 vs 13 weeks (0.76), 4-week SPI change vs recent shocks (0.70), rupee 4 vs 8 weeks (0.65).", "not checked"],
  ["Periods 2019–21, 2022–23 and 2024–26", "The regimes visible in Figure E1: food-driven, the energy and currency crisis, disinflation.", "Not varied; H3 uses the same periods as dummies.", "judgement"],
  ["5% significance level and 95% intervals", "Course convention (Units 06–07).", "—", "convention"],
  ["Five hypotheses", "The rubric asks for 3–5; each comes from an EDA finding.", "—", "rubric"],
];

const M3_NUMBERS = [
  ["Train up to 31 Dec 2024, test 2 Jan 2025 – 24 Sep 2026 (about 75/25 by weeks)", "Fixed in M2 before any model. Training covers whole calendar years for the folds; the test is the newest data and holds two fiscal-year starts (July 2025 and July 2026).", "Ending training in Dec 2023, Jun 2024 or Jun 2025 would put 40%, 32% or 18% of the weeks in the test.", "afterwards"],
  ["9 weeks (45 rows) deleted", "The first 8 weeks have no 8-week rupee change; the last week has no 'next week'.", "—", "fixed by the data"],
  ["K = 4 folds (validation years 2021–24)", "Every full calendar year that has earlier weeks to train on; 2020 would train on only 9 weeks.", "Shuffled K-fold by rows and by weeks: AUC inflated by 0.05–0.14.", "at the time"],
  ["A missed shock costs 5 false alarms", "Evidence on harm: a Q1 shock is not given back (8 weeks later prices are 4.2% above the pre-shock week, against 1.9% around an ordinary week); a typical shock costs up to Rs 355/month, about 8% of Kafaalat; FAO found about 7:1 returns to early action; a false alarm still reaches poor households.", "Ratios 1, 2, 3, 5, 10 and 20. At 1:1 the models never alert in the test; at 10:1 and 20:1 they alert in 448–455 of 455 rows, the same as 'always alert'. Only in the middle range is the alarm selective.", "at the time"],
  ["Alarm thresholds: LR 0.50, KNN 0.12, tree 0.16", "They minimise 1 × FP + 5 × FN on the 2021–24 out-of-fold predictions.", "Every threshold from 0.01 to 0.99.", "at the time"],
  ["LR: C = 0.0001, L2, balanced weights", "Best pooled AUC (0.643); the curve is flat for small C.", "12 values of C from 0.0001 to 100: C ≤ 0.001 within 0.004 of the best; below the grid, C = 0.00003 and 0.00001 within 0.001. L1 gave 0.622, no weights 0.610.", "at the time"],
  ["KNN: k = 100, uniform votes, z-scores", "Peak of the validation curve.", "k from 5 to 250: k = 150 almost tied (0.640); k = 5 overfits (training 0.98, validation 0.56). Distance weights 0.640; Min-Max 0.533.", "at the time"],
  ["Tree: depth 4, leaves of at least 40 rows, no weights", "Best pooled AUC (0.652).", "Depth 3, 4 and 5: 0.649, 0.652, 0.646 (nearly tied). Leaves of 20 or 80: 0.587, 0.597. Balanced weights 0.626.", "at the time"],
  ["Gini impurity (tree); Euclidean distance (KNN)", "scikit-learn defaults; not in the grids.", "Entropy: pooled 0.659, within-year 0.651 (Gini 0.652 and 0.578). Manhattan: pooled 0.670 at k = 150, within-year 0.682 (Euclidean 0.643 and 0.672). Both a little better, so both go into the M4 grids.", "afterwards"],
  ["18 features", "Own history (2), the six H1 signals, three volatile components, three controls and four quintile dummies.", "The full set of 35 M2 features was not tried; overlapping windows were left out because they are strongly correlated.", "judgement"],
  ["Threshold grid step of 0.01", "Fine enough for probabilities between 0 and 1.", "—", "not checked"],
  ["20 permutation repeats in each of 4 folds", "Averages out the randomness of shuffling.", "—", "not checked"],
  ["2,000 bootstrap resamples", "A common size that pins down the 2.5% and 97.5% ends.", "Seeds 1 and 7, and 10,000 resamples, move the ends of the KNN intervals by less than 0.01.", "afterwards"],
  ["Seed 42", "Any fixed number makes results reproducible; 42 is a convention.", "Seeds 0, 1, 7 and 2024: identical test AUCs; cross-validated AUCs move by up to 0.02.", "afterwards"],
];

// ---------------------------------------------------------------- methods used and not used (Section 4)
const M2_METHODS = [
  ["Rebuilding the history from the current PBS site and the Wayback Machine, every file validated", "No consolidated file exists and the old PBS site is offline.", "Downloading by hand; one source only", "Not reproducible or auditable; one source misses 2019–2023."],
  ["Tidy long format (one row per week and group); pivot and melt shown", "One model can learn across all groups with a group dummy (Unit 03).", "A wide table only", "Would need a separate model per group."],
  ["Missing weeks recovered from the next report's official values", "They are official PBS figures, not guesses.", "Mean or median imputation; interpolation; dropping the weeks", "Imputation invents a jump and a fall back; interpolation smooths away real steps; dropping removes Eid weeks (selection bias)."],
  ["Listwise deletion of structural gaps", "Only the first weeks and the last week; nothing to recover.", "Model-based imputation", "Would invent price movements, the thing we forecast."],
  ["Log transform of prices, the SPI and the rupee rate", "Right skew of item prices; multiplicative growth of the index.", "No transform; logging weekly changes", "Raw prices are dominated by expensive items; weekly changes can be negative."],
  ["Min-Max and z-score scaling with training-period statistics", "Asked by the rubric; training statistics prevent look-ahead leakage.", "Full-sample statistics", "Would let the scaling see future price levels."],
  ["Dummy (0/1) encoding with a reference category", "Nominal categories (Unit 04); the reference avoids the dummy-variable trap.", "One numeric code per group", "Forces equal steps between groups and makes Combined a number."],
  ["Resistant and non-resistant statistics side by side", "Heavy tails: a few tariff weeks pull the mean and SD (Unit 05).", "Mean and SD only", "Would describe the shocks, not the typical week."],
  ["Both outlier rules; all outliers kept", "Course rules; every extreme week is a real tariff, fuel or food event.", "Removing or capping outliers", "They are the shocks the early warning must learn."],
  ["Spearman rank correlation", "Resistant to the heavy tails.", "Pearson correlation", "Dominated by a handful of extreme weeks."],
  ["Fisher's exact test", "Some cells are tiny (7 fiscal-year starts).", "Chi-square test", "Unreliable when expected counts are below 5."],
  ["OLS with HAC (Newey–West) errors", "Errors in nearby weeks are correlated.", "Ordinary OLS standard errors", "Too small, so p-values look better than they are."],
  ["Exposure regressions of each quintile on six components", "PBS publishes item impacts only for Q1 and Combined.", "Using only the published impacts", "Would say nothing about Q2–Q5."],
];

const M3_METHODS = [
  ["Chronological train/test split", "Time series: train on the past, test on the future.", "Random stratified split (e.g. 80/20)", "Trains on the future and splits the five rows of one week across train and test."],
  ["Expanding-window CV by calendar year, whole weeks together", "Mimics a real forecaster; every fold has one fiscal-year start, Ramadan and Eid ul-Adha.", "Shuffled K-fold; TimeSeriesSplit with equal blocks", "Shuffling inflates AUC by 0.05–0.14; equal blocks give an uneven calendar and a 45-week first fold."],
  ["Scaling inside each pipeline", "The scaler is learned on each fold's training weeks only.", "The M2 scaled columns", "Scaled on all of 2019–24, so later folds leak into earlier ones."],
  ["Logistic regression, KNN and a shallow tree", "Three different ways of thinking; rubric and lecture methods.", "Ridge/Lasso regression of the size; neural networks; random forests and boosting", "We need a yes/no alarm; 1,350 training rows are too few for a neural network; ensembles are syllabus Week 12, planned for M4."],
  ["Majority-class and persistence benchmarks", "The rubric's naive benchmark, plus the standard naive forecast for a time series.", "A mean-target predictor", "Our target is binary; the majority class is its equivalent."],
  ["Pooled out-of-fold ROC-AUC for selection", "Threshold-free and not affected by the shock rate; one threshold must work in every year.", "Accuracy; mean fold AUC", "Accuracy rewards never alerting (92.3%); mean fold AUC is reported as the second view and M4 reports both."],
  ["Class weights, a cost-based threshold and imbalance-aware metrics", "Handles 17% shocks without fake rows.", "SMOTE or other oversampling; undersampling", "Synthetic rows mix weeks and leak across folds; undersampling throws data away."],
  ["Threshold that minimises expected cost (miss = 5 false alarms)", "The two errors do not cost the same.", "The default 0.5; the F1-maximising threshold", "0.5 is arbitrary; F1 treats both errors alike."],
  ["Three importance measures (standardised coefficients, Gini, permutation)", "Models see features differently; look for agreement.", "Importance on the test period", "Only 35 shock rows from 13 weeks: unstable."],
  ["Odds ratios from an unpenalised logit with week-clustered intervals", "Readable units (per 1% of rupee depreciation).", "Odds ratios from the tuned LR", "The strong penalty pulls every odds ratio towards 1."],
  ["Week-clustered Wald test (in sample) and week-block bootstrap (out of sample)", "A week's five quintile rows are one block of evidence.", "Plain likelihood-ratio test; DeLong test", "Both treat rows as independent: the plain test gives χ² = 94 against 22.4 clustered."],
  ["Q5 − Q1 difference regression for H2", "Gives β_Q5 − β_Q1 directly with one standard error.", "Stacked panel with interactions", "Equivalent, but needs panel HAC errors."],
  ["One pooled model with quintile dummies", "Enough shocks to learn from; lets the base risk differ by quintile.", "One model per quintile", "Only about 41–51 training shocks per quintile; planned for M4 (H4)."],
];

// Methods used from beyond the lecture slides
const BEYOND = [
  ["Expanding-window cross-validation (M3)", "Shuffled K-fold (Week 7) lets the model learn from the future and from sister rows of the same week; nb03 §5 shows it inflates AUC by 0.05–0.14.", "Always train on the past and validate on the next year, like a real forecaster."],
  ["Permutation importance (M3)", "KNN has no coefficients and no Gini importance, but the rubric asks which features drive the models.", "Shuffle one feature in the validation year; the bigger the drop in AUC, the more the model relied on it."],
  ["Standard errors clustered by week (M3)", "The five quintile rows of a week share the same signals; treating them as independent overstates the H1 evidence about four-fold (χ² 94 against 22.4).", "Count each week as one block of evidence, not five rows."],
  ["Spearman rank correlation (M2)", "Unit 05 teaches correlation, but our weekly changes have very heavy tails (kurtosis 14–45), which dominate an ordinary correlation.", "The correlation of the ranks instead of the values: the resistant version, in the spirit of Unit 05's resistant statistics."],
  ["Fisher's exact test (M2)", "Some signal cells are tiny (7 fiscal-year starts), where the chi-square approximation fails.", "The exact probability of a table at least as uneven as ours, if signal and shock were independent."],
  ["Logit likelihood-ratio test (M2 plan, used in M3)", "H1 compares a model with and without the six signals.", "Twice the gain in log-likelihood, compared with a chi-square distribution."],
  ["OLS with Newey–West (HAC) errors (M2, M3)", "Weekly errors are correlated (overlapping windows), so ordinary p-values would be too small.", "Regression is Week 10; HAC widens the standard errors to allow for correlated errors."],
  ["Brier score (M2 plan, used in M3)", "It is the loss in the fairness hypothesis H5; in M3 it shows that LR's probabilities are not calibrated.", "Mean squared error of the predicted probabilities."],
  ["Diebold–Mariano test (M2 plan for M4)", "It will test H5 (are Q1's forecast errors larger than Q5's?).", "A t-test on the weekly difference between two groups' losses, with standard errors that allow for autocorrelation."],
];

// ---------------------------------------------------------------- M2 decisions (Section 5)
const M2_DECISIONS = [
  { group: "Data collection and scope" },
  {
    id: "", title: "Sample: the weekly SPI on the 2015-16 base, 5 Sep 2019 to 1 Oct 2026 (370 weeks)",
    simple: "The 2015-16 version of the weekly SPI, which has the five quintile indices we study, only starts in September 2019. Earlier weekly reports use a different basket and different quintiles, so they cannot simply be joined on.",
    detail: "Before Sep 2019 the weekly SPI used base 2007-08: 53 items instead of 51 and different income bands for the quintiles. Joining (splicing) the two would need assumptions about how each quintile's basket changed, so the M1 proposal ruled it out of scope. M1 had assumed weekly data from 2016 (about 540 weeks); the collection audit found the new base starts in Sep 2019, so the sample is 370 weeks (2,220 quintile-week rows). The year-ago column of each report could push the quintile index back to Sep 2018; that remains an option.",
    checked: `${AT} every PDF was checked for the text "2015-16=100" and old-base files were rejected; all 359 parsed reports confirm the base.`,
    whynot: "Splicing the 2007-08 base (different items and quintile bands); keeping the M1 start date (no such data exist).",
    where: "`manuscript/02_data_collection_audit.md`; notebook 01 §2.1; M2 report Section II",
  },
  {
    id: "", title: "Collection: rebuild the history from the current PBS site and the Wayback Machine, one download stream, every file validated",
    simple: "PBS has no historical file and its old website is gone, so we rebuilt the history week by week from the current site and from archived copies, and checked every file.",
    detail: "The current site lists its files in a JavaScript table (Jul 2023 onward; Excel from Oct 2025); the old site survives only in the Wayback Machine, found through its CDX index. One report per week is chosen by priority (current-site Excel, then PDF, then the archived folders). The downloader waits 1 s between PBS requests and 4 s between archive requests, backs off when throttled and resumes where it stopped; the archive blocks parallel downloads. Each file is checked to be a real PDF or Excel file on the 2015-16 base and logged with a SHA-256 checksum in `manifest.csv`. Result: 359 reports (222 archived PDFs, 137 current-site files); 15 dead links, of which 5 were replaced by archived copies and 10 were mis-dated duplicates.",
    checked: `${AT} 359 of 359 files complete (base year, six-row quintile table, 51 items); in every week the item impacts add up to the reported index change within 0.011 percentage points.`,
    whynot: "Downloading by hand (not reproducible); parallel scraping (the archive refuses connections for minutes).",
    where: "`src/scraping/spi_catalogue.py`, `spi_download.py`, `src/cleaning/parse_spi.py`; notebook 01 §2.1",
  },
  { group: "Cleaning (decisions D1–D5 in `build_master.py`)" },
  {
    id: "D1", title: "Align report dates to the nearest Thursday",
    simple: "The SPI week ends on a Thursday. A few holiday reports were dated a Wednesday or a Saturday, so we moved them to the nearest Thursday to keep a regular weekly grid.",
    detail: "Lags and the 'next week' target need weeks exactly seven days apart. 14 reports were realigned; the printed date is kept in `week_end_reported`. The same rule (`nearest_thursday()`) is used for the item panel, so the two tables line up.",
    checked: `${AT} after alignment the grid has 370 Thursdays, 359 with their own report and one report per week.`,
    whynot: "Keeping the printed dates (gaps of 6 or 8 days break weekly lags); dropping those 14 reports (they are real data).",
    where: "`nearest_thursday()` in `build_master.py`; notebook 01 §2.2",
  },
  {
    id: "D2", title: "Fill weeks without a report from the next report's 'previous week' values",
    simple: "When PBS skipped a week (often an Eid week), the next report still printed that week's official numbers, so we used them instead of guessing.",
    detail: "11 of 370 weeks had no report. Every report prints the previous week's index for all six groups and the previous week's price of every item, so all 11 weeks were recovered from official figures (flag `filled_from_next_report`). The index and the target therefore have no missing weeks. This matters because the gaps are not random: Eid weeks are 8.9% of all weeks but 63.6% of the unpublished weeks, so dropping them would remove the very calendar events H1 is about (selection bias).",
    checked: `${AT} the selection-bias table in notebook 01 §2.3.`,
    whynot: "Mean or median imputation (invents a jump and a fall back, the event we forecast); interpolation (smooths away a real price step); dropping the weeks (selection bias against Eid weeks).",
    where: "notebook 01 §2.2–2.3; `build_master.py`",
  },
  {
    id: "D3", title: "Use PBS's revised value when a later report revises a week",
    simple: "If PBS corrected a number the following week, we used the corrected number, because it is PBS's best estimate.",
    detail: "13 revisions: 12 small revisions of all groups on two dates (12 Sep 2019 and 11 Feb 2021) and one 2.04-point revision of Q1 only (20 Nov 2025), traced to a corrected Q1 electricity tariff. Revised rows are flagged (`revised_by_next_report`).",
    checked: `${AT} every mismatch between a week's value and the next report's previous-week value was listed and explained.`,
    whynot: "The first-published value is what a forecaster sees in real time; with 13 small cases the difference is minor, and the revised vintage is listed as a limitation.",
    where: "`build_master.py`; `data/processed/cleaning_report.txt`",
  },
  {
    id: "D4", title: "Exchange rate: average of the daily PKR/USD rate over the SPI week, two bad ticks removed",
    simple: "Prices are for a Friday-to-Thursday week, so we averaged the daily rupee rate over the same days. Two one-day spikes that reversed the next day were data errors and were removed.",
    detail: "Yahoo Finance `PKR=X` daily quotes, averaged Friday to Thursday; the average also damps day-to-day noise. The bad ticks (1 Aug and 19 Sep 2022) are one-day jumps that fully reverse. The quote is a market rate, not the official SBP interbank rate, which needs a registered account (listed as a limitation).",
    checked: `${AT} the daily series was inspected around both spikes.`,
    whynot: "The Thursday rate alone (one noisy day stands for the week); an automatic spike filter (unnecessary for two cases); the official SBP rate (not available without registration).",
    where: "`src/scraping/fx_rates.py`; `FX_BAD_TICKS` in `build_master.py`",
  },
  {
    id: "D5", title: "Fuel-revision week: petrol or diesel moved by more than 1%",
    simple: "Petrol and diesel prices are set by the government and change in steps, so a move of more than 1% in a week means a price revision.",
    detail: "Between revisions the average SPI petrol and diesel prices barely move. The flag marks 127 of 369 weeks and is a control in H3; it also confirmed the fuel-review calendar (F2).",
    checked: `${AFTER} the cut-off sits in an almost empty part of the distribution: 232 weeks move by 0.1% or less and only 10 weeks move between 0.25% and 1%. Cut-offs of 0.25%, 0.5% and 1% flag 137, 135 and 127 weeks, so the flag hardly depends on the exact value; a 2% cut-off would miss 30 real revisions of 1–2%.`,
    whynot: "OGRA's notification dates (exact, but not yet collected; a planned extension).",
    where: "`FUEL_THRESHOLD_PCT` in `build_master.py`; notebook 01 §2.3",
  },
  { group: "Preparation (decisions P1–P7 in notebook 01 §4)" },
  {
    id: "P1", title: "Complete the item panel on a week × item grid",
    simple: "We built a full table with every item in every week, so a missing week shows up as an empty row that we can then fill from official figures.",
    detail: "370 weeks × 51 items = 18,870 rows; 561 item prices (11 weeks × 51 items) filled with the D2 rule, none missing afterwards. The basket weights were checked to be constant for each item, as the fixed 2015-16 base requires.",
    checked: `${AT} one distinct weight per item; 0 prices missing.`,
    whynot: "Leaving gaps implicit (a missing week would silently become a two-week change).",
    where: "notebook 01 §2.2",
  },
  {
    id: "P2", title: "Set the Combined impacts of 5 Sep 2019 to missing",
    simple: "In the first report PBS printed the poorest quintile's column twice, so that week's national impacts were wrong and we removed them.",
    detail: "Notebook 01 confirms the two columns are identical that week. Only the impact (contribution) columns are affected, not the index.",
    checked: `${AT} in every other week the item impacts add up to the reported change.`,
    whynot: "Keeping wrong numbers.",
    where: "notebook 01 §2.2",
  },
  {
    id: "P3", title: "Year-ago SPI from the group's own value 52 weeks earlier, where not reported",
    simple: "For weeks without a report we took the year-ago index from our own series, 52 weeks back. Where both exist, they agree almost exactly.",
    detail: "Median absolute difference 0.000 points; 99.7% of 1,842 pairs within 0.5 points. 66 rows filled.",
    checked: `${AT} the comparison above.`,
    whynot: "Leaving year-on-year inflation missing in those weeks.",
    where: "notebook 01 §2.3",
  },
  {
    id: "P4", title: "No mean or median imputation; structural gaps deleted listwise when modelling",
    simple: "The remaining gaps exist only because the first weeks have no history and the last week has no next week. We drop those rows when fitting models instead of inventing values.",
    detail: "Remaining gaps are at most 1.4% of rows per variable. In M3 this removes 45 rows (9 weeks): the first 8 weeks (no 8-week rupee change) and the last week (no target). Contribution columns stay missing in unpublished weeks; analyses that use them drop those weeks and say so.",
    checked: `${AT} missing-value tables before and after treatment (notebook 01 §2.3).`,
    whynot: "Mean, median or model-based imputation (the Unit 03 options): in a price series they invent movements; for 9 of 370 weeks deletion loses little.",
    where: "notebook 01 §2.3; `load_model_data()` in M3",
  },
  {
    id: "P5", title: "Log of the SPI, the exchange rate and item prices; weekly % changes kept as they are",
    simple: "Item prices run from a matchbox to an LPG cylinder, so we took logs to tame the skew. The index and the rupee grow by percentages, and logs turn that growth into straight lines.",
    detail: "Item prices: skewness 2.66 → −0.97 and excess kurtosis 7.92 → 1.85 (Figure P1). SPI and exchange-rate levels are not skewed (they trend), but differences of logs are approximately % changes. Weekly % changes can be negative, so they cannot be logged; their heavy tails (kurtosis above 30) are handled with resistant statistics and HAC errors.",
    checked: `${AT} skewness and kurtosis before and after.`,
    whynot: "Logging weekly changes (impossible for negative values); trimming the tails (they are the shocks).",
    where: "notebook 01 §2.4",
  },
  {
    id: "P6", title: "Min-Max and z-score scaling with training-period statistics only",
    simple: "We scaled the predictors with numbers learned only from the training years, so the future never leaks into the past.",
    detail: "Ten continuous predictors in both versions; parameters from the weeks up to 31 Dec 2024, saved in `scaling_parameters.csv`. Test values can fall outside [0, 1] (scaled log SPI reaches 1.107). M3 does not use these columns: the models re-learn the scaling inside each cross-validation fold (B4), because statistics from all of 2019–24 would leak later folds into earlier ones.",
    checked: `${AT} on training rows Min-Max spans [0, 1] and z-scores have mean 0 and SD 1.`,
    whynot: "Scaling on the full sample (look-ahead leakage).",
    where: "notebook 01 §2.4",
  },
  {
    id: "P7", title: "Dummy-encode the group and the SBP decision, with a reference category",
    simple: "Categories become 0/1 columns. One category is left out as the baseline, so the model does not get the same information twice.",
    detail: "Group → `grp_Q1` … `grp_Combined` (reference Combined in M2; Q5 in M3, where Combined is not a model row). SBP decision → `mpc_hike` (12 weeks), `mpc_cut` (13), `mpc_hold` (31); reference: no meeting (314 weeks). Leaving one out avoids the dummy-variable trap (perfect collinearity with the intercept).",
    checked: "",
    whynot: "One numeric code per group (forces equal steps between groups).",
    where: "notebook 01 §2.4",
  },
  { group: "Features (decisions F1–F4 in `build_features.py`)" },
  {
    id: "F1", title: "Shock week = weekly SPI rise of at least 1%",
    simple: "1% in one week is a big jump: a normal week moves about 0.2%. At 1% roughly one week in seven is a shock, rare enough to be special but common enough to learn from.",
    detail: "1% is the 85th percentile of quintile-week changes (median 0.18%, mean 0.30%); 13–17% of weeks depending on the group; 17.2% of training rows. It is round and easy for an official to read, and the same size for every quintile, which is what lets us compare quintiles. It was fixed in M2 before any model existed. It defines the problem; it is not a model setting, so it must not be chosen by model score. The features `shock_now` and `shocks_last_4w` use the same rule.",
    checked: `${AFTER} 0.5% makes 37% of training rows 'shocks' (over a third of weeks, not a rare event); 0.75% gives 26%; 1.5% gives 8% with only 14 test shock rows in 6 weeks; 2% gives 4.5%, no shock at all in 2024 and only 4 test weeks. With the 1% settings kept, cross-validated AUC is 0.60–0.64 at 0.5%, 0.64–0.65 at 1% and 0.66–0.71 (pooled) at 1.5%: larger shocks are not harder to predict, but too few remain to evaluate.`,
    whynot: "A different percentile for each group (a 'shock' would mean a different size for Q1 and Q5, so the comparison would lose meaning); a z-score rule (depends on the SD, which the shocks themselves inflate); predicting the size of the change instead of an alarm (see B9).",
    where: "`SHOCK_THRESHOLD` in `build_features.py`; Figure E3 (dashed line)",
  },
  {
    id: "F2", title: "Fuel-review calendar: the 1st and 16th of each month",
    simple: "Pakistan reviews petrol and diesel prices every two weeks, effective on the 1st and the 16th. Those dates are known in advance, so they can warn of a fuel-price change.",
    detail: "`fuel_review_next_week` = 1 if next week's SPI week contains the 1st or the 16th.",
    checked: `${AT} 64% of SPI weeks containing those days had a fuel revision, against 9% of other weeks.`,
    whynot: "OGRA's notification dates (exact, not yet collected).",
    where: "`build_features.py`",
  },
  {
    id: "F3", title: "Momentum items chosen from training weeks only",
    simple: "Some items keep rising for weeks after a jump (onions, potatoes). We picked them using only the training years, so the choice never sees the test years.",
    detail: "Rule: an item whose weekly spikes above 5% (at least five of them in training) were followed by a median further rise of at least 5% over the next 8 weeks. Result: bananas, chilies powder, onions, potatoes, pulse gram, pulse moong and tea. Features: spikes in these items over the past 4 weeks (`momentum_spikes_4w`) and their weighted price change. M3 limitation: chosen on all of 2019–24, so inside cross-validation it peeks slightly at later folds (B18).",
    checked: `${AFTER} cut-offs of 3%, 5% and 10% give between 3 and 24 items. Onions and potatoes are chosen in all nine combinations, bananas, chilies and the pulses in most. At a 10% spike the rule picks petrol and diesel, which are administered steps rather than momentum, so 10% is too high. The feature's permutation importance in M3 is small, so the exact cut-off has little effect on the results.`,
    whynot: "Choosing items by eye (not reproducible); choosing on all years including the test (leakage).",
    where: "`momentum_items()` in `build_features.py`",
  },
  {
    id: "F4", title: "Component inflation is a Combined-weighted average of item price changes",
    simple: "For each type of item (food, fuel, tariffs …) we computed one weekly price change for the country. Quintiles differ in how much each type weighs in their basket, not in the prices they face.",
    detail: "SPI prices are national averages, the same for every quintile; only the basket weights differ. PBS publishes weights only for the lowest quintile and Combined, so the Combined-weighted average is the common measure. How strongly each quintile reacts is estimated separately (the exposure regressions).",
    checked: "",
    whynot: "A Q1-weighted average (would not suit Q5's rows); separate series for Q2–Q5 (their weights are not published).",
    where: "`build_features.py`",
  },
  { group: "Exploratory analysis and hypotheses" },
  {
    id: "", title: "Summary statistics: resistant next to non-resistant",
    simple: "For every variable we report the mean and SD next to the median and IQR. The gap between them shows how much a few extreme weeks pull the numbers.",
    detail: "Unit 05. Median week 0.17–0.18% against a mean of 0.28–0.31%; the SD is 1.5–1.75 times the robust SD (IQR / 1.349), with excess kurtosis of 14–45. Most weeks are calm; a few carry the jumps, and those are the shocks we forecast.",
    checked: "",
    whynot: "Mean and SD only (dominated by a handful of tariff weeks).",
    where: "notebook 02 §1",
  },
  {
    id: "", title: "Outliers: both course rules, masking shown, all outliers kept",
    simple: "We flagged extreme weeks with both the quartile rule and the z-score rule, showed that big outliers hide each other under the z-score rule, and kept them all because they are real price shocks.",
    detail: "Quartile rule: mild beyond 1.5 × IQR, regular beyond 3 × IQR; z-score rule: mild |z| > 2, regular |z| > 3 (Unit 05). The quartile rule flags more weeks (Q1: 17 mild against 13). Masking: without the regular outliers the SD falls by 25–35% and the count of |z| > 3 rises (Q1 6 → 10, Q5 6 → 19). Each of the 10 largest weekly moves is a gas or electricity tariff change, a fuel revision or a broad staple-food move, so none is a data error.",
    checked: `${AT} the cause of each of the 10 largest weeks (notebook 02 §2).`,
    whynot: "Removing or capping outliers (they are the events the early warning must learn; the ≥ 1% target is already robust to how extreme a shock is).",
    where: "notebook 02 §2; Figure E3",
  },
  {
    id: "", title: "Exposure regressions to recover the quintile baskets",
    simple: "PBS does not publish what drives Q2–Q5's inflation, so we estimated it: each quintile's weekly change regressed on the price change of six item groups.",
    detail: "OLS with HAC errors (4 lags). A coefficient of 10 means 10% of a 1% rise in that component shows up in the quintile's index. Gradient: motor fuel 2.7 (Q1) → 10.7 (Q5); staple food 45 (Q1) against 33 (Q5); R² about 0.8 in every group.",
    checked: "",
    whynot: "Using only the Q1 and Combined impacts (says nothing about Q2–Q5).",
    where: "notebook 02 §3.1",
  },
  {
    id: "", title: "Shocks vs the grind: shares of the weekly variance",
    simple: "We split each week's inflation into its components and asked which components cause the week-to-week ups and downs, as opposed to the slow steady rise.",
    detail: "A component's share of the weekly variance = its covariance with the total weekly change divided by the variance of the total (the shares add up to 100%). For Q1, utility tariffs are 10% of the basket but 61% of the weekly variance; staple food is 57% of the basket and about half of cumulative inflation, but 8% of the variance.",
    checked: "",
    whynot: "Cumulative contributions alone (would miss where the shocks come from).",
    where: "notebook 02 §3.2; Figure E2",
  },
  {
    id: "", title: "Signals: contingency tables with Fisher's exact test and pre-stated cut-offs",
    simple: "For each warning signal we compared how often a shock followed when the signal was on and when it was off, and tested whether the difference could be chance.",
    detail: "Fisher's exact test, because some cells are tiny (7 fiscal-year starts). Cut-offs fixed before looking: rupee fell more than 2% in 8 weeks; at least one shock in the past 4 weeks; at least two momentum spikes in 4 weeks. Results: rupee +12 (Q1) to +19 points (Q5); a recent shock +12 to +13; fiscal-year start 43% against 14%, but from 7 weeks (the interval crosses zero); Ramadan and Eid ul-Adha no effect.",
    checked: `${AFTER} the rupee effect holds at 1%, 2%, 3% and 5% (+14 to +23 points, all p < 0.001); recent shocks at 1 and at 2; momentum is strongest at 1 spike (+14.5, p = 0.002), ours (2) gives +7.9 (p = 0.04), 3 or more is not significant. No Eid ul-Adha window from 1 to 8 weeks shows an effect (all p ≥ 0.3). The M3 models use the counts and changes themselves, not these cut-offs.`,
    whynot: "Chi-square test (unreliable with expected counts below 5); choosing cut-offs after seeing results (cherry-picking).",
    where: "notebook 02 §3.3; Figure E4",
  },
  {
    id: "", title: "Exchange-rate pass-through by horizon (1 to 13 weeks)",
    simple: "To see how a falling rupee feeds into prices over time, we measured the price rise 1, 2 … 13 weeks after a depreciation, for each quintile.",
    detail: "For each horizon k, the cumulative SPI change over weeks t to t+k−1 is regressed on the week-t PKR/USD change (OLS, HAC with k + 2 lags because overlapping windows share k − 1 weeks). Pass-through builds over about seven weeks. Point estimates are larger for Q5 (0.34 against 0.10 after four weeks) but the bands overlap, so M2 left the difference to be tested as H2.",
    checked: `${AT} all horizons from 1 to 13 weeks.`,
    whynot: "One horizon only (would hide the build-up); claiming the Q5 difference from the EDA (the bands overlap).",
    where: "notebook 02 §3.4; Figure E5",
  },
  {
    id: "", title: "Correlations: Spearman, with a redundancy flag at |ρ| ≥ 0.6",
    simple: "We used rank correlations because a few extreme weeks would dominate ordinary ones, and flagged pairs of predictors that carry nearly the same information.",
    detail: "Spearman's ρ uses ranks, so it resists heavy tails. Three pairs reach |ρ| ≥ 0.6: the 8- and 13-week rupee changes (0.76), the 4-week SPI change and recent shocks (0.70), the 4- and 8-week rupee changes (0.65). So only one rupee window enters the M3 models. The 4-week SPI change and recent shocks both stay: one measures the size of the recent rise, the other counts shock weeks, and they belong to different parts of H1 (own history and a signal).",
    checked: "",
    whynot: "Pearson correlation (pulled by a few extreme weeks).",
    where: "notebook 02 §3.5",
  },
  {
    id: "", title: "Hypotheses: five, written as H0/H1 on parameters, each mapped to columns and a planned test",
    simple: "The rubric asks for 3–5 testable hypotheses. Each of ours comes from an EDA finding and names its target, predictors, controls and test in advance.",
    detail: "H1 early warning (logit, likelihood-ratio test; out-of-sample AUC). H2 pass-through larger for Q5 (OLS with HAC, one-sided). H3 rotating burden (gap regression, one-sided t-tests). H4 signals differ by quintile (interactions, likelihood-ratio test; M3–M4). H5 fairness: the model is less accurate for Q1 (Brier score and miss rate, Diebold–Mariano; M4). Directions came from the EDA, so tests are one-sided where M2 stated a direction. Ramadan and Eid ul-Adha are controls, not hypotheses: the EDA showed no index-wide effect, and Eid ul-Adha overlapped the fiscal-year start in 2022–25.",
    checked: "",
    whynot: "The M1 idea 'Q1 faces more inflation' (the data contradict it: 179% for Q1 against 193% for Q5 over the sample), so the narrative became the rotating burden.",
    where: "notebook 02 §4; M2 report Tables 12–13",
  },
];

// ---------------------------------------------------------------- M3 decisions (Section 6)
const M3_DECISIONS = [
  {
    id: "B1", title: "Model the five quintiles only; leave out the Combined index",
    simple: "The national (Combined) index is basically an average of the five quintiles, so including it would repeat the same week's information.",
    detail: "Combined is a weighted average of Q1–Q5. Adding it would give each week six nearly duplicated rows and weight the middle quintiles more. The research question is about quintiles, so rows are quintile-weeks (5 per week; 1,805 rows after deletion).",
    checked: "",
    whynot: "Including Combined (duplicates each week); separate models per quintile (only about 41–51 training shocks per group; left for M4, H4).",
    where: "`load_model_data()` (`GROUPS`)",
  },
  {
    id: "B2", title: "Chronological train/test split, fixed in M2: train up to 2024, test 2025–26",
    simple: "We train on the past and test on the most recent period, like a real forecaster. We do not shuffle.",
    detail: "Train = 270 weeks (31 Oct 2019 – 26 Dec 2024, 1,350 rows); test = 91 weeks (2 Jan 2025 – 24 Sep 2026, 455 rows): 74.8/25.2 by weeks. The boundary was stated in the M2 report before any model existed, so it cannot have been chosen to flatter the results. A year-end boundary keeps whole calendar years for the folds, and the test holds the newest data and two fiscal-year starts. Stratified random splitting was rejected: it would train on 2025 to predict 2022 and split the five sister rows of a week (which share every week-level feature) across train and test.",
    checked: `${AFTER} ending training in Dec 2023, Jun 2024 or Jun 2025 would put 40%, 32% or 18% of the weeks in the test; ours gives 25%, close to the usual 70/30–80/20 range.`,
    whynot: "A random stratified 70/30 or 80/20 split (the rubric example) is invalid for time series; imbalance is handled by B6 instead. Stratified sampling is shown in nb03 §5 to inflate AUC.",
    where: "`TRAIN_END`, `load_model_data()`; nb03 §1",
  },
  {
    id: "B3", title: "Expanding-window CV with one calendar year per fold (K = 4), whole weeks together, no gap",
    simple: "To tune the models we pretend to be in 2021, 2022, 2023 and 2024 in turn: train on everything before that year and test on that year.",
    detail: "Fold k validates on year 2020 + k and trains on all earlier weeks. Calendar years give each block one fiscal-year start, one Ramadan and one Eid ul-Adha (equal 45-week blocks would not). K = 4 because these are all the full years with earlier data: 2020 would train on only 9 weeks (Oct–Dec 2019). A week's five rows stay together. No gap is needed because the target is one week ahead (gap = horizon − 1 = 0). Validation shock rates are 13%, 33%, 20% and 12%, so the folds cover calm and crisis years.",
    checked: `${AT} shuffled K-fold by rows and by whole weeks (nb03 §5): AUCs of 0.70–0.73 instead of 0.58–0.67, inflated by 0.05–0.14.`,
    whynot: "Shuffled stratified K-fold (leaks the future and sister rows); scikit-learn's TimeSeriesSplit with equal blocks (first fold only 45 weeks, uneven calendar coverage).",
    where: "`time_series_folds()`, `VAL_YEARS`; Figure B1",
  },
  {
    id: "B4", title: "Scale inside each model's pipeline: z-scores for LR, continuous features only for KNN, nothing for the tree",
    simple: "Scaling is learned from the training part of each fold only, so the validation data never leak in. Each model gets the scaling it needs.",
    detail: "LR: all 18 features z-scored, so the penalty treats them alike and the coefficients are standardised. KNN: continuous features scaled; 0/1 flags left as they are, so a rare flag (fiscal-year start, z ≈ 7 when on) does not dominate the distances. Tree: splits are cut-offs, so scaling changes nothing. The M2 scaled columns were fitted on all of 2019–24 and would leak later folds into earlier ones, so they are not used.",
    checked: `${AT} z-score against Min-Max for KNN as a grid option: 0.643 against 0.533 pooled AUC. Min-Max suffers from outliers: the heavy tails squeeze ordinary weeks together.`,
    whynot: "The pre-scaled M2 columns (leak inside CV); scaling the flags too (a rare flag would swamp the distance).",
    where: "`make_models()`",
  },
  {
    id: "B5", title: "Select hyperparameters by the ROC-AUC of the pooled out-of-fold predictions",
    simple: "We choose the setting whose predictions, put together across all four validation years, rank shock weeks best, because one alarm threshold must work in every year.",
    detail: "ROC-AUC is threshold-free and not affected by the shock rate, and it is the metric of H1. Pooling matters: an unweighted LR scored 0.65 averaged over folds but only 0.53 pooled, because its probability level followed each fold's base rate. Mean ± SD of the per-fold AUCs is reported for the rubric's 'variance across folds'. Weakness, found in the audit: pooled AUC also rewards telling crisis years from calm ones. The tree's pooled AUC (0.652) beats three of its four yearly AUCs (0.49–0.67). Within years (mean fold AUC) the order is KNN 0.672 > LR 0.651 > tree 0.578 ≈ persistence 0.569, which is the order the test reproduced. We kept the planned rule, because switching after seeing the test would leak the test into model choice; M4 reports both.",
    checked: `${AT} mean fold AUC and its SD for every setting (grid tables).`,
    whynot: "Accuracy (rewards never alerting); mean fold AUC alone (ignores whether probability levels are comparable across years, though it measures within-year ranking cleanly).",
    where: "`grid_search_time_cv()`",
  },
  {
    id: "B6", title: "Handle class imbalance without resampling",
    simple: "Shocks are rare (17% of training rows). Instead of creating fake shock rows, we let the models weight shocks more if that helps, choose the alarm cut-off by cost, and use metrics that are fair to rare events.",
    detail: "Class weights (none or balanced) are a tuning option for LR and the tree; KNN has no weights, so its threshold adapts. Metrics: recall, specificity, F1, ROC-AUC, PR-AUC. Oversampling methods such as SMOTE create synthetic rows by mixing neighbours, which in a time series mixes weeks and can leak across folds.",
    checked: `${AT} LR balanced 0.643 against unweighted 0.610; tree unweighted 0.652 against balanced 0.626.`,
    whynot: "SMOTE or random oversampling (synthetic weeks; leakage); undersampling calm weeks (throws data away).",
    where: "grids in `make_models()`; `best_threshold()`",
  },
  {
    id: "B7", title: "Alarm threshold minimises expected cost, with a missed shock = 5 false alarms; ratios 1–20 tested",
    simple: "Missing a real shock hurts poor families much more than a false alarm costs the government, so we count a miss as five times worse and pick the cut-off with the lowest total cost.",
    detail: "Evidence: a Q1 shock is not given back (8 weeks later Q1 prices are 4.2% above the pre-shock week, against 1.9% around an ordinary week); a typical shock is up to Rs 355/month at the Q1 ceiling (about 8% of the Rs 4,500/month Kafaalat value); coping (eating less, selling assets) is hard to reverse; FAO found about US$7 of return per US$1 of early action. A false alarm is a transfer to poor households, not a pure loss, so 5:1 sits between parity and 7:1. The ratio is a value judgement, which the SDP members should be ready to defend. Thresholds are chosen on 2021–24 out-of-fold predictions, never on the test: LR 0.50, KNN 0.12, tree 0.16.",
    checked: `${AT} ratios 1, 2, 3, 5, 10 and 20 (nb03 §7, Figure B4). At 1:1 the cost-minimising thresholds never alert in the test; at 10:1 and 20:1 they alert in 448–455 of 455 rows, the same as 'always alert'. Only in the middle range is the alarm selective. The ratio was set from the evidence on harm, not from these results.`,
    whynot: "The default 0.5 (arbitrary); the F1-maximising threshold (treats both errors as equally costly); a ratio chosen because it gives good results (tuning on the outcome).",
    where: "`COST_FN`, `best_threshold()`; nb03 §7; Figure B4",
  },
  {
    id: "B8", title: "Listwise deletion of rows with a missing feature or target",
    simple: "The very first weeks cannot have an 8-week exchange-rate change, and the very last week has no 'next week'. We drop those 9 weeks.",
    detail: "45 rows (9 weeks × 5 groups) dropped, as promised in M2 Table 2. The gaps are structural, not random, and imputing them would invent price movements.",
    checked: "",
    whynot: "Mean imputation (would create fake signals).",
    where: "`load_model_data()`",
  },
  {
    id: "B9", title: "Baselines: logistic regression, KNN and a shallow decision tree; benchmarks: majority class and persistence",
    simple: "Three simple models that think differently (a weighted sum, 'similar past weeks' and yes/no rules), plus two no-brain benchmarks that every model must beat.",
    detail: "LR is the model form of H1 (odds ratios, testable coefficients) and works well with a strong penalty on small samples. KNN is an analogue forecast with no assumed shape. The tree gives auditable alarm rules and captures cut-offs and interactions. All three are course methods (KNN Unit 11 and Week 7, LR Week 9, trees Units 08–09, leading to the Week 12 ensembles in M4). The majority class sets the accuracy floor; persistence is the standard naive forecast for a time series. We forecast a yes/no alarm instead of the size of the change because an official needs a decision, and a squared-error regression would be dominated by a few huge tariff weeks.",
    checked: "",
    whynot: "Ridge/Lasso regression of the size of the change (we need an alarm); neural networks (1,350 training rows and 232 shocks; not baselines); random forests and boosting (Week 12, planned for M4).",
    where: "`make_models()`, `make_benchmarks()`",
  },
  {
    id: "B10", title: "Eighteen features in four blocks; one pooled model with quintile dummies (Q5 = reference)",
    simple: "The model sees the group's own recent inflation, the early-warning signals from M2, momentum in the volatile components and a few controls.",
    detail: "Own history (2), the six H1 signals, perishables, utilities and motor-fuel momentum (3), policy rate, Ramadan, Eid ul-Adha, and `grp_Q1`–`grp_Q4`. Only the 8-week rupee change is used, because the 4- and 13-week versions are strongly correlated with it (M2). The dummies let the base shock risk differ by quintile; they turned out close to zero.",
    checked: `${AFTER} on its own the 13-week rupee change ranks shocks slightly better than the 8-week one (AUC 0.680 against 0.668; 4 weeks 0.646, 1 week 0.576), but the two are correlated 0.76 and 8 weeks matches the pass-through timing. The 4-week SPI change beats 1 and 13 weeks (0.652 against 0.619 and 0.598).`,
    whynot: "All 35 M2 features (redundant; every extra feature makes KNN's distances noisier); separate models per quintile (M4, H4).",
    where: "`FEATURES` and the feature blocks in `baseline.py`",
  },
  {
    id: "B11", title: "Grid ranges, extended where the best value sat on an edge; saga solver for LR",
    simple: "We tried wide ranges of settings and widened them when the best setting landed at the edge of the range.",
    detail: "LR's C was extended down to 0.0001; the curve is flat there, so the edge choice is a plateau, not a missed optimum. A stronger penalty only shrinks the coefficients further without changing their direction, so the ranking (all that AUC measures) stays the same, while the probabilities get squeezed towards 0.5 (0.495–0.511 at C = 0.00001), too narrow for the 0.01-step threshold search. KNN's k stops at 250 because the smallest training fold has about 310 rows. Tree leaf size extended to 160. The saga solver fits both the L1 and the L2 penalty of the grid.",
    checked: `${AT} C from 0.0001 to 100 (C ≤ 0.001 within 0.004 of the best; C = 0.00003 and 0.00001 within 0.001, nb03 §4); k from 5 to 250 (k = 100 and 150 nearly tied, 0.643 and 0.640); depth 1–8 (3, 4 and 5 nearly tied, 0.649, 0.652, 0.646); leaf 5–160 (40 clearly best for the unweighted tree: 20 gives 0.587, 80 gives 0.597); L1 0.622 against L2 0.643; distance weights 0.640 against uniform 0.643.`,
    whynot: "Random search (unnecessary for grids of 44–98 settings).",
    where: "`make_models()`; Figure B2; `m3_cv_grid_*.csv`",
  },
  {
    id: "B12", title: "Three feature-importance measures; permutation importance on the validation folds; odds ratios from an unpenalised logit",
    simple: "Different models 'see' features differently, so we use three ways of measuring importance and look for agreement.",
    detail: "Standardised LR coefficients (comparable because z-scored), tree Gini importance, and permutation importance for all three models (it also works for KNN). Permutation importance uses the 2021–24 validation folds, so the test period is not used to judge features. The tuned LR is so shrunk that its raw coefficients are tiny, so we show them relative to the largest and take odds ratios in natural units from an unpenalised logit with week-clustered intervals.",
    checked: `${AT} the three measures agree that the rupee and recent momentum lead.`,
    whynot: "Permutation importance on the test (only 35 shock rows from 13 weeks: unstable); odds ratios from the tuned LR (pulled towards 1).",
    where: "nb03 §9; `cv_permutation_importance()`",
  },
  {
    id: "B13", title: "H1: week-clustered Wald test in sample; week-block bootstrap out of sample (replacing the DeLong test)",
    simple: "The five quintile rows of a week are not five independent pieces of evidence, so our tests treat each week as one block.",
    detail: "Plain likelihood-ratio test χ²(6) = 94 against the clustered Wald χ²(6) = 22.4 (p = 0.001): clustering cuts the evidence about four-fold, but H0 is still rejected in sample. Out of sample, M2 had planned the DeLong test, which also assumes independent rows. We resample whole test weeks instead (bootstrap and cluster sampling, Unit 04): the 95% interval for the AUC gain is −0.08 to +0.10, and 45% of resamples show no gain (p = 0.45).",
    checked: `${AFTER} the bootstrap itself is stable: with seeds 1 and 7, or 10,000 instead of 2,000 resamples, the ends of the KNN test interval move by less than 0.01.`,
    whynot: "The plain likelihood-ratio test alone (overstates the evidence); the DeLong test (assumes independent rows and is hard to check by hand).",
    where: "nb03 §10; `fit_logit()`, `week_block_bootstrap()`",
  },
  {
    id: "B14", title: "H2: a Q5 − Q1 difference regression on the training period, with HAC errors",
    simple: "Both groups face the same exchange rate each week, so we look at the difference between their price rises and ask whether it grows when the rupee falls.",
    detail: "The slope of (next-8-week SPI change of Q5 minus Q1) on the past 8-week rupee change equals β_Q5 − β_Q1, with one HAC standard error (horizon + 2 lags). Training weeks only, and only windows ending by 31 Dec 2024, so no 2025 price enters.",
    checked: `${AT} horizons of 4, 8 and 13 weeks, with and without controls, training and full sample: every one-sided p ≥ 0.24. ${AFTER} 4, 8, 10 or 16 HAC lags give p = 0.25–0.28.`,
    whynot: "A stacked panel with interactions (equivalent, but needs panel HAC errors).",
    where: "nb04 §1",
  },
  {
    id: "B15", title: "H3 tested as pre-stated; the component split reported as exploratory",
    simple: "We tested exactly the hypothesis written in M2 first. When energy did not behave as expected, we looked deeper, but we label that deeper look as a new idea, not a proven result.",
    detail: "β_food = 0.12 (p = 0.003) supports the food part; β_energy = +0.04 (p = 0.92 for < 0) does not support the energy part. Splitting energy shows motor fuel (−0.07) and LPG (−0.03) narrow the gap, while utility tariffs point the other way (+0.03, p = 0.10, not significant; the 'for Q1' tariff slabs weigh heavily in Q1's basket). Because the split was chosen after seeing the result, it is a hypothesis for M4 (this avoids p-hacking). Caveat: the Q1 − Q5 gap is built from the same item price changes weighted by each basket (food about 57% of Q1's estimated basket against 43% of Q5's; motor fuel about 3% against 11%), so the regression partly recovers known weight differences. The coefficients are descriptive, not causal.",
    checked: `${AFTER} with 1 to 13 HAC lags the food coefficient stays significant (p = 0.001–0.006) and energy never narrows the gap (p ≥ 0.90).`,
    whynot: "Replacing H3 after the fact (HARKing: hypothesising after the results are known).",
    where: "nb04 §2",
  },
  {
    id: "B16", title: "The test period is used once; results reported honestly",
    simple: "We looked at the test results only after every choice was fixed, and we report that the models did not beat 'never alert' in 2025–26 instead of re-tuning until they did.",
    detail: "All tuning, thresholds and the cost ratio come from 2019–24 data; the cost evidence also uses training weeks only. The calm test period (the shock rate halved) is a real finding: thresholds learned in crisis years over-alert in calm years. Adjusting the thresholds to the test would be leakage.",
    checked: "",
    whynot: "Re-tuning on the test set (invalid).",
    where: "nb03 §6–§7",
  },
  {
    id: "B17", title: "The driver of a shock = the items with the largest upward PBS impact that week",
    simple: "To explain a missed shock we name the items that pushed prices up most that week.",
    detail: "Uses PBS item impacts (percentage points of the Combined SPI change); for unpublished weeks, weight × % change. Largest positive impact, not largest absolute: in July 2026 petrol fell 20% while tomatoes rose 125%, and the tomatoes caused the shock.",
    checked: "",
    whynot: "Largest absolute impact (would name falls as drivers).",
    where: "nb03 §8",
  },
  {
    id: "B18", title: "Disclosed limitation: momentum items were chosen on all training years",
    simple: "One feature was designed in M2 using all of 2019–24; inside cross-validation it has a tiny peek at later folds (never at the test).",
    detail: "The seven momentum items behind `momentum_spikes_4w` were picked on weeks up to 2024. Within CV that is a mild look-ahead; its permutation importance is small, so the effect is minor. Fixing it fully would mean re-selecting the items inside every fold (planned if the feature stays in M4).",
    checked: "",
    whynot: "Re-selecting inside each fold (more code, small expected effect).",
    where: "nb03 §2 checklist",
  },
  {
    id: "B19", title: "Reproducibility: shared module, fixed seed, script = notebook",
    simple: "Anyone can re-run everything and get the same numbers.",
    detail: "Seed 42 for the tree, the solver and the bootstrap; data paths relative to the project root; the script and the notebook call the same functions and their predictions match exactly; models saved with the scikit-learn version in the model card. 42 is only a convention: what matters is that the seed is fixed.",
    checked: `${AFTER} seeds 0, 1, 7 and 2024 give identical test AUCs; cross-validated AUCs move by up to 0.02 (ties between equally good tree splits, and LR's stochastic solver).`,
    whynot: "",
    where: "`SEED`; `train_baselines.py`; `model_card.json`",
  },
  {
    id: "B20", title: "Two settings left at their defaults: Gini impurity for the tree, Euclidean distance for KNN",
    simple: "We did not tune the tree's split measure or KNN's distance; we used the standard defaults. A check made after the submission shows the alternatives would have scored a little higher in cross-validation, so they go into the M4 grids.",
    detail: "Units 08–09 teach both Gini and entropy, and Unit 11 teaches more than one distance. Gini and entropy usually build similar trees, and Euclidean is the standard distance, so we left both out of the grids to keep them small. We have not looked at the test with either alternative, and we will not change the submitted M3 models now: choosing with hindsight after seeing the test would be leakage.",
    checked: `${AFTER} entropy: best pooled AUC 0.659 (depth 3) and within-year 0.651, against 0.652 and 0.578 for Gini. Manhattan distance: best pooled 0.670 (k = 150) and within-year 0.682, against 0.643 and 0.672 for Euclidean.`,
    whynot: "Changing the submitted models after the test has been seen.",
    where: "`src/models/sensitivity_checks.py`, section 7",
  },
];

// ---------------------------------------------------------------- key numbers (Section 7)
const M2_KEY = [
  ["Reports", "359 of 370 weeks (222 archived PDFs, 137 current-site files); 15 dead links"],
  ["Cleaning counts", "11 weeks recovered (D2); 14 reports realigned (D1); 13 revisions (largest 2.04 points, Q1, 20 Nov 2025); 2 bad ticks; 127 of 369 fuel-revision weeks"],
  ["Selection bias", "Eid weeks: 8.9% of all weeks, 63.6% of unpublished weeks"],
  ["Datasets", "2,220 rows (370 weeks × 6 groups); model-ready 70 columns; features 105 columns (35 features); item panel 18,870 rows (370 × 51)"],
  ["Missing data", "before treatment 25 of 44 columns had gaps, none above 3.24%; after, at most 1.4% per variable (structural)"],
  ["Log transform", "item prices: skewness 2.66 → −0.97, kurtosis 7.92 → 1.85"],
  ["Weekly change", "median 0.17–0.18%, mean 0.28–0.31%; SD = 1.5–1.75 × robust SD; excess kurtosis 14–45; 1% = 85th percentile"],
  ["Outliers (Q1)", "17 mild by IQR against 13 by |z| > 2; |z| > 3: 6 → 10 after unmasking (Q5: 6 → 19)"],
  ["Shock rates", "full sample Q1 14.1%, Q5 13.2%; about 25% of weeks in 2022–23"],
  ["Cumulative inflation", "Sep 2019 – Oct 2026: Q1 179%, Q5 193%; 2019–21: Q1 38.8% vs Q5 33.9%; 2022–23: 74.0% vs 83.1%"],
  ["Exposure", "motor fuel 2.7 (Q1) → 10.7 (Q5); staple food 45 vs 33; R² about 0.8"],
  ["Shocks vs grind (Q1)", "utility tariffs 10% of the basket, 61% of weekly variance; staple food 57% and 8%; perishables 28% of the variance"],
  ["Signals", "rupee down > 2% in 8 weeks: +12 points (Q1), +19 (Q5); a recent shock +12 to +13; fiscal-year start 43% vs 14% (7 weeks); fuel review +6 for Q5, +1 for Q1"],
  ["Pass-through (EDA)", "after 4 weeks Q1 0.10, Q5 0.34 per 1% (bands overlap)"],
  ["Redundant pairs", "rupee 8 vs 13 weeks 0.76; SPI 4-week change vs recent shocks 0.70; rupee 4 vs 8 weeks 0.65"],
  ["Momentum items", "bananas, chilies powder, onions, potatoes, pulse gram, pulse moong, tea"],
];

const M3_KEY = [
  ["Rows after deletion", "1,805 quintile-weeks (45 rows / 9 weeks dropped)"],
  ["Train / test", "270 weeks (1,350 rows) / 91 weeks (455 rows); 74.8% / 25.2%"],
  ["Shock rate", "17.2% train (232 rows) / 7.7% test (35 rows, 13 distinct weeks)"],
  ["Validation years", "2021 (13% shocks), 2022 (33%), 2023 (20%), 2024 (12%)"],
  ["Selected LR", "C = 0.0001, L2, balanced; pooled CV AUC 0.643; mean 0.651 ± 0.053; threshold 0.50"],
  ["Selected KNN", "k = 100, uniform, z-score; pooled 0.643; mean 0.672 ± 0.080; threshold 0.12"],
  ["Selected tree", "depth 4, leaf ≥ 40, unweighted; pooled 0.652; mean 0.578 ± 0.082; threshold 0.16"],
  ["Benchmarks (CV)", "persistence pooled 0.584 (within-year 0.569); majority 0.467 pooled (0.500 per fold)"],
  ["Shuffled K-fold inflation", "+0.05 (LR) to +0.14 (tree): 0.70–0.73 vs 0.58–0.67"],
  ["Test AUC [95% CI]", "KNN 0.68 [0.47, 0.83]; LR 0.57 [0.35, 0.76]; tree 0.54 [0.43, 0.67]; persistence 0.47"],
  ["KNN vs others (paired, test)", "KNN − LR +0.11 [+0.02, +0.22]; KNN − tree +0.14 [−0.04, +0.29]"],
  ["Test recall / false alarms", "KNN 20/35, 133 FP; tree 10/35, 91 FP; LR 6/35, 37 FP"],
  ["Test accuracy", "majority 92.3% (catches nothing); KNN 67.5%; LR 85.5%; tree 74.5%"],
  ["Brier (test)", "KNN 0.070, tree 0.078, majority 0.080, LR 0.238"],
  ["Cost 2021–24 (5:1)", "33–39% below never-alert; 18–26% below always-alert"],
  ["Cost test (5:1)", "4–23% above never-alert (LR 1.04, KNN 1.19, tree 1.23)"],
  ["Q1 shock size", "median 1.6%, mean 2.0%; 4.2% above the pre-shock week 8 weeks later (ordinary week: 1.9%); Rs 355/month ≈ 8% of Kafaalat"],
  ["Top 5 drivers (permutation ΔAUC)", "perishables inflation 0.023; recent shocks 0.021; 4-week SPI change 0.020; rupee 8-week change 0.018; motor-fuel inflation 0.011"],
  ["Rupee and fiscal year", "rupee: LR weight 1.00, Gini 0.45, odds ratio 1.11 per 1%; fiscal-year start odds ratio 5.3 (5 fiscal years, CI 1.4–19.5)"],
  ["July in the test", "4 of 13 shock weeks (14 of 35 shock rows); only 1 in the week containing 1 July"],
  ["H1", "in sample Wald χ²(6) = 22.4, p = 0.001 (LR χ² = 94); test AUC 0.554 → 0.561, bootstrap 95% CI −0.08 to +0.10, p = 0.45"],
  ["H2", "pass-through ≈ 0.21 (Q1) vs 0.22 (Q5) per 1% over 8 weeks; δ = 0.04, p = 0.27"],
  ["H3", "β_food = 0.12 (p = 0.003); β_energy = +0.04 (p = 0.92); split R² 0.16 → 0.38"],
];

// ---------------------------------------------------------------- question bank (Section 8)
const Q_NUMBERS = [
  ["[M2] Why is a shock week a 1% rise? Did you try other numbers?", "A normal week moves about 0.2%, so 1% is a big jump: the 85th percentile, 13–17% of weeks. It is rare enough to mean something and frequent enough to learn from, and the same size for every quintile, so we can compare them. We fixed it in M2 before modelling. We did not compare thresholds at the time; preparing for this viva we checked 0.5% to 2%. At 0.5% over a third of weeks become 'shocks'; at 2% there is no shock at all in 2024 and only 4 in the test. The threshold defines the problem, so we would not pick it by model score."],
  ["[M2] Why 1% for a fuel revision?", "Fuel prices are administered and move in steps. Between revisions the average barely moves: 232 weeks move by 0.1% or less and only 10 weeks fall between 0.25% and 1%, so any cut-off in that range flags almost the same weeks (checked afterwards)."],
  ["[M2] Why the 1st and the 16th?", "They are the government's fortnightly fuel-price review dates. 64% of SPI weeks containing them had a revision, against 9% of other weeks."],
  ["[M2] Why an 8-week window for the rupee, not 4 or 13?", "Figure E5 shows pass-through building over about seven weeks, so 8 weeks captures most of it. The 4-, 8- and 13-week changes are strongly correlated, so only one goes into the models. Checked afterwards: on its own the 13-week change ranks shocks slightly better (0.68 against 0.67), but the difference is small and 8 weeks matches H2."],
  ["[M2] Why 4-week windows for momentum and recent shocks?", "About one month: long enough to show a build-up, short enough to be recent. Checked afterwards: the 4-week SPI change ranks shocks better than the 1- or 13-week change (0.65 against 0.62 and 0.60)."],
  ["[M2] Why 4 weeks before Eid ul-Adha?", "About a month of run-up. It made no difference: checked afterwards, windows of 1 to 8 weeks all show no effect, which is why Eid ul-Adha is a control and not a hypothesis."],
  ["[M2] How did you pick the momentum items, and why 5%?", "Items whose weekly spikes above 5% were followed by a median further rise of at least 5% over 8 weeks, on training weeks only. 5% is a large jump for one item. Checked afterwards: 3–10% cut-offs give 3 to 24 items, onions and potatoes always; at 10% the rule picks petrol and diesel, which are price steps, not momentum."],
  ["[M2] Why 1.5 × and 3 × IQR, and |z| > 2 and 3?", "These are the course rules (Unit 05), mild and regular. We used both because the quartile rule is resistant and the z-score rule is not; comparing them shows masking."],
  ["[M2/M3] How did you choose the HAC lags?", "4 lags for weekly regressions, about a month of correlated errors; horizon + 2 for k-week windows, because overlapping windows share k − 1 weeks. Checked afterwards: H2 and H3 conclusions do not change with 1 to 16 lags."],
  ["[M3] Why train up to 2024 and test on 2025–26? Why not 80/20?", "It is a time series, so the split must be by date, and we fixed the boundary in M2 before any model. A year end keeps whole calendar years for the folds and gives about 75/25, close to the usual ratios; the test is the newest data and contains two fiscal-year starts."],
  ["[M3] Why K = 4?", "One fold per calendar year 2021–2024, so each validation block has one fiscal-year start, Ramadan and Eid. These are all the full years with earlier data to train on: 2020 would train on only 9 weeks (Oct–Dec 2019)."],
  ["[M3] Why is a miss worth five false alarms? Who decided?", "It is a value judgement, made on evidence: a Q1 shock is not given back (4.2% higher 8 weeks later, against 1.9%), it costs up to Rs 355/month (about 8% of Kafaalat), coping is irreversible, and FAO found about 7:1 returns to early action. A false alarm still reaches poor families, so 5:1 is below 7:1. We tested 1 to 20: at 1:1 the models never alert; at 10:1 and above they alert almost every week."],
  ["[M3] Explain the C you chose.", "C is the inverse of the penalty strength. C = 0.0001 means a very strong L2 penalty: coefficients are shrunk heavily. Weaker penalties fit training weeks better (AUC 0.86) but validate worse (0.56): overfitting. The curve is flat for C ≤ 0.001."],
  ["[M3] C = 0.0001 is the smallest value in your grid. Would a stronger penalty do better?", "No. We checked C = 0.00003 and 0.00001 on the same folds: both AUCs change by at most 0.001. A stronger penalty only shrinks the coefficients further without changing their direction, so the ranking cannot improve, and the probabilities get squeezed towards 0.5 (0.495–0.511), too narrow for choosing a threshold. The optimum at the edge is a plateau."],
  ["[M3] Why k = 100 for KNN?", "Small k overfits (k = 5: training AUC 0.98, validation 0.56). Validation AUC peaks around 100–150 neighbours (0.643 and 0.640), then falls as the forecast becomes too smooth."],
  ["[M3] Why depth 4 and leaves of 40?", "Best pooled AUC. Depths 3 to 5 are nearly tied (0.649–0.652); the leaf size matters more: 20 or 80 rows give 0.587 and 0.597. Small leaves overfit; large leaves cannot form useful rules."],
  ["[M3] Why seed 42?", "Any fixed number would do; fixing it makes the results reproducible, and 42 is a convention. Checked afterwards: other seeds give identical test AUCs and move cross-validated AUCs by at most 0.02."],
  ["[M3] Why 2,000 bootstrap resamples?", "Enough to pin down the 2.5% and 97.5% ends. Checked afterwards: other seeds and 10,000 resamples move the interval ends by less than 0.01."],
  ["[M3] Why these 18 features?", "Own history, the six H1 signals from M2, momentum in the three volatile components, three controls and the quintile dummies. Overlapping windows were left out because they are strongly correlated, and extra features make KNN's distances noisier."],
];

const Q_METHODS = [
  ["[M2] Why not fill the missing weeks with the mean or by interpolation?", "Each report prints the previous week's official values, so we recovered all 11 weeks from PBS's own figures. A mean would invent a jump and a fall back; interpolation would smooth away a real price step. Dropping them would be worse: Eid weeks are 63.6% of the missing weeks."],
  ["[M2] Why keep the outliers?", "They are real: every one of the 10 largest weeks is a tariff change, a fuel revision or a staple-food move. They are the shocks we want to forecast. Instead of removing them we use resistant statistics, HAC errors and a binary target."],
  ["[M2] Why Spearman and not Pearson?", "Spearman uses ranks, so a few extreme weeks cannot dominate it. Our weekly changes have very heavy tails (kurtosis 14–45)."],
  ["[M2] Why Fisher's exact test and not chi-square?", "Some cells are tiny: there are only 7 fiscal-year-start weeks. The chi-square approximation needs expected counts of about 5 or more; Fisher's test is exact."],
  ["[M2] Why HAC standard errors?", "Errors in nearby weeks are correlated, especially with overlapping windows. Ordinary standard errors would be too small and the p-values too optimistic."],
  ["[M2] Why log prices but not weekly changes?", "Item prices are right-skewed (2.66) and the index grows by percentages, so logs help. Weekly changes can be negative, so they cannot be logged; we handle their tails with resistant statistics."],
  ["[M2] Why both Min-Max and z-score?", "The rubric asks for scaling, and different models need different scales (Min-Max keeps [0, 1], z-scores centre on 0). In M3 the choice became a tuning option: z-scores won for KNN (0.64 against 0.53) because outliers squeeze Min-Max."],
  ["[M3] Why didn't you use a random 80/20 stratified split?", "Our data are a time series. A random split would train on later weeks to predict earlier ones and put sister quintile rows of the same week on both sides. We split by date and handle imbalance with class weights, a cost-based threshold and imbalance-aware metrics."],
  ["[M3] What would shuffled K-fold have shown?", "AUCs of 0.70–0.73 instead of 0.58–0.67: inflated by sister rows of the same week and by learning from the future."],
  ["[M3] Why these three models? Why not a random forest or a neural network?", "LR, KNN and trees are course methods and think differently (weighted sum, similar past weeks, yes/no rules). Ensembles are Week 12 and planned for M4 under the same protocol. A neural network needs far more than 1,350 training rows and 232 shocks."],
  ["[M3] Why predict a yes/no shock instead of the size of the change?", "An official needs a decision (top up or not), and the rubric's metrics and costs are for classification. A regression on the size would be dominated by a few huge tariff weeks."],
  ["[M3] Why not SMOTE?", "SMOTE creates synthetic rows by mixing neighbouring rows. In a time series that mixes weeks and can leak information across folds. Class weights and a cost-based threshold handle the imbalance without fake data."],
  ["[M3] Why ROC-AUC for tuning and not accuracy?", "Accuracy rewards never raising an alarm (92% in the test). AUC measures ranking, is threshold-free and is not affected by the shock rate."],
  ["[M3] M2 promised a DeLong test for H1. Why a bootstrap?", "DeLong treats the 455 test rows as independent, but the five quintile rows of a week share the same signals. Resampling whole weeks (bootstrap and cluster sampling, Unit 04) keeps them together, gives a 95% interval (−0.08 to +0.10) and a p-value (0.45), and is easy to check by hand."],
  ["[M3] Why Gini and not entropy? Why Euclidean distance?", "We used the defaults and did not tune them. Checked afterwards, entropy and Manhattan distance score a little higher in cross-validation (tree within-year 0.651 against 0.578; KNN pooled 0.670 against 0.643). We will not change the submitted models after seeing the test, but both go into the M4 grids. Say this honestly if asked."],
  ["[M3] Which methods were not in the lecture slides, and why?", "Expanding-window CV (shuffled K-fold leaks the future, inflating AUC by 0.05–0.14), permutation importance (KNN has no coefficients or Gini importance) and standard errors clustered by week (a week's five rows are not independent). From M2: Spearman correlation (the resistant version of correlation, because of the heavy tails) and Fisher's exact test (tiny cells). HAC errors, the logit likelihood-ratio test and the Brier score were also in the M2 plan."],
];

const Q_WAY = [
  ["[M2] Why scale with training-period statistics only? And why don't the M3 models use those columns?", "Statistics from the whole sample would let the scaling see future price levels. In M3 even that is not enough: inside cross-validation the 2019–24 statistics would leak later folds into earlier ones, so each model re-learns its scaling inside every fold."],
  ["[M2] Why choose the momentum items on training weeks only?", "Choosing them on all years would use the test period to design a feature. It is still a mild peek inside the cross-validation folds, which we disclosed (M3 limitation)."],
  ["[M3] How does your cross-validation avoid leakage?", "Each fold trains only on weeks before its validation year; whole weeks stay together; scaling is fitted inside the pipeline on the training part only; the test period is never used for tuning or thresholds."],
  ["[M3] Why keep the five quintile rows of a week together?", "They share every week-level signal and usually move together. Splitting them would let the model 'see' a validation week through its sister rows."],
  ["[M3] What is 'pooled' AUC, and what is its weakness?", "One AUC over the out-of-fold predictions of all four years together. Because the system uses one threshold for all years, probabilities must mean the same in every year; pooled AUC checks that, the per-fold average does not. Its weakness: it also rewards telling crisis years from calm ones (the tree's pooled AUC beats three of its four yearly AUCs)."],
  ["[M3] Why choose the threshold on 2021–24 and not on the test?", "A threshold chosen on the test would be tuned on the answers. The 2021–24 out-of-fold predictions are honest forecasts made without seeing those weeks."],
  ["[M3] Why cluster standard errors by week?", "The five quintile rows of a week share the same signals, so they are not independent; the plain test (χ² = 94) overstates the evidence about four-fold against the clustered 22.4."],
  ["[M3] Why one pooled model and not one per quintile?", "Each quintile has only about 41–51 training shocks, too few for its own model. The pooled model learns from all of them and lets the base risk differ through quintile dummies. Separate models are the H4 question for M4."],
  ["[M3] Why does KNN need scaling and the tree not?", "KNN uses distances, so a feature measured in large units would dominate. A tree only asks 'is x above a cut-off?', which no rescaling changes."],
  ["[M3] Why test H3 exactly as written, and only then split the components?", "Testing the pre-stated version first keeps the test honest. The split was chosen after seeing that energy did not narrow the gap, so we report it as exploratory, a hypothesis for M4, to avoid p-hacking."],
];

const Q_RESULTS = [
  ["[M2] Your M1 expected the poor to face more inflation. What did the data show, and what did you change?", "Over the whole sample Q1's cumulative inflation (179%) was below Q5's (193%). But it depends on the period: Q1 faced more in the food-driven 2019–21 period and less in the 2022–23 energy and currency crisis. So we changed the narrative to the rotating burden and the early-warning system for each quintile."],
  ["[M2] What is 'shocks vs the grind'?", "Staple food is 57% of Q1's basket and about half of its cumulative inflation, but only 8% of the week-to-week variance: a slow grind. Utility tariffs are 10% of the basket but 61% of the variance: the shocks. An early warning must watch tariffs and perishables; cost-of-living support must address the grind."],
  ["[M2→M3] The EDA suggested faster pass-through for Q5, but H2 found none. Why?", "The EDA used single-week rupee moves without controls, and its bands overlapped. The formal test used the 8-week change, the planned controls and HAC errors on the training period: 0.21 for Q1 against 0.22 for Q5 (p = 0.27). We reported H2 as not supported."],
  ["[M3] Your tree had the best CV score but the worst test score. Why?", "Pooled AUC rewards regime tracking, and the tree's first split (rupee down more than 8% in 8 weeks) recognises the 2022–23 crisis. Within years its AUC is only 0.578, about persistence (0.569). The test is one calm regime, so only within-year ranking counts, and the within-year order (KNN > LR > tree) is the test order. We did not re-select, because that would leak the test into model choice."],
  ["[M3] Is KNN your best model?", "It had the highest test AUC (0.68), but we do not call it the best. On the same resampled test weeks it beat LR (+0.11, 95% CI +0.02 to +0.22) but not clearly the tree (+0.14, −0.04 to +0.29), and the test has only 13 shock weeks."],
  ["[M3] Precision is only 0.13. Is the model useless?", "Precision depends on how common shocks are. In 2025–26 only 7.7% of rows were shocks, so most alarms are false even with decent ranking (AUC 0.68). In 2021–24 precision was 0.26–0.38."],
  ["[M3] Why did no model beat 'never alert' in the test?", "The shock rate halved. Thresholds learned when shocks were common over-alert when they are rare. The ranking still works (KNN AUC 0.68), so recalibration and retraining (M4–M5) are the fix."],
  ["[M3] Which features matter most?", "By permutation importance: perishables inflation, recent shocks, the 4-week SPI change, the 8-week rupee change and motor-fuel inflation. The rupee has the largest LR weight and is the tree's first split (odds ratio 1.11 per 1%). The fiscal-year start multiplies the odds by about 5, but from only five fiscal years."],
  ["[M3] Was H1 supported?", "In sample yes (clustered Wald p = 0.001). Out of sample in 2025–26 no (bootstrap p = 0.45). The early warning works in turbulent periods but added nothing in a calm one."],
  ["[M3] Isn't the H3 result built in?", "Partly, yes. The Q1 − Q5 gap is made from the same item price changes weighted by each basket, and food weighs more in Q1's (about 57% against 43%), so a food price rise widens the gap partly by construction. We read the H3 coefficients as descriptive, not causal."],
  ["[M3] What are the systematic errors?", "First waves of a new shock, administered utility tariffs and perishable supply spikes are missed; false alarms follow past shocks."],
];

const Q_PROCESS = [
  ["Did you check other values when you chose X?", "Use Section 3. Say whether it was checked at the time or afterwards, give one number, and say why the final value stays. If it was never checked, say so and give the reason for the value."],
  ["If you could redo one decision, which would it be?", "Select models by within-year AUC as well as pooled AUC (pooled flattered the tree); tune the tree's split measure and KNN's distance; re-select the momentum items inside each fold. All three are in the M4 plan."],
  ["What was the hardest data problem?", "Rebuilding seven years of weekly reports from two websites, one of them only in an archive, and reading misaligned PDF tables. Then the 11 unpublished weeks, mostly around Eid, which we recovered from the next reports instead of dropping."],
  ["What did each of you do?", "Use Section 2. Each member names their own area, one decision they argued for, one problem they solved and one check they made."],
  ["What are the main limitations?", "Urban-only SPI (17 cities: rural poor invisible); 2015-16 basket weights; a market exchange-rate quote; item impacts only for Q1 and Combined; only seven fiscal-year starts; a weak signal (models underfit); uncalibrated probabilities; a small test set (13 shock weeks); no data on tariff decisions; revised data vintage."],
  ["Can you show the code that prevents leakage?", "`time_series_folds()` (folds by year, asserted in nb03 §2), the scaler inside each pipeline in `make_models()`, and `best_threshold()` applied to out-of-fold predictions only."],
  ["How do you know the work is reproducible?", "Fixed seed 42; `python src/models/train_baselines.py` gives exactly the same test predictions as the notebook; fitted models and the model card are saved; every M2 number is rebuilt by the pipeline scripts and notebooks 01–02."],
  ["What will you do in M4?", "Ensembles (random forest, gradient boosting) under the same protocol; calibrated probabilities; a tariff-notification calendar; within-year AUC next to pooled AUC; the H4 test of quintile-specific models; the fairness audit (H5: Brier scores and miss rates Q1 vs Q5 with the Diebold–Mariano test; equal recall across quintiles); ethics of public warnings."],
];

// ---------------------------------------------------------------- checks made after the submission (Section 9)
const AFTER_CHECKS = [
  ["Shock threshold 0.5–2%", "0.5%: 37% of training rows are shocks; 2%: 4.5%, none in 2024, 4 test weeks. AUC 0.60–0.64 (0.5%), 0.64–0.65 (1%), up to 0.71 pooled (1.5%).", "1% is a sensible middle. We would not choose a definition by model score."],
  ["Fuel-revision cut-off 0.25–3%", "0.25%, 0.5%, 1%: 137, 135, 127 weeks; only 10 weeks between 0.25% and 1%.", "The flag barely depends on the exact cut-off."],
  ["EDA cut-offs and the Eid window", "Rupee effect at 1–5%; recent shocks at 1 and 2; momentum significant at 1 or 2 spikes, not at 3; no Eid effect at 1–8 weeks.", "The M2 conclusions hold; momentum is the most cut-off-sensitive signal."],
  ["Window lengths", "Rupee 1/4/8/13 weeks: 0.58, 0.65, 0.67, 0.68; SPI change 1/4/13 weeks: 0.62, 0.65, 0.60.", "8 and 4 weeks are reasonable; 13 weeks would be a near-equal alternative for the rupee."],
  ["Momentum-item rule", "3–24 items; onions and potatoes always; 10% picks petrol and diesel.", "The core list is stable; the feature matters little in M3."],
  ["HAC lags", "H2: p = 0.25–0.28 for 4–16 lags; H3 food p = 0.001–0.006 for 1–13 lags.", "H2 and H3 conclusions do not depend on the lag choice."],
  ["Gini vs entropy; Euclidean vs Manhattan", "Entropy within-year 0.651 vs 0.578; Manhattan pooled 0.670 vs 0.643.", "Both defaults were slightly worse in CV. Say so honestly; both go into the M4 grids."],
  ["Seeds; bootstrap size", "Test AUCs identical for five seeds; interval ends move by less than 0.01.", "Results do not hinge on the seed or the number of resamples."],
  ["Train/test boundary", "Boundaries from Dec 2023 to Jun 2025 give 40% to 18% test weeks.", "End-2024 gives about 75/25 with whole years and two fiscal-year starts in the test."],
];

// ================================================================ ASSEMBLY
const body = [];

// Cover
body.push(new Paragraph({ children: [new TextRun({ text: "Viva Preparation Guide", font: FONT, size: 52, bold: true, color: ACCENT })], spacing: { after: 120 } }));
body.push(P("Milestones 2 and 3: why we chose what we chose", { size: 32, color: ACCENT, after: 200 }));
body.push(P("Early-warning system for essential-price shocks across income quintiles in Pakistan", { size: 24, color: MUTED, after: 120 }));
body.push(P("CS/SDP 312/314 Data Science for Social Good · Team: Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid", { size: 22, color: MUTED, after: 120 }));
body.push(P("Version: 26 October 2026", { size: 22, color: MUTED, after: 600 }));
body.push(P("The viva covers Milestones 2 and 3 together and asks mostly open questions about our decisions: why a number was chosen, whether we tried other values and how we settled on the final one, why a method was used and another was not, why a technique was applied one way and not another, and who did what. This guide answers those questions for every decision in both milestones. File-by-file references stay in `DS4SG_Script_and_Data_Reference.docx` (Milestones 1–2) and `DS4SG_M3_Reference.docx` (Milestone 3, with a concepts glossary).", { size: 22 }));
body.push(pageBreak());

// Contents
body.push(new Paragraph({ children: [new TextRun({ text: "Contents", font: FONT, size: 32, bold: true, color: ACCENT })], spacing: { after: 200 } }));
const TOC_AT = body.length;            // the contents list is inserted here once all headings exist
body.push(pageBreak());

// 1. How to use
body.push(H1("1. How to use this guide"));
body.push(P("For Milestone 3 the grade is the rubric score multiplied by a viva factor V between 0 and 1. Full marks (V = 1.00) need a confident defence of the choices; hesitating on hyperparameters or validation details costs 15%, and being unable to explain the CV splits, feature importance or metric trade-offs costs 30%. Any team member may be asked anything, about either milestone."));
body.push(H2("1.1 How each decision is laid out"));
body.push(BUL("**Say this first** (green): one or two plain sentences. Start every answer here."));
body.push(BUL("**Why, in detail** (grey): the numbers and reasoning to add if the examiner pushes."));
body.push(BUL("**Other options checked** (yellow): which other values or methods were tried, with the result and when the check was made."));
body.push(BUL("**Why not the alternatives:** what we rejected and the one-line reason."));
body.push(BUL("**Show it:** where the decision lives in the notebooks or code, in case you are asked to open it."));
body.push(H2("1.2 Answer in four steps"));
body.push(NUM("**What we did:** 'A shock week is a week in which a group's SPI rises by at least 1%.'"));
body.push(NUM("**Why, in one sentence:** 'A normal week moves about 0.2%, so 1% is a real jump, and about one week in seven is a shock.'"));
body.push(NUM("**One piece of evidence:** '1% is the 85th percentile of weekly changes.'"));
body.push(NUM("**What else we considered:** 'At 0.5% over a third of weeks would count as shocks; at 2% there would be no shock in 2024 and only four in the test.'"));
body.push(H2("1.3 Be clear about when a check was made"));
body.push(P("Every 'Other options checked' entry starts with one of three tags:"));
body.push(BUL(`${AT} the check is in the submitted notebooks or report.`));
body.push(BUL(`${AFTER} the check was run on 26 October 2026 for this viva with \`python src/models/sensitivity_checks.py\`. It is not in the submitted work.`));
body.push(BUL(`${NOT} the value was set by convention or judgement and never varied.`));
body.push(P("If you are asked about an afterwards check, say so plainly: 'We did not compare that at the time. Preparing for this viva we checked, and …'. Never present it as part of the original decision. An honest 'we have not checked that' with a reason is better than an invented answer.", { before: 80 }));
body.push(H2("1.4 Preparation plan"));
body.push(NUM("Read Sections 3 and 4 (the numbers and the methods): they answer most 'why this?' questions in one line.", 2));
body.push(NUM("For each decision card in Sections 5 and 6, say the green text out loud, then the grey text.", 2));
body.push(NUM("Fill in your own row of Section 2 and agree it with the team.", 2));
body.push(NUM("Learn the key numbers (Section 7) and quiz each other with Section 8.", 2));
body.push(NUM("Run notebooks 01–04 and `python src/models/sensitivity_checks.py` (about 4 minutes) once yourself, so you have seen every number.", 2));
body.push(NUM("Read Section 9: two of the after-submission checks found that a default setting was not the best one. Know how to answer that honestly.", 2));

// 2. Contributions
body.push(pageBreak());
body.push(H1("2. Who did what"));
body.push(P("The instructor also checks contributions. The roles below are the ones the team set at the start; everyone worked on data curation and analysis. Complete the last column yourselves and agree it before the viva: a decision you argued for, a problem you solved, and a check you made."));
body.push(grid(["Member", "Background", "Main areas", "Your own examples (fill in)"], TEAM, [1800, 1250, 2650, 3326], { size: 18, firstBold: true }));
body.push(spacer());
body.push(P("Team decisions on record, useful as shared examples:"));
body.push(BUL("Choosing the narrative (4 Oct 2026): the early-warning system for each quintile, with the rotating burden as the lens, after the data contradicted the M1 idea that Q1 always faces more inflation."));
body.push(BUL("Verifying the Pakistan dates of Ramadan and both Eids (6 Oct 2026), because moon-sighting in Pakistan often falls a day after the Umm al-Qura calendar."));
body.push(BUL("The 5:1 cost ratio: a value judgement about harm to poor households, which the SDP members should be ready to defend."));
body.push(BUL("Editing the M3 report together, and the review that led to the KNN wording, the top-5 drivers table and the H3 caveat."));
body.push(P("The split shows who led each part, not who understands it: every member should be able to explain any decision in this guide.", { before: 80 }));

// 3. Numbers
body.push(pageBreak());
body.push(H1("3. The numbers we chose, and whether we checked others"));
body.push(P("One line per fixed number or setting. 'When' says whether alternatives were checked at the time (in the submitted work), afterwards (26 Oct, for this viva) or not at all."));
body.push(H2("3.1 Milestone 2: data, features and EDA"));
body.push(grid(["Number or setting", "Why this value", "Other values checked (result)", "When"], M2_NUMBERS, [1800, 2700, 3526, 1000], { size: 17, firstBold: true }));
body.push(H2("3.2 Milestone 3: models and evaluation"));
body.push(grid(["Number or setting", "Why this value", "Other values checked (result)", "When"], M3_NUMBERS, [1800, 2700, 3526, 1000], { size: 17, firstBold: true }));

// 4. Methods
body.push(pageBreak());
body.push(H1("4. Methods we used and methods we did not use"));
body.push(H2("4.1 Milestone 2"));
body.push(grid(["We used", "Why", "We did not use", "Why not"], M2_METHODS, [2200, 2400, 1900, 2526], { size: 17, firstBold: true }));
body.push(H2("4.2 Milestone 3"));
body.push(grid(["We used", "Why", "We did not use", "Why not"], M3_METHODS, [2200, 2400, 1900, 2526], { size: 17, firstBold: true }));
body.push(H2("4.3 Methods from beyond the lecture slides"));
body.push(P("Almost everything comes from the lecture slides, the syllabus or the rubrics. These are the exceptions; each is there because the course method alone would have given a wrong or incomplete answer, so be ready to say why in one sentence."));
body.push(grid(["Method", "Why we needed it", "One-line explanation"], BEYOND, [2300, 3600, 3126], { size: 17, firstBold: true }));
body.push(P("Dropped: the DeLong test planned in M2 (replaced by the week-block bootstrap, built from bootstrap and cluster sampling in Unit 04).", { before: 80 }));

// 5. and 6. Decision cards
function decisionCards(list) {
  for (const d of list) {
    if (d.group) { body.push(H3(d.group)); continue; }
    body.push(new Paragraph({ children: runs(d.id ? `${d.id} · ${d.title}` : d.title, { size: 21, bold: true, color: INK }), spacing: { before: 160, after: 80 }, keepNext: true }));
    body.push(card([
      ["Say this first", d.simple, SIMPLE_FILL],
      ["Why, in detail", d.detail, DETAIL_FILL],
      ["Other options checked", d.checked, CHECK_FILL],
      ["Why not the alternatives", d.whynot],
      ["Show it", d.where],
    ]));
    body.push(spacer());
  }
}
body.push(pageBreak());
body.push(H1("5. Milestone 2 decisions in detail"));
body.push(P("Labels D1–D5 match the docstring of `src/cleaning/build_master.py`, P1–P7 the decision table in notebook 01 §4 and F1–F4 the docstring of `src/features/build_features.py`. In the viva, explain the choice, not the label."));
decisionCards(M2_DECISIONS);

body.push(pageBreak());
body.push(H1("6. Milestone 3 decisions in detail"));
body.push(P("B1–B8 match the docstring of `src/models/baseline.py`; B9–B20 cover the remaining choices. Figures are also numbered B1–B10: 'Figure B1' is not 'decision B1'."));
decisionCards(M3_DECISIONS);

// 7. Key numbers
body.push(pageBreak());
body.push(H1("7. Key numbers"));
body.push(H2("7.1 Milestone 2"));
body.push(grid(["Quantity", "Value"], M2_KEY, [2600, 6426], { size: 18, firstBold: true }));
body.push(H2("7.2 Milestone 3"));
body.push(grid(["Quantity", "Value"], M3_KEY, [2600, 6426], { size: 18, firstBold: true }));

// 8. Question bank
body.push(pageBreak());
body.push(H1("8. Question bank"));
body.push(P("Grouped by the kinds of question the instructor described. [M2] or [M3] marks the milestone. Expect follow-ups such as 'did you try anything else?' and 'how did you decide?': the answers in Sections 3–6 cover them."));
const Q_W = [3000, 6026];
body.push(H2("8.1 Why this number?"));
body.push(grid(["Question", "Short answer"], Q_NUMBERS, Q_W, { size: 18, firstBold: true, cantSplit: true }));
body.push(H2("8.2 Why this method, and why not another?"));
body.push(grid(["Question", "Short answer"], Q_METHODS, Q_W, { size: 18, firstBold: true, cantSplit: true }));
body.push(H2("8.3 Why did you do it this way?"));
body.push(grid(["Question", "Short answer"], Q_WAY, Q_W, { size: 18, firstBold: true, cantSplit: true }));
body.push(H2("8.4 What did you find, and what does it mean?"));
body.push(grid(["Question", "Short answer"], Q_RESULTS, Q_W, { size: 18, firstBold: true, cantSplit: true }));
body.push(H2("8.5 Process, checks and contributions"));
body.push(grid(["Question", "Short answer"], Q_PROCESS, Q_W, { size: 18, firstBold: true, cantSplit: true }));

// 9. After-submission checks
body.push(pageBreak());
body.push(H1("9. Checks made after the submission"));
body.push(P("Run on 26 October 2026 with `python src/models/sensitivity_checks.py` (prints only; writes no files). None of them changes a submitted result: choosing a definition or a setting because it scores better after the fact would be tuning on the results. Use them to answer 'did you try other values?' honestly."));
body.push(grid(["Check", "Result", "What it means"], AFTER_CHECKS, [2000, 3800, 3226], { size: 17, firstBold: true }));
body.push(P("**Two findings to be ready for.** The tree's split measure and KNN's distance were left at their defaults. The alternatives would have scored a little higher in cross-validation (entropy: within-year AUC 0.651 against 0.578; Manhattan: pooled 0.670 against 0.643). If asked, say: 'We used the defaults and did not tune them. We checked afterwards and the alternatives are slightly better in cross-validation, so they are in the M4 grids. We did not change M3, because we had already seen the test results.'", { before: 120 }));

// ================================================================ DOCUMENT
body.splice(TOC_AT, 0, ...HEADINGS.map((h) => new Paragraph({
  children: [new InternalHyperlink({ anchor: h.id, children: [new TextRun({ text: h.text, font: FONT, size: h.level === 1 ? 22 : 20, bold: h.level === 1, color: h.level === 1 ? ACCENT : INK })] })],
  indent: { left: h.level === 1 ? 0 : 400 }, spacing: { before: h.level === 1 ? 120 : 0, after: 40 },
})));

const STYLES = {
  default: { document: { run: { font: FONT, size: 20 } } },
  paragraphStyles: [
    { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 0 } },
    { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: FONT, color: ACCENT }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
  ],
};
const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "DS4SG · Viva Preparation Guide, Milestones 2 and 3", font: FONT, size: 16, color: MUTED })] })] });
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED })] })] });

const doc = new Document({
  creator: "DS4SG team", title: "Viva Preparation Guide: Milestones 2 and 3", styles: STYLES,
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: body },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
