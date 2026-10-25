// Builds the Milestone 3 manuscript sections (IV Baseline Models and Experimental Setup, V Results and Initial
// Findings): manuscript/M3_manuscript_sections_IV_V.docx
//
// Usage (from the project root; needs the npm package "docx", e.g. NODE_PATH pointing at its node_modules):
//   python tools/prepare_manuscript_figures.py      # caption-free copies of the figures
//   node tools/build_manuscript_m3.js manuscript/M3_manuscript_sections_IV_V.docx
// Then export to PDF from Word (File > Save As > PDF).
//
// The sections continue the submitted Milestone 2 draft (Sections II-III, Tables 1-13, Figs. 1-6, refs [1]-[10]),
// so numbering starts at Section IV, Table 14, Fig. 7 and reference [11].
// Every number comes from notebooks/03_baseline_models.ipynb, notebooks/04_hypothesis_tests.ipynb and
// reports/tables/m3_*.csv (run of 2026-10-22).
// Style: as the M2 draft. Black text and headings only, no header or footer, Times New Roman.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun,
  AlignmentType, BorderStyle, LevelFormat, HeadingLevel, TableLayoutType, VerticalAlign,
} = require("docx");

const OUT = process.argv[2] || "manuscript/M3_manuscript_sections_IV_V.docx";
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

// ------------------------------------------------------------------ tables (three-rule, "booktabs" style)
const RULE = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: BLACK });
const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
let tableNo = 13, figNo = 6;              // continue the numbering of the M2 draft

function tcell(text, width, o) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: { top: o.top ? RULE(o.top) : NONE, bottom: o.bottom ? RULE(o.bottom) : NONE, left: NONE, right: NONE },
    margins: { top: 30, bottom: 30, left: 70, right: 70 }, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: runs(text, { size: o.size || SMALL, bold: o.bold }), alignment: o.align, spacing: { after: 0 }, keepNext: o.keepNext })],
  });
}
// widths in DXA; align: array of "l" | "c" | "r" per column
function table(caption, headers, rows, widths, align, note, size) {
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
        new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => tcell(h, widths[i], { top: 12, bottom: 6, bold: true, align: al(i), keepNext: true, size })) }),
        ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((c, i) => tcell(c, widths[i], { bottom: k === rows.length - 1 ? 12 : 0, align: al(i), keepNext: k < rows.length - 1 || Boolean(note), size })) })),
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
  new Paragraph({ children: runs("Draft of Section IV (Baseline Models and Experimental Setup) and Section V (Results and Initial Findings)", { size: 22, italics: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new Paragraph({ children: runs("Syeda Hoorain Imran (Computer Science)  ·  Muhammad Munib Sattar (Social Development and Policy)  ·  Sarah Khalid (Social Development and Policy)", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: runs("CS/SDP 312/314: Data Science for Social Good  ·  Milestone 3  ·  October 2026", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  P("These sections continue the Milestone 2 draft (Sections II–III, Tables 1–13, Figs. 1–6, references [1]–[10]); numbering continues accordingly.", { align: AlignmentType.CENTER, italics: true, after: 240, size: 20 }),
);

// ---------------------------------------------------------------- IV. Baseline models and experimental setup
add(H1("IV. Baseline Models and Experimental Setup"));

add(
  H2("A. Task, Data Partitioning and Class Imbalance"),
  P("Standing at the end of week *t*, each classifier predicts whether week *t*+1 will be a shock week (a weekly SPI rise of at least 1%) for each quintile (`target_shock_next`, Section II-F). The unit is a quintile-week. The Combined index is excluded because it is a weighted average of the quintiles and would add each week's information a sixth time. Eighteen features known at the end of week *t* enter every model (Table 14). Rows with a missing feature or target (the first eight weeks, before an eight-week exchange-rate change exists, and the final week) are dropped, as planned in Table 2."),
  P("The split is chronological and was fixed in Milestone 2, before any model was fitted. Training covers 270 weeks (1,350 rows) and the test period 91 weeks (455 rows), a 74.8/25.2 split by weeks. Shocks are the minority class: 17.2% of training rows and 7.7% of test rows (35 rows in 13 distinct weeks). Stratified random splitting, the usual remedy for imbalance, does not apply to a time series. It would train on later weeks to predict earlier ones, and it would separate the five quintile rows of a week, which share every week-level feature. Imbalance is handled instead by class weights (a tuned option), a cost-based alarm threshold (Section IV-E) and metrics that do not reward a model that never raises an alarm. The halving of the shock rate in the test period is a genuine change, caused by the 2025 disinflation and not by sampling, and it makes the test harder for any alarm."),
  table("Experimental design.", ["Element", "Specification"], [
    ["Rows", "Quintile-weeks Q1–Q5; 1,805 after listwise deletion of 45 rows (9 weeks)"],
    ["Target", "`target_shock_next`: SPI rise ≥ 1% in week *t*+1"],
    ["Own history", "`spi_wow_pct`, `spi_chg_4w`"],
    ["Lead signals (H1)", "`fx_chg_8w`, `shocks_last_4w`, `momentum_spikes_4w`, `infl_staples_4w`, `fuel_review_next_week`, `fy_start_next_week`"],
    ["Component momentum", "`infl_perishables_4w`, `infl_utilities_4w`, `infl_motor_fuel_4w`"],
    ["Controls", "`policy_rate`, `ramadan_next_week`, `pre_eid_adha_4w`, `grp_Q1`–`grp_Q4` (Q5 = reference)"],
    ["Training period", "31 Oct 2019 – 26 Dec 2024: 270 weeks, 1,350 rows, 17.2% shocks"],
    ["Test period", "2 Jan 2025 – 24 Sep 2026: 91 weeks, 455 rows, 7.7% shocks (13 shock weeks)"],
    ["Validation", "Expanding window; 4 folds = validation years 2021–2024; whole weeks; scaling inside each pipeline"],
    ["Selection", "Highest ROC-AUC of pooled out-of-fold predictions"],
    ["Alarm threshold", "Minimum expected cost on out-of-fold predictions, FN : FP = 5 : 1"],
    ["Software", "scikit-learn 1.9 [11], statsmodels 0.15; random seed 42"],
  ], [2100, 6926], ["l", "l"]),
);

add(
  H2("B. Validation Framework and Leakage Control"),
  P("Hyperparameters are chosen by forward-chaining (expanding-window) cross-validation [12] with K = 4 folds (Fig. 7). Fold *k* validates on calendar year 2020 + *k* and trains on every earlier week, and whole weeks always move together. Calendar years, rather than equal-sized blocks, ensure that each validation block contains exactly one fiscal-year start, one Ramadan and one Eid ul-Adha. Validation shock rates range from 12% (2024) to 33% (2022), so the folds span both calm and crisis regimes. Because the target is one week ahead, no gap between training and validation is needed. The other leakage channels are closed as follows:"),
  BUL("**Scaling** is fitted inside each model's pipeline, on the fold's training rows only. The Milestone 2 scaled columns were fitted on all of 2019–24, so they are not used."),
  BUL("**Features** use only information available at the end of week *t*."),
  BUL("**Hyperparameters and alarm thresholds** are chosen without the test period, which is scored once."),
  P("One exception is disclosed: the momentum items behind `momentum_spikes_4w` were selected on all training years, so within cross-validation that choice has seen later folds (but never the test period)."),
  figure("figB1_cv_design.png", "Expanding-window cross-validation. Each fold trains on every week before its validation year (blue) and is scored on that year (orange). The final models are refitted on all training weeks and scored once on 2025–26 (green). Shock rate = share of quintile-weeks followed by a weekly SPI rise of at least 1%.", 6.0),
);

add(
  H2("C. Naive Benchmarks and Model Choice"),
  P("Two benchmarks need no learning. The **majority class** always predicts \"no shock\", and its probability is the training shock rate. **Persistence** predicts a shock next week if this week was a shock week, the standard naive forecast for time series. The three baseline learners were chosen for complementary strengths (Table 15):"),
  BUL("**Logistic regression** is the model form of H1, so its coefficients test the hypothesis directly, and L1/L2 regularisation suits a short sample [13]."),
  BUL("**k-nearest neighbours (KNN)** is an analogue forecast (\"what followed the last weeks that looked like this one?\") and imposes no functional form."),
  BUL("**A shallow decision tree** produces if-then alarm rules that officials can audit. It also captures thresholds and interactions, such as a fiscal-year start that coincides with a falling rupee."),
  table("Baseline models: rationale, weakness and tuning grid (selected setting in the last column).", ["Model", "Why for this problem", "Main weakness", "Grid", "Selected"], [
    ["Majority class", "accuracy floor; shows that accuracy misleads", "never raises an alarm", "—", "—"],
    ["Persistence", "naive time-series forecast; tests whether shocks cluster", "ignores all signals", "—", "—"],
    ["Logistic regression", "model form of H1; odds ratios; regularised", "linear, no interactions; calibration", "C: 12 values, 10^{−4}–100; L1/L2; class weights", "C = 10^{−4}, L2, balanced"],
    ["KNN", "analogue forecast; no functional form", "scale-sensitive; irrelevant features dilute distances", "k: 11 values, 5–250; uniform/distance; z-score/Min-Max", "k = 100, uniform, z-score"],
    ["Decision tree", "auditable rules; thresholds, interactions", "high variance", "depth 1–8; minimum leaf 5–160; class weights", "depth 4, leaf ≥ 40, unweighted"],
  ], [1450, 2250, 1900, 2050, 1376], ["l", "l", "l", "l", "l"]),
);

add(
  H2("D. Hyperparameter Tuning"),
  P("Each learner is tuned by exhaustive grid search over 44–98 settings (Table 15). Every setting is trained on each fold's training weeks and predicts that fold's validation year. Settings are ranked by the ROC-AUC of the pooled out-of-fold predictions of all four years, not by the mean of the per-fold AUCs. The reason is that the warning system will apply a single threshold in every year, and a model that ranks weeks well within each year but whose probability level drifts between years would fail in deployment. The mean and standard deviation of the per-fold AUCs are reported to show the variance across folds, and the training AUC to diagnose over- and underfitting. The selected setting is then refitted on all 270 training weeks."),
);

add(
  H2("E. Evaluation Metrics, Error Costs and Alarm Thresholds"),
  P("We report accuracy, precision, recall (sensitivity), specificity, F1, ROC-AUC, PR-AUC (average precision, which is more informative than ROC under class imbalance [14]) and the Brier score (calibration). Test AUCs carry 95% intervals from a bootstrap that resamples whole test weeks 2,000 times."),
  P("The two errors carry different social costs (Table 16). A **false positive** (false alarm) triggers an early or unneeded top-up: fiscal space is spent and repeated alarms erode trust, but the money still reaches poor households. A **false negative** (missed shock) leaves households to absorb a lasting price step without a buffer. For Q1 the step is not given back: eight weeks after a shock week, prices were a median 4.2% above the pre-shock week, against 1.9% over the same span around an ordinary week, and after the shock they kept rising at the usual pace (2.1% against 2.0% over eight weeks; training weeks). A typical Q1 shock (median 1.6%, mean 2.0%), applied to the Q1 expenditure ceiling of Rs 17,732 a month, costs up to Rs 355 a month, about 8% of the BISP Kafaalat stipend (Rs 13,500 a quarter since January 2025 [15]). Coping is often irreversible: smaller or cheaper meals, borrowing, asset sales. An evaluation of early action before Mongolia's 2017/18 dzud found about US$7 of avoided losses and added benefits per US$1 spent [16]."),
  P("We therefore set the cost of a miss at five false alarms (*c*_{FN} : *c*_{FP} = 5 : 1). This is below that return, because a false alarm is a transfer rather than a pure loss, and above parity, because misses are irreversible. All cost results are repeated for ratios from 1 : 1 to 20 : 1. The default cut-off of 0.5 is arbitrary, and class weights shift the predicted probabilities, so each model's threshold is the value that minimises expected cost on its 2021–24 out-of-fold predictions."),
  table("Social consequences of the two errors.", ["", "False alarm (FP)", "Missed shock (FN)"], [
    ["Households", "early or unneeded top-up, still spent on essentials", "unbuffered, lasting price step; coping by cutting meals, borrowing, selling assets"],
    ["BISP / government", "fiscal space used (one month's stipend to about 10 million families ≈ Rs 45 billion); trust eroded by repeated alarms", "relief arrives weeks late through reactive channels"],
    ["Markets", "a public warning may feed expectations or hoarding", "—"],
    ["Reversibility", "largely reversible (a transfer, not a loss)", "largely irreversible (nutrition, debt)"],
    ["Size for Q1", "—", "median shock 1.6%, not reversed (4.2% above the pre-shock level 8 weeks later, against 1.9% for an ordinary week); up to Rs 355 a month ≈ 8% of the stipend"],
    ["Cost weight", "1", "5 (sensitivity 1–20)"],
  ], [1700, 3500, 3826], ["l", "l", "l"]),
);

// ---------------------------------------------------------------- V. Results
add(H1("V. Results and Initial Findings"));

add(
  H2("A. Cross-Validated Performance"),
  P("Table 17 and Fig. 8 summarise the tuning. On pooled AUC all three learners beat both benchmarks: 0.643 (logistic regression), 0.643 (KNN) and 0.652 (tree), against 0.584 for persistence and 0.467 for the majority class. The majority class falls below 0.5 because its constant prediction drifts with each fold's base rate, which is exactly the failure that the pooled criterion penalises. The validation curves show where overfitting begins:"),
  BUL("**Logistic regression:** weakening the penalty lifts the training AUC from 0.79 to 0.86 while the pooled validation AUC falls to 0.56."),
  BUL("**KNN:** with *k* = 5 it fits the training weeks almost perfectly (training AUC 0.98) but validates at 0.56, rising to 0.64 at *k* = 100."),
  BUL("**Decision tree:** trees deeper than four levels fit the training weeks better without validating better."),
  P("Logistic regression selects the strongest L2 penalty in the grid (C = 10^{−4}, balanced class weights), although with balanced weights every C ≤ 0.01 scores within 0.013 of it. Because this is the edge of the grid, we also tried C = 3 × 10^{−5} and 10^{−5}: both the pooled and the within-year AUC change by at most 0.001, so the selected value sits on a plateau rather than short of a better one. With a small sample that shifts over time, heavily shrunk weights generalise better than freely fitted ones. For KNN, z-score scaling beats Min-Max (0.64 against at most 0.53), because heavy tails let Min-Max compress ordinary weeks into a narrow band. The fold-to-fold standard deviations (0.05–0.08) are as large as the differences between learners, so the three learners are statistically indistinguishable in cross-validation."),
  P("Pooled AUC also rewards telling crisis years from calm years. The tree's pooled AUC is higher than three of its four yearly AUCs, which can only come from differences between years: its first split recognises the 2022–23 crisis. Ranking within years, measured by the mean of the per-fold AUCs, orders the learners differently: KNN 0.672, logistic regression 0.651, tree 0.578, persistence 0.569, and this is the order the test period reproduced (Section V-B). The selection rule was kept as planned, because changing it after seeing the test results would let them leak into model choice."),
  table("Cross-validated ROC-AUC, validation years 2021–24.", ["Model", "Pooled", "Mean ± SD", "2021", "2022", "2023", "2024", "Train"], [
    ["Logistic regression", "0.643", "0.651 ± 0.053", "0.736", "0.634", "0.644", "0.590", "0.790"],
    ["KNN", "0.643", "0.672 ± 0.080", "0.792", "0.565", "0.671", "0.661", "0.776"],
    ["Decision tree", "**0.652**", "0.578 ± 0.082", "0.488", "0.674", "0.642", "0.507", "0.849"],
    ["Majority class", "0.467", "0.500 ± 0.000", "0.500", "0.500", "0.500", "0.500", "—"],
    ["Persistence", "0.584", "0.569 ± 0.044", "0.577", "0.586", "0.498", "0.615", "—"],
  ], [2000, 900, 1350, 900, 900, 900, 900, 1176], ["l", "c", "c", "c", "c", "c", "c", "c"],
  "Pooled: AUC of the stacked out-of-fold predictions (selection criterion). Train: mean AUC on each fold's own training weeks. Validation shock rates: 13% (2021), 33% (2022), 20% (2023), 12% (2024)."),
  figure("figB2_validation_curves.png", "Validation curves. ROC-AUC for each value of one hyperparameter, with the others fixed at their selected values. Dashed: AUC on the fold's own training weeks; solid: pooled out-of-fold AUC (selection criterion); band: mean ± 1 SD of the four per-fold AUCs; dotted line: selected value.", 6.3),
  P("Time-aware validation matters (Table 18). Shuffled stratified K-fold over rows reports AUCs of 0.70–0.73, which is 0.05–0.14 higher than forward chaining. Keeping a week's rows together removes most of this inflation for KNN and the tree, whose neighbours and leaves otherwise contain sister quintile rows of the same week. Logistic regression keeps part of the gain, because shuffling also lets later years inform earlier ones."),
  table("Mean per-fold ROC-AUC of the tuned models under three validation designs.", ["Model", "Shuffled K-fold (rows)", "Shuffled K-fold (whole weeks)", "Expanding window (ours)"], [
    ["Logistic regression", "0.697", "0.690", "0.651"],
    ["KNN", "0.730", "0.661", "0.672"],
    ["Decision tree", "0.715", "0.548", "0.578"],
  ], [2400, 2200, 2400, 2026], ["l", "c", "c", "c"]),
);

add(
  H2("B. Test-Period Performance"),
  P("Table 19 reports the single evaluation on 2025–26. The majority class has the highest accuracy (92.3%) while catching no shock, which is why accuracy cannot be used to select an alarm model. KNN had the highest ROC-AUC, 0.68 (95% interval 0.47–0.83), and a recall of 0.57 (20 of 35 shock rows) at a specificity of 0.68. Compared on the same resampled weeks, it ranked shocks better than logistic regression (difference +0.11, 95% interval +0.02 to +0.22) but not clearly better than the tree (+0.14, −0.04 to +0.29); with only 13 shock weeks, we do not call it the best model. Logistic regression (AUC 0.57) and the tree (0.54) ranked shocks only slightly better than chance, and persistence (0.47) not at all, because shocks did not cluster in 2025–26 (Fig. 9)."),
  P("Precision fell from 0.26–0.38 out-of-fold to 0.10–0.14 in the test period: with the shock rate halved, the same ranking produces mostly false alarms. KNN and the tree are roughly calibrated (Brier scores 0.070 and 0.078, against 0.080 for the base rate). Logistic regression is not (0.238), because heavy shrinkage and class weighting keep its probabilities near 0.5. By quintile, logistic regression and the tree each caught 1 of 7 Q1 shock rows against 2 of 6 for Q5. These counts are too small for inference, but they motivate the fairness analysis (H5) planned for Milestone 4."),
  table("Test-period performance, 2025–26 (455 quintile-weeks, 35 followed by a shock).", ["Model", "τ", "Acc.", "Prec.", "Recall", "Spec.", "F1", "ROC-AUC [95% CI]", "PR-AUC", "Brier"], [
    ["Logistic regression", "0.50", "0.855", "0.140", "0.171", "0.912", "0.154", "0.57 [0.35, 0.76]", "0.114", "0.238"],
    ["KNN", "0.12", "0.675", "0.131", "**0.571**", "0.683", "**0.213**", "**0.68** [0.47, 0.83]", "**0.141**", "**0.070**"],
    ["Decision tree", "0.16", "0.745", "0.099", "0.286", "0.783", "0.147", "0.54 [0.43, 0.67]", "0.087", "0.078"],
    ["Majority class", "—", "0.923", "—", "0.000", "1.000", "0.000", "0.50", "0.077", "0.080"],
    ["Persistence", "0.50", "0.851", "0.029", "0.029", "0.919", "0.029", "0.47 [0.44, 0.51]", "0.076", "0.149"],
  ], [1650, 550, 700, 700, 750, 700, 700, 1576, 850, 850], ["l", "c", "c", "c", "c", "c", "c", "c", "c", "c"],
  "τ: alarm threshold chosen on 2021–24 out-of-fold predictions at FN : FP = 5 : 1. Intervals: 2,000 bootstrap resamples of whole test weeks. Precision is undefined for the majority class, which never raises an alarm."),
  figure("figB3_roc_pr_test.png", "ROC (left) and precision–recall (right) curves on the test period. Dots mark each model's operating point at the threshold chosen on 2021–24. Grey lines: no skill.", 6.3),
);

add(
  H2("C. Asymmetric Error Costs"),
  P("In the 2021–24 validation years all three learners beat both trivial policies. At 5 : 1, their expected cost was 33–39% below that of never alerting (Fig. 10, top, solid lines), and 18–26% below that of alerting every week, the cheaper trivial policy while the shock rate exceeded 1/6. In the test period, the same thresholds cost 4–23% more than never alerting (Table 20). The dashed test curves lie above the validation curves at every low threshold: thresholds that paid off when one quintile-week in five was followed by a shock over-alert when only one in thirteen is."),
  P("The ranking skill survives (KNN's test cost would have fallen to about 0.89 of never alerting at thresholds between 0.15 and 0.23), but the threshold does not transfer across regimes. Re-choosing the threshold for each cost ratio does not rescue the baselines. They stay silent at 1 : 1. At 2 : 1 and 3 : 1 they still beat silence in 2021–24 but over-alert in 2025–26 (up to 2.01 times the cheaper trivial policy). At 10 : 1 they alert almost every week, and at 20 : 1 they merely match the cheapest trivial policy (always alert). The finding is therefore robust to the assumed ratio: an early warning calibrated on crisis years cries wolf in calm years."),
  table("Expected cost relative to the cheaper trivial policy (never alert or always alert); values below 1 beat both.", ["FN : FP", "LR, 2021–24", "LR, test", "KNN, 2021–24", "KNN, test", "Tree, 2021–24", "Tree, test"], [
    ["1 : 1", "0.97", "1.00", "1.00", "1.00", "1.00", "1.00"],
    ["2 : 1", "0.89", "1.00", "0.95", "1.03", "0.90", "2.01"],
    ["3 : 1", "0.86", "1.00", "0.84", "1.19", "0.74", "1.58"],
    ["**5 : 1**", "**0.82**", "**1.04**", "**0.79**", "**1.19**", "**0.74**", "**1.23**"],
    ["10 : 1", "1.00", "1.20", "1.04", "1.18", "1.15", "1.18"],
    ["20 : 1", "1.00", "1.00", "1.10", "0.99", "1.62", "1.00"],
  ], [1100, 1330, 1300, 1330, 1300, 1370, 1296], ["l", "c", "c", "c", "c", "c", "c"],
  "Thresholds are re-chosen on the 2021–24 out-of-fold predictions for each ratio. The cheaper trivial policy is never alert below about 4 : 1 in 2021–24 (12 : 1 in the test period) and always alert above."),
  figure("figB4_cost_analysis.png", "Asymmetric error costs. Top: expected cost of every alarm threshold relative to never raising an alarm (below 1 = better than doing nothing) at FN : FP = 5 : 1; solid lines, 2021–24 out-of-fold; dashed lines, test period; dotted lines, selected thresholds. Bottom: test-period cost relative to the cheaper trivial policy as the cost ratio varies.", 6.0),
);

add(
  H2("D. Confusion Matrices and Misclassified Edge Cases"),
  P("Fig. 11 shows the trade-off at the selected thresholds. Logistic regression is conservative (37 false alarms, 29 misses), KNN is liberal (133 false alarms, 15 misses) and the tree lies in between (91 and 25). Examining every test shock week (Table 21) reveals four systematic weaknesses:"),
  BUL("**The models follow momentum.** The March 2026 petrol increase (+21%) was missed by all three models for every group it hit, whereas the second increase four weeks later (+18%) was caught by all three for all four groups."),
  BUL("**Administered utility tariffs are missed.** Gas and electricity increases drove 4 of the 13 shock weeks. Logistic regression caught none of the 10 rows and the tree caught one. KNN's five catches all fell in a July 2025 week that followed an earlier shock."),
  BUL("**Perishable supply spikes** (chicken, tomatoes) have no lead signal in our data."),
  BUL("**False alarms follow shocks.** 68–75% of false alarms were raised in weeks after a recent shock, against 27% of all test rows."),
  P("In addition, the strongest training signal never switched on: the rupee did not fall by more than 2% over eight weeks in any test week. July carried the most risk, beyond its first week: 4 of the 13 shock weeks fell in July, but only one of them was the week containing 1 July, the only week the fiscal-year flag marks."),
  figure("figB5_confusion_matrices.png", "Confusion matrices on the test period at the thresholds chosen on 2021–24 (counts of quintile-weeks; row shares in brackets). Top-right cell: false alarms; bottom-left: missed shocks. The majority class (not shown) predicts no alarm for all 455 rows (420 true negatives, 35 misses).", 6.3),
  table("Every test-period shock week: main upward driver and shocked groups caught by each model.", ["Shock week", "Groups", "Rise (%)", "Main driver (weekly price change)", "LR", "KNN", "Tree"], [
    ["15 May 2025", "Q2, Q4, Q5", "1.04", "chicken +16%", "0/3", "0/3", "0/3"],
    ["10 Jul 2025", "Q1, Q2, Q4", "1.06", "chicken +23%, tomatoes +13%", "0/3", "1/3", "2/3"],
    ["24 Jul 2025", "Q1–Q5", "4.08", "gas (Q1 slab) +30%, electricity (Q1 slab) +21%", "0/5", "5/5", "1/5"],
    ["4 Sep 2025", "Q1–Q4", "1.75", "wheat flour +25%, tomatoes +46%", "0/4", "4/4", "2/4"],
    ["16 Oct 2025", "Q1", "1.07", "tomatoes +33%", "0/1", "0/1", "0/1"],
    ["19 Feb 2026", "Q1–Q3", "1.21", "electricity (Q1 slab) +15%", "0/3", "0/3", "0/3"],
    ["12 Mar 2026", "Q3–Q5", "1.70", "petrol +21%, LPG +12%", "0/3", "0/3", "0/3"],
    ["26 Mar 2026", "Q2", "1.09", "electricity (Q1 slab) +6%, LPG +10%", "0/1", "0/1", "0/1"],
    ["2 Apr 2026", "Q5", "1.15", "fresh milk +1%, LPG +13%", "1/1", "1/1", "1/1"],
    ["9 Apr 2026", "Q2–Q5", "1.56", "petrol +18%", "4/4", "4/4", "4/4"],
    ["2 Jul 2026", "Q1", "1.42", "tomatoes +125%", "1/1", "0/1", "0/1"],
    ["16 Jul 2026", "Q1–Q5", "1.26", "chicken +15%, petrol +4%", "0/5", "5/5", "0/5"],
    ["24 Sep 2026", "Q2", "1.28", "electricity (Q1 slab) +19%", "0/1", "0/1", "0/1"],
  ], [1250, 1150, 800, 3326, 800, 850, 850], ["l", "l", "c", "l", "c", "c", "c"],
  "Rise: mean SPI rise of the shocked groups. Driver: items with the largest upward PBS impact on the Combined SPI that week. Model columns: shocked groups for which an alarm had been raised the week before / shocked groups."),
);

add(
  H2("E. Feature Drivers"),
  P("The three importance measures agree on the leading drivers (Fig. 12, Table 22). Rupee depreciation over eight weeks carries logistic regression's largest standardised weight and provides the tree's first split (above 8%; Gini importance 0.45). Recent shocks, staple-food inflation and perishables inflation rank high in at least two measures. Permutation importance [17], computed on the validation folds, is led by perishables inflation, recent shocks, the four-week SPI change and the rupee. In an unpenalised logit with week-clustered errors, each 1% of depreciation raises the odds of a shock next week by 11% (odds ratio 1.11, *p* = 0.015), and a fiscal-year start multiplies them by 5.3 (*p* = 0.013). That estimate rests on only five fiscal-year starts (14 of their 25 quintile rows were followed by a shock), so its 95% interval is wide (1.4–19.5). The fiscal-year start matters greatly but rarely (2% of rows), so permutation importance barely registers it. Quintile dummies are near zero in every measure: once the signals are included, the groups do not differ in baseline shock risk."),
  table("Leading feature drivers.", ["Feature", "LR relative weight", "Odds ratio (p)", "Tree Gini", "Permutation ΔAUC"], [
    ["Rupee change, past 8 weeks (per 1%)", "**1.00**", "1.11 (0.015)", "**0.45**", "0.018"],
    ["Shock weeks in past 4 weeks (per week)", "0.91", "1.23 (0.334)", "0.00", "0.021"],
    ["Staple-food inflation, 4 weeks (per pp)", "0.85", "1.16 (0.266)", "0.16", "0.006"],
    ["Motor-fuel inflation, 4 weeks (per pp)", "0.61", "1.01 (0.676)", "0.00", "0.011"],
    ["SPI change, past 4 weeks (per pp)", "0.59", "0.99 (0.936)", "0.04", "0.020"],
    ["Fiscal year starts next week (yes)", "0.55", "**5.26 (0.013)**", "0.00", "0.001"],
    ["Momentum-item spikes, 4 weeks (per spike)", "0.48", "0.92 (0.463)", "0.00", "0.005"],
    ["Perishables inflation, 4 weeks (per pp)", "0.47", "1.04 (0.089)", "0.17", "**0.023**"],
    ["SPI change this week (per pp)", "0.35", "1.00 (0.999)", "0.17", "0.004"],
    ["Quintile dummies Q1–Q4 (vs Q5)", "|w| ≤ 0.09", "1.09–1.31 (≥ 0.07)", "0.00", "≤ 0.002"],
  ], [3300, 1350, 1700, 1150, 1526], ["l", "c", "c", "c", "c"],
  "LR relative weight: standardised coefficient of the tuned logistic regression divided by the largest. Odds ratio: unpenalised logit with all 18 features, standard errors clustered by week. Permutation ΔAUC: mean drop in validation AUC when the feature is shuffled, averaged over the three models and four folds."),
  figure("figB7_feature_importance.png", "Feature importance. Left: relative standardised coefficients of the tuned logistic regression (blue raises, orange lowers shock risk). Middle: Gini importance of the tuned tree. Right: drop in validation AUC when one feature is shuffled (mean ± SD over four folds; the test period is not used).", 6.4),
);

add(
  H2("F. Hypothesis Tests H1–H3"),
  P("Table 23 summarises the three tests promised in Milestone 2, each at the 5% level."),
  P("**H1 (early warning).** In sample, the six lead signals are jointly significant: Wald χ^{2}(6) = 22.4, *p* = 0.001, with standard errors clustered by week. The unclustered likelihood-ratio statistic (χ^{2} = 94) overstates the evidence, because it treats the five quintile rows of a week as independent. The rupee's eight-week change (odds ratio 1.09 per 1%, *p* = 0.027) and the fiscal-year start (5.2, *p* = 0.015) are individually significant. Out of sample, the signals raised the pooled AUC from 0.51 to 0.57 in the validation years. In the test period the gain was negligible: 0.554 to 0.561. Milestone 2 planned a DeLong test [9] for this comparison, but it treats the 455 test rows as independent, whereas the five quintile rows of a week move together. We therefore resampled whole test weeks 2,000 times: the 95% interval for the gain runs from −0.08 to +0.10, and 45% of resamples show no gain (one-sided *p* = 0.45). H1 is supported in turbulent periods but not in the calm test period: the early warning is regime-dependent."),
  P("**H2 (exchange-rate pass-through).** Regressing the Q5 − Q1 difference in eight-week-ahead inflation on the eight-week depreciation estimates the differential pass-through directly, with Newey–West errors [6]. Pass-through is real and similar for every quintile: about 0.21% per 1% depreciation over eight weeks for both Q1 and Q5. The difference (0.04, SE 0.06, one-sided *p* = 0.27) is not significant at any horizon (4, 8, 13 weeks), with or without controls, or on the full sample. We fail to reject H0, so the exchange-rate signal is equally relevant for every quintile."),
  P("**H3 (rotating burden).** A 1% weekly rise in food prices widens the Q1 − Q5 inflation gap by 0.12 percentage points (one-sided *p* = 0.003). Energy as a whole, however, does not narrow it (+0.04; *p* = 0.92 for β < 0). An exploratory split (Fig. 13) shows why:"),
  BUL("**Motor fuel** (−0.07, *p* < 0.001) and **LPG and firewood** (−0.03, *p* = 0.02) hit richer households harder."),
  BUL("**Perishables** (+0.03, *p* < 0.001) hit the poorest harder. **Utility tariffs** point the same way (+0.03) but are not significant (*p* = 0.10)."),
  P("The split raises R^{2} from 0.16 to 0.38. The burden therefore rotates between motor-fuel shocks, heavier on the rich, and food shocks, heavier on the poor, with utility tariffs probably on the poor side. Perishable and tariff shocks are also the ones the baselines miss. Because the split was chosen after seeing the H3 result, it is a hypothesis for Milestone 4 rather than a confirmed finding. The gap is also partly mechanical: it is built from the same item price changes, weighted by each quintile's basket (food is about 57% of Q1's estimated basket against 43% of Q5's), so these regressions partly recover known weight differences. Their coefficients are descriptive, not causal."),
  table("Hypothesis tests (training period unless stated; 5% level).", ["Hypothesis", "Test", "Estimate", "p", "Decision"], [
    ["H1 in sample: signals β = 0", "Wald, week-clustered, χ^{2}(6)", "22.4", "0.001", "reject H0"],
    ["H1 out of sample: AUC gain > 0", "Week-block bootstrap, test 2025–26", "+0.007", "0.45", "fail to reject"],
    ["H2: β^{FX}_{Q5} > β^{FX}_{Q1} (8 weeks)", "HAC difference regression", "δ = 0.04", "0.27", "fail to reject"],
    ["H3: β_{food} > 0", "HAC t-test", "0.12", "0.003", "reject H0"],
    ["H3: β_{energy} < 0", "HAC t-test", "+0.04", "0.92", "fail to reject"],
  ], [2850, 2350, 1250, 900, 1676], ["l", "l", "c", "c", "l"]),
  figure("figB10_rotating_burden_test.png", "What widens and what narrows the Q1 − Q5 inflation gap. OLS coefficients with 95% HAC intervals (training period, 277 weeks). Positive: the component raises Q1's weekly inflation more than Q5's. Left: the pre-stated H3 model; right: the exploratory split.", 6.3),
);

add(
  H2("G. Initial Policy Takeaways"),
  P("Table 24 links each of the five leading drivers, ranked by mean permutation importance, to a policy implication. Importance shows what the models rely on, not cause and effect, so these are directions for monitoring rather than proven levers."),
  table("The five leading drivers and their policy implications.", ["Rank", "Driver", "Permutation ΔAUC", "Policy implication"], [
    ["1", "Perishables inflation, past 4 weeks", "0.023", "Track weekly prices of perishables (tomatoes, onions, chicken): food shocks widen the inflation gap against the poorest (H3)."],
    ["2", "Shock weeks in past 4 weeks", "0.021", "Shocks cluster: after a first shock week, keep BISP top-ups on standby for the following month."],
    ["3", "SPI change, past 4 weeks", "0.020", "Monitor each quintile's own four-week inflation, not only the weekly change."],
    ["4", "Rupee change, past 8 weeks", "0.018", "A fall of several percent over two months should trigger a readiness review of top-ups; it raises every quintile's prices alike (H2)."],
    ["5", "Motor-fuel inflation, past 4 weeks", "0.011", "Fuel prices are reviewed fortnightly on known dates, so this signal can be anticipated; its direct burden falls mostly on richer households (H3)."],
  ], [700, 2600, 1300, 4426], ["c", "l", "c", "l"],
  "Permutation ΔAUC: mean drop in validation AUC when the feature is shuffled, averaged over the three models and four folds (as in Table 22)."),
  BUL("**Watch the rupee.** Sustained depreciation is the most consistent lead signal, and it passes through equally to all quintiles. A fall of several percent over two months should trigger a readiness review of BISP top-ups."),
  BUL("**Front-load support before 1 July.** The fiscal-year start (budget, taxes, tariff rebasing) multiplied the odds of a shock about five-fold in 2019–24, an estimate from only five fiscal years. In 2025–26, 4 of the 13 shock weeks fell in July, mostly after its first week. Paying a Kafaalat instalment before July rather than after is a low-cost response."),
  BUL("**Coordinate on administered prices.** Utility tariffs and fuel prices are set by NEPRA, OGRA and the Economic Coordination Committee. They drove 6 of the 13 test shock weeks, and no market signal anticipates them. Advance notice from these bodies to the social-protection agency would be a cheaper early warning than any model."),
  BUL("**Recalibrate alarms when the inflation regime changes.** A fixed threshold either cries wolf in calm years or sleeps through crises."),
);

add(
  H2("H. Limitations and Roadmap for Milestone 4"),
  P("The baselines have seven main limitations:"),
  BUL("**Underfitting:** they fit a weak signal poorly, and no cross-validated AUC reaches 0.7."),
  BUL("**Calibration:** their probabilities are poorly calibrated, and a threshold learned in one regime does not transfer to another."),
  BUL("**Selection criterion:** pooled AUC partly rewards telling crisis years from calm ones, which flattered the tree."),
  BUL("**A small test set:** only 13 distinct shock weeks, so the test metrics are imprecise."),
  BUL("**Missing information:** there is no lead information on tariff decisions or supply shocks."),
  BUL("**Potential bias:** the SPI covers 17 cities only, so rural poor households are invisible; quintiles rest on 2015-16 expenditure weights; and a pooled model may serve the poorest worst, as the low Q1 recall of two learners hints."),
  BUL("**Data vintage:** revised SPI values are used, whereas a real-time forecaster would see first releases."),
  P("Milestone 4 will address these limitations in five steps:"),
  BUL("**Ensembles:** add random forests and gradient boosting under the same validation, selection and threshold protocol, and test quintile-specific against pooled models with signal × quintile interactions (H4)."),
  BUL("**Calibration and selection:** adjust the probabilities so that they match the observed shock rates, and report within-year AUC alongside pooled AUC."),
  BUL("**New features:** add an administered-price calendar (NEPRA and OGRA notification dates), a first-month-of-the-fiscal-year window and a rolling shock rate that follows changes in how common shocks are."),
  BUL("**Fairness audit (H5):** compare Brier scores and miss rates for Q1 against Q5 with the Diebold–Mariano test [10], as planned in Milestone 2; check whether recall is equal across quintiles; and set quintile-specific thresholds that give a missed Q1 shock a larger cost, since it hurts a Q1 household more."),
  BUL("**Ethics:** evaluate the risks of public warnings (self-fulfilling hoarding), the transparency of the alarm rule, and the exclusion of rural households."),
  P("Milestone 5 will then retrain the models week by week on new releases, to measure how quickly the thresholds adapt."),
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
  "F. Pedregosa *et al.*, \"Scikit-learn: Machine learning in Python,\" *Journal of Machine Learning Research*, vol. 12, pp. 2825–2830, 2011.",
  "C. Bergmeir and J. M. Benítez, \"On the use of cross-validation for time series predictor evaluation,\" *Information Sciences*, vol. 191, pp. 192–213, 2012.",
  "T. Hastie, R. Tibshirani, and J. Friedman, *The Elements of Statistical Learning*, 2nd ed. New York: Springer, 2009.",
  "T. Saito and M. Rehmsmeier, \"The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets,\" *PLoS ONE*, vol. 10, no. 3, e0118432, 2015.",
  "Benazir Income Support Programme, \"Benazir Kafaalat: quarterly payment increased to Rs 13,500,\" https://bisp.gov.pk/ (accessed Oct. 2026).",
  "Food and Agriculture Organization of the United Nations, *Mongolia: Impact of Early Warning Early Action. Protecting the livelihoods of herders from a dzud winter*. Rome: FAO, 2018.",
  "L. Breiman, \"Random forests,\" *Machine Learning*, vol. 45, no. 1, pp. 5–32, 2001.",
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
  title: "An Early-Warning System for Essential-Price Shocks Across Income Quintiles in Pakistan (Sections IV-V draft)",
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
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`wrote ${OUT}: tables 14-${tableNo}, figures 7-${figNo}`);
});
