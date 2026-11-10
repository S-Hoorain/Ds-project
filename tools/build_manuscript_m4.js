// Builds the Milestone 4 manuscript sections (VI Advanced Models and Final Model Selection, VII Algorithmic Fairness
// Audit and Bias Mitigation, VIII Ethical Governance and Living-Lab Deployment):
// manuscript/M4_manuscript_sections_VI_VIII.docx
//
// Usage (from the project root; needs the npm package "docx", e.g. NODE_PATH pointing at its node_modules):
//   python tools/prepare_manuscript_figures.py      # caption-free copies of the figures
//   node tools/build_manuscript_m4.js manuscript/M4_manuscript_sections_VI_VIII.docx
// Then export to PDF from Word.
//
// The sections continue the submitted Milestone 3 draft (Sections IV-V, Tables 14-24, Figs. 7-13, refs [1]-[17]),
// so numbering starts at Section VI, Table 25, Fig. 14 and reference [18].
// Every number comes from notebooks/05_advanced_models.ipynb, notebooks/06_fairness_audit.ipynb and
// reports/tables/m4_*.csv (run of 2026-11-10).
// Style: as the M2 and M3 drafts. Black text and headings only, no header or footer, Times New Roman.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun,
  AlignmentType, BorderStyle, LevelFormat, HeadingLevel, TableLayoutType, VerticalAlign,
} = require("docx");

const OUT = process.argv[2] || "manuscript/M4_manuscript_sections_VI_VIII.docx";
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
let tableNo = 24, figNo = 13;             // continue the numbering of the M3 draft

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
  new Paragraph({ children: runs("Draft of Section VI (Advanced Models and Final Model Selection), Section VII (Algorithmic Fairness Audit and Bias Mitigation) and Section VIII (Ethical Governance and Living-Lab Deployment)", { size: 22, italics: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new Paragraph({ children: runs("Syeda Hoorain Imran (Computer Science)  ·  Muhammad Munib Sattar (Social Development and Policy)  ·  Sarah Khalid (Social Development and Policy)", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: runs("CS/SDP 312/314: Data Science for Social Good  ·  Milestone 4  ·  November 2026", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  P("These sections continue the Milestone 3 draft (Sections IV–V, Tables 14–24, Figs. 7–13, references [1]–[17]), and numbering continues accordingly.", { align: AlignmentType.CENTER, italics: true, after: 240, size: 20 }),
);

// ---------------------------------------------------------------- numbers and result text
const N = require("./m4_manuscript_numbers.js");
const nt = () => tableNo + 1, nf = () => figNo + 1, cur = () => tableNo;

N.ablationText = "Retraining the selected forest with and without the new features on the same folds isolates their effect without touching the test period. With the 18 Milestone 3 features its within-year AUC is 0.684. Adding the 26-week shock rate lowers it to 0.676, the July window leaves it at 0.684, and both give 0.678. These differences are about a tenth of the year-to-year standard deviation, so the new features did not improve the ranking. With both, the forest is steadier across years (standard deviation 0.060 against 0.073) and its Brier score is unchanged (0.152). Permutation importance agrees, as shuffling the 26-week rate slightly raises the forest's validation AUC (Section VI-H). The features stay in the model as designed, because dropping them now would be a choice informed by the test period, and Milestone 5 will decide on new weeks.";

N.thresholdText = "In the validation years, the forest's threshold of 0.14 catches 72% of shock rows with a precision of 0.28, at 0.65 of the cost of never alerting (Fig. " + "FIGA4" + "). With a missed shock costing five false alarms, an alarm pays off only if more than one alarm in six is right, a precision above 1/6. In 2021–24, when 19.5% of rows were followed by a shock, the forest cleared that bar easily. In 2025–26 only 7.7% were, and the forest's precision never rose above 0.153 at any threshold that raised at least ten alarms, so the cheapest test-period policy was never to alert (cost 1.12 at the chosen threshold). Its most confident alarms were wrong as well, since every test row with a probability of 0.26 or more was a calm week. At ratios from 2 : 1 to 5 : 1 the forest beats the cheaper trivial policy in 2021–24 (0.79 to 0.93 of its cost) but not in the test period at any ratio (1.00 to 1.20), much like the Milestone 3 KNN. A threshold learned in a crisis regime still does not transfer to a calm one.";

N.calibrationText = "Calibration tells the same story from the probabilities' side. In the validation years the forest's mean prediction (0.170) is close to the observed shock rate (0.195), and its Brier score (0.152) is slightly better than always predicting the average rate (0.158). In the test period its mean prediction fell to 0.114, but the observed rate fell to 0.077, so it over-predicts by about half. The 26-week shock rate pulled the level down by a third while shocks fell by 60%. Logistic regression is not calibrated (mean prediction 0.50, Brier 0.247), because balanced class weights and heavy shrinkage keep its probabilities near 0.5.";

N.h4Text = "Milestone 2 stated H4 as follows. In a pooled logit for Q1 and Q5, H0 says the six signal × Q5 interactions are all zero, and H1 says at least one is not. As for H1 in Milestone 3, the main test is a Wald test with standard errors clustered by week, and the planned likelihood-ratio test is reported for reference. We fail to reject H0 at the 5% level (Table " + "TH4" + "). The clustered statistic is the larger of the two here, because the Q1 and Q5 rows of a week move together, so the difference between them is estimated more precisely than independent rows would suggest. One interaction stands out. A fuel-price review next week raises Q5's shock odds more than Q1's (coefficient 0.90, p = 0.017), in line with H3, where motor fuel weighed more on richer households. Out of sample, pooling wins. The forest trained on all five quintiles ranks each quintile's weeks better than a forest trained on that quintile alone, in the validation years for Q2 to Q5 and in the test period for all five. Five times more rows matter more than group-specific signals. The pooled forest does not serve the quintiles equally, however, as it ranks Q5's weeks best (within-year AUC 0.714) and Q1's worst (0.656). Section VII takes this up.";

N.importanceText = "The forest relies on recent price momentum and the rupee (Fig. " + "FIGA6" + "). Its leading features are the four-week SPI change, the eight-week rupee change, this week's SPI change, the shocks of the past four weeks and the momentum-item spikes, the Milestone 3 drivers again. Shuffling utility-tariff inflation or the 26-week shock rate slightly raises its validation AUC, so in these years they added noise. Every leading signal matters more for Q5's rows than for Q1's. The four-week SPI change is worth 0.041 of AUC on Q5 rows against 0.018 on Q1 rows, the rupee 0.027 against 0.011, and motor-fuel inflation 0.013 against nothing. The signals in our data describe the shocks of the richest quintile better than those of the poorest.";

N.auditText = "Demographic parity holds for every learner (Table " + "TAUDIT" + "). In 2021–24 the disparate impact ratio lies between 0.96 and 1.05, well inside the 80% rule, and for the forest it is 1.05 (95% interval 0.98 to 1.13), so Q1 is warned as often as Q5 or slightly more. This is built into the data, because most signals are week-level and shared by all quintiles. Equal opportunity leans against Q1 in every learner, whose recall for Q1 is below that for Q5 by 2.6 points for the forest and up to 13.2 points for logistic regression. For the forest the gap is small and its interval wide (−0.18 to +0.12), and its largest recall gap is between Q4 (0.64) and Q5 (0.76). Predictive equality nearly holds (false-positive rate 0.46 for Q1 against 0.42 for Q5). The larger difference lies in ranking and not at the threshold. Over the validation years the forest's AUC within each group is 0.64 for Q1 and 0.72 for Q5 (Fig. " + "FIGF1" + "). The test period cannot settle fairness. With 6 to 9 shock rows per quintile, one shock moves a quintile's recall by 11 to 17 points. The forest caught 4 of 7 Q1 shocks and 3 of 6 Q5 shocks, and the interval of the equal-opportunity gap runs from −0.55 to +0.66.";

N.h5Text = "Milestone 2 stated H5 with the Brier loss L, a proper scoring rule. H0 says E[L_{Q1}] = E[L_{Q5}] and H1 says E[L_{Q1}] > E[L_{Q5}]. The Diebold–Mariano test [10] takes the weekly loss difference d_{t} = L_{Q1,t} − L_{Q5,t} and tests whether its mean exceeds zero with a Newey–West standard error, because weekly losses are autocorrelated. It is a paired t-test over weeks with a safer standard error. The direction is as Milestone 2 expected, since the forest's Brier loss is higher for Q1 than for Q5 in the validation years (0.148 against 0.136) and in the test period (0.074 against 0.062). The weekly differences are noisy, however. In 2021–24 the mean difference is 0.012 with a standard error of 0.018 (t = 0.66, one-sided p = 0.26), and in the test period p = 0.33. We fail to reject H0. The conclusion holds for 1 to 13 lags. All five learners show the same direction, and only logistic regression's gap is significant (p = 0.014), although it is tiny (0.002) because its probabilities sit near 0.5. The model is somewhat less accurate for the poorest quintile, but four years of weekly data cannot tell the gap apart from chance.";

N.driversText = "Labelling every shock by the price component with the largest upward impact on the SPI that week shows where the gap comes from. In 2021–24, 42% of Q1's shock rows were driven by perishables (tomatoes, onions, chicken and similar), against 24% of Q5's, while motor fuel drove 29% of Q5's shocks and 16% of Q1's. This is the rotating burden of Sections III and V, seen from the shocks' side. The forest catches fuel shocks best and perishable shocks worst. Its recall is 0.88 for motor-fuel shocks and 0.89 for staple-food shocks, but 0.69 for utility-tariff shocks and 0.62 for perishable shocks, and the order is the same in the test period. The poorest quintile is therefore exposed most to exactly the shocks that have no lead signal in our data, supply shocks to perishables and administered tariff decisions. A different threshold can rebalance who receives alarms, but it cannot create the missing signal. That needs new data, such as wholesale perishable prices or a tariff calendar.";

N.mitigationText = "Reweighing changes almost nothing, and what it changes goes the wrong way (Table " + "TPOL" + "). With nearly equal base rates the weights lie between 0.91 and 1.13, and the retrained forest widened the Q1–Q5 recall gap in 2021–24 (−0.08 against −0.03) at a higher cost. Reweighing corrects unequal base rates, and our audit found none, so this is the expected result. Counting Q1's shocks twice in training evens out recall in 2021–24 (Q1 0.74, Q5 0.71) at a slightly higher cost, and in the test period it had the lowest cost of any policy (1.07) but caught only 2 of Q5's 6 shocks, so it moved the imbalance instead of removing it. Post-processing works best in the validation years. The equal-opportunity thresholds cut the largest recall gap between any two quintiles from 0.13 to 0.05 and lower the cost of errors (0.637 against 0.651), so the shared threshold was neither the fairest nor the cheapest choice. The cost-based thresholds with a missed Q1 shock counted twice raise Q1's recall to 0.89 (Q5 0.87), with many more false alarms for Q1 (false-positive rate 0.71 against 0.51), which deliberately tilts the disparate impact ratio to 1.29 in Q1's favour. The demographic-parity thresholds are the cheapest (0.632) but let Q1's recall fall 13 points below Q5's, so meeting the 80% rule alone does not protect the poorest. No policy carries over cleanly to the test period, where every one costs more than never alerting (1.07 to 1.23) for the reason given in Section VI-F.";

N.paretoText = "Fairness is cheap until it has to be exact (Fig. " + "FIGF2" + "). Allowing the five recalls to differ by up to 0.04 costs 0.643 of never alerting, less than the shared threshold (0.651, recall gap 0.13), and from a gap of 0.05 the frontier is flat at 0.632 to 0.637. Only exact equality is expensive, as a gap of 0.02 costs 0.711 and a gap of zero is reachable only by alerting almost every week (0.819). The shared threshold therefore lies above the frontier, and quintile thresholds exist that are both fairer and cheaper, which is the main practical result of the audit. Demographic parity is almost free, because the forest already warns all quintiles at similar rates. Its frontier is nearly flat, and only exact parity is expensive (0.825). The frontier is drawn on the validation years. On the test period the same thresholds cost 1.13 to 1.15 of never alerting and their recall gaps scatter between 0.13 and 0.27, so the trade-off has to be re-estimated when the regime changes.";

N.asymText = "The cost-based quintile thresholds depend on how much more a missed Q1 shock is assumed to cost (Table " + "TASYM" + "). Even with equal miss costs the best thresholds differ (Q1 0.14, Q5 0.12), and the best shared threshold is a compromise between them. Counting a missed Q1 shock 1.5 or 2 times as much lowers Q1's threshold to 0.09, which raises Q1's recall from 0.74 to 0.89 at a false-positive rate of 0.71 for Q1, while the total cost at the uniform 5 : 1 rate rises only from 0.632 to 0.643. At 3 times, Q1's best threshold drops to 0.01, which means alerting for Q1 every week, so a weight that high turns the early warning into a standing top-up for the poorest quintile.";

N.recommendText = "We recommend the random forest, retrained on all available weeks, with one threshold per quintile chosen as the cheapest set whose recalls differ by at most 0.05. In the validation years this was fairer than one shared threshold (recall gap 0.05 against 0.13) and cheaper (0.637 against 0.651 of the cost of never alerting). If the agency decides to give the poorest priority, the thresholds with a missed Q1 shock counted twice are the equity option, raising Q1's recall to about 0.89 at the price of more Q1 false alarms. That is a policy choice for the agency and the people affected, not a modelling result. In both cases the thresholds must be re-chosen on recent weeks whenever the alert rate and the realised shock rate drift apart. In 2025–26 no fixed threshold beat silence, so this step matters more than the choice between the policies, and Milestone 5 will test how quickly re-chosen thresholds recover.";

N.fatenRows = [
  ["Fairness", "errors shared equally across quintiles", "demographic parity holds (ratio 1.05), Q1's recall is 2.6 points below Q5's, and quintile thresholds cut the largest recall gap to 0.05", "the forest ranks Q1's weeks worse (AUC 0.64 against 0.72), and gaps cannot be measured in a calm year", "quintile thresholds and a monthly fairness dashboard"],
  ["Autonomy", "people and officials keep control over decisions", "the model informs a decision by staff and never sets anyone's eligibility, and it uses no personal data", "staff may defer to the model (automation bias)", "show the probability and its reasons, keep the decision and any override with staff"],
  ["Trust", "the system is transparent and reliable", "open features, thresholds and error analysis, and calibration in the validation years (Brier 0.152 against 0.158)", "in 2025–26 alarms were right less than one time in six, and repeated false alarms erode trust", "publish the alarm record and re-choose thresholds by regime"],
  ["Equity", "support follows need, not only equal numbers", "a missed Q1 shock can be weighted twice, which raises Q1's recall to 0.89", "the households in greatest need, rural ones and those the 2015-16 weights no longer describe, are not in the data", "the agency sets the weight with those affected, and rural price data are added"],
  ["Non-maleficence", "the system does no harm", "false alarms are transfers, not losses, and misses are the costly error", "a public warning could feed hoarding, and no alarm could be misread as no need", "alarms stay internal, and the alarm adds to targeting, never replaces it"],
];

N.labRows = [
  ["The regime changes and the threshold no longer fits", "the threshold chosen on 2021–24 over-alerted in 2025–26, and the probabilities over-predicted by about half", "track the alert rate against the realised shock rate monthly, re-choose the threshold on recent weeks, retrain when they drift apart"],
  ["The first wave of an administered price rise is missed", "utility-tariff shocks were caught 69% of the time in 2021–24 and 30% in 2025–26, with no lead signal", "NEPRA, OGRA and the ECC notify the desk before a decision takes effect"],
  ["One quintile is served worse", "Q1's shocks are more often perishable-driven, the type caught least (recall 0.62)", "quintile thresholds and a monthly dashboard of recall and alert rate by quintile"],
  ["Households outside the data", "17 cities only, no rural prices, 2015-16 weights", "never the only trigger for support, add rural price data, re-weight the quintiles when PBS updates them"],
  ["Data arrive late or are revised", "revised SPI values were used in training", "run the pilot on first releases and record every data version"],
  ["Automation bias or alert fatigue", "about six false alarms for every shock caught in 2025–26", "show probabilities and reasons, keep the decision with staff, publish the alarm record"],
  ["A public warning feeds expectations or hoarding", "not testable in our data", "keep alarms internal and publish results with a delay"],
  ["Pressure to silence alarms before a budget or election", "not testable in our data", "log every alarm, decision and override for independent review"],
];

// ---------------------------------------------------------------- sections
const H = { add, H1, H2, P, BUL, table, figure, nt, nf, cur };
// figure and table numbers inside result paragraphs are filled in as the sections are built
const fill = (key, token, value) => { N[key] = N[key].split(token).join(String(value)); };
fill("thresholdText", "FIGA4", 16);
fill("importanceText", "FIGA6", 17);
fill("h4Text", "TH4", 28);
fill("auditText", "TAUDIT", 30);
fill("auditText", "FIGF1", 18);
fill("mitigationText", "TPOL", 31);
fill("paretoText", "FIGF2", 19);
fill("asymText", "TASYM", 32);
require("./m4_manuscript_vi.js")(H, N);
require("./m4_manuscript_vii.js")(H, N);
require("./m4_manuscript_viii.js")(H, N);

// the result paragraphs quote these numbers, so stop if a table or figure was added or removed
if (tableNo !== 34 || figNo !== 19) throw new Error(`numbering changed: tables to ${tableNo}, figures to ${figNo}; update the fill() calls`);

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
  "J. H. Friedman, \"Greedy function approximation: A gradient boosting machine,\" *Annals of Statistics*, vol. 29, no. 5, pp. 1189–1232, 2001.",
  "J. Kleinberg, S. Mullainathan, and M. Raghavan, \"Inherent trade-offs in the fair determination of risk scores,\" in *Proc. 8th Innovations in Theoretical Computer Science Conf. (ITCS)*, 2017, pp. 43:1–43:23.",
  "A. Chouldechova, \"Fair prediction with disparate impact: A study of bias in recidivism prediction instruments,\" *Big Data*, vol. 5, no. 2, pp. 153–163, 2017.",
  "U.S. Equal Employment Opportunity Commission, \"Uniform guidelines on employee selection procedures,\" 29 C.F.R. § 1607.4(D), 1978.",
  "M. Feldman, S. A. Friedler, J. Moeller, C. Scheidegger, and S. Venkatasubramanian, \"Certifying and removing disparate impact,\" in *Proc. 21st ACM SIGKDD Int. Conf. Knowledge Discovery and Data Mining*, 2015, pp. 259–268.",
  "S. Barocas, M. Hardt, and A. Narayanan, *Fairness and Machine Learning: Limitations and Opportunities*. Cambridge, MA: MIT Press, 2023.",
  "M. Hardt, E. Price, and N. Srebro, \"Equality of opportunity in supervised learning,\" in *Advances in Neural Information Processing Systems 29*, 2016, pp. 3315–3323.",
  "F. Kamiran and T. Calders, \"Data preprocessing techniques for classification without discrimination,\" *Knowledge and Information Systems*, vol. 33, no. 1, pp. 1–33, 2012.",
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
  title: "An Early-Warning System for Essential-Price Shocks Across Income Quintiles in Pakistan (Sections VI-VIII draft)",
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
  console.log(`wrote ${OUT}: tables 25-${tableNo}, figures 14-${figNo}`);
});
