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
// so numbering starts at Section VI, Table 25, Fig. 14 and reference [18]. The reference list shows only
// the works cited in these sections, under their numbers in the full list.
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
const cited = new Set();                  // reference numbers cited in the text, e.g. [24]
function runs(text, o = {}) {
  const size = o.size || BODY;
  for (const m of String(text).matchAll(/\[(\d+)\]/g)) cited.add(Number(m[1]));
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
  new Paragraph({ children: runs("Draft of Sections VI to VIII (Advanced Models, Fairness Audit and Mitigation, Ethical Governance)", { size: 22, italics: true }),
    alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
  new Paragraph({ children: runs("Syeda Hoorain Imran (Computer Science)  ·  Muhammad Munib Sattar (Social Development and Policy)  ·  Sarah Khalid (Social Development and Policy)", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: runs("CS/SDP 312/314: Data Science for Social Good  ·  Milestone 4  ·  November 2026", { size: 21 }),
    alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
  P("These sections continue the Milestone 3 draft (Tables 14–24, Figs. 7–13, references [1]–[17]), and numbering continues accordingly.", { align: AlignmentType.CENTER, italics: true, after: 240, size: 20 }),
);
cited.clear();   // the reference list below holds only the works cited in Sections VI-VIII

// ---------------------------------------------------------------- numbers and result text
const N = require("./m4_manuscript_numbers.js");
const nt = () => tableNo + 1, nf = () => figNo + 1, cur = () => tableNo;

N.ablationText = "Retraining the forest on the same folds with only the 18 Milestone 3 features gives a within-year AUC of 0.684. Adding only the 26-week rate gives 0.676, only the July window 0.684, and both 0.678, differences of about a tenth of the year-to-year standard deviation. The new features did not improve the ranking, but they stay as designed, because dropping them now would be a choice informed by the test period.";

N.thresholdText = "In the validation years the forest's threshold of 0.14 catches 72% of shock rows with a precision of 0.28, at 0.65 of the cost of never alerting (Fig. " + "FIGA4" + "). With a miss costing five false alarms, an alarm pays off only if its precision exceeds 1/6. In 2021–24, with 19.5% shock rows, the forest cleared that bar easily. In 2025–26, with 7.7%, its precision never rose above 0.153 at any threshold with at least ten alarms, so never alerting was cheapest (the chosen threshold cost 1.12), and the same holds at every cost ratio from 2 : 1 to 5 : 1. A threshold learned in a crisis does not transfer to a calm regime.";

N.calibrationText = "The forest is well calibrated in the validation years (mean prediction 0.170 against a shock rate of 0.195, Brier 0.152 against 0.158 for always predicting the average) but over-predicts by about half in the test period (0.114 against 0.077). Logistic regression's probabilities sit near 0.5 because of balanced class weights and heavy shrinkage.";

N.h4Text = "Milestone 2 stated H4 for a pooled logit on Q1 and Q5 rows. H0 says the six signal × Q5 interactions are all zero, and H1 says at least one is not. The main test is a Wald test with week-clustered standard errors, and the planned likelihood-ratio test is reported for reference. We fail to reject H0 at the 5% level (Table " + "TH4" + "). One interaction stands out, as a fuel-price review next week raises Q5's shock odds more than Q1's (coefficient 0.90, p = 0.017), in line with H3. Out of sample, a forest pooled over all quintiles ranks most quintiles' weeks better than one trained on that quintile alone, but it ranks Q5's weeks best (within-year AUC 0.714) and Q1's worst (0.656).";

N.importanceText = "The forest relies on recent momentum and the rupee (Fig. " + "FIGA6" + "), led by the four-week SPI change, the eight-week rupee change, this week's SPI change and recent shocks, the Milestone 3 drivers again. Every leading signal matters more for Q5's rows than for Q1's (four-week SPI change 0.041 of AUC against 0.018, rupee 0.027 against 0.011), so our signals describe the richest quintile's shocks best.";

N.auditText = "Demographic parity holds for every learner (Table " + "TAUDIT" + "), with disparate impact ratios of 0.96 to 1.05 in 2021–24 (forest 1.05, 95% interval 0.98 to 1.13), because most signals are shared by all quintiles. Equal opportunity leans against Q1 in every learner, by 2.6 recall points for the forest (interval −0.18 to +0.12) and up to 13.2 for logistic regression. Predictive equality nearly holds (false-positive rate 0.46 for Q1 against 0.42 for Q5). The larger gap lies in ranking, with within-group AUCs of 0.64 for Q1 and 0.72 for Q5 (Fig. " + "FIGF1" + "). The test period cannot settle fairness, as with 6 to 9 shock rows per quintile one shock moves recall by 11 to 17 points.";

N.h5Text = "Milestone 2 stated H5 with the Brier loss L. H0 says E[L_{Q1}] = E[L_{Q5}] and H1 says E[L_{Q1}] > E[L_{Q5}]. The Diebold–Mariano test [10] is a paired t-test over weeks on d_{t} = L_{Q1,t} − L_{Q5,t}, with a Newey–West standard error because weekly losses are autocorrelated. The forest's loss is higher for Q1 in the validation years (0.148 against 0.136) and the test period (0.074 against 0.062), but the weekly differences are noisy (one-sided p = 0.26 in 2021–24 and 0.33 in the test period, for 1 to 13 lags), so we fail to reject H0. Only logistic regression's gap is significant (p = 0.014), and it is tiny (0.002). Four years of weekly data cannot tell the gap apart from chance.";

N.driversText = "Labelling each shock by the component with the largest upward impact that week shows where the gap comes from. In 2021–24 perishables drove 42% of Q1's shock rows against 24% of Q5's, and motor fuel 29% of Q5's against 16% of Q1's, the rotating burden of Sections III and V. The forest catches motor-fuel (recall 0.88) and staple-food shocks (0.89) best and utility-tariff (0.69) and perishable shocks (0.62) worst. The poorest quintile is exposed most to the shocks with no lead signal in our data, and no threshold can create that signal. It needs new data such as wholesale perishable prices or a tariff calendar.";

N.mitigationText = "Reweighing changes almost nothing (Table " + "TPOL" + "), because base rates are nearly equal and its weights lie between 0.91 and 1.13. Counting Q1's shocks twice in training evens out recall in 2021–24 (Q1 0.74, Q5 0.71) and had the lowest test cost (1.07), but caught only 2 of Q5's 6 test shocks. These two results hold for our random seed only. Training with row weights also changes the forest's random draws, and over five seeds both methods narrow the Q1–Q5 recall gap by only 3 to 4 points on average against a forest trained with equal weights, which is within the variation between seeds. The unweighted forest's Q1 recall is below Q5's in every seed (by 2.6 to 10.5 points). Post-processing does not retrain the forest and avoids this problem. The equal-opportunity thresholds work best, cutting the largest recall gap between quintiles from 0.13 to 0.05 while lowering the cost (0.637 against 0.651). The Q1-weighted thresholds raise Q1's recall to 0.89 with more Q1 false alarms, and the demographic-parity thresholds are the cheapest (0.632) but leave Q1's recall 13 points below Q5's, so the 80% rule alone does not protect the poorest. In the test period every policy costs more than never alerting.";

N.paretoText = "Fairness is cheap until it has to be exact (Fig. " + "FIGF2" + "). Allowing recalls to differ by up to 0.04 costs 0.643 of never alerting, less than the shared threshold (0.651, gap 0.13), and from a gap of 0.05 the frontier is flat at 0.632 to 0.637. Only near-exact equality is expensive (0.711 at a gap of 0.02, 0.819 at zero). The shared threshold lies above the frontier, so quintile thresholds exist that are both fairer and cheaper, the main practical result of the audit. Demographic parity is almost free. On the test period the same thresholds cost 1.13 to 1.15 of never alerting, so the trade-off must be re-estimated when the regime changes.";

N.asymText = "The cost-based quintile thresholds depend on the assumed cost of a missed Q1 shock (Table " + "TASYM" + "). With equal miss costs they already differ (Q1 0.14, Q5 0.12). A weight of 1.5 or 2 lowers Q1's threshold to 0.09, raising Q1's recall from 0.74 to 0.89 while the total cost rises only from 0.632 to 0.643. At 3, Q1's threshold drops to 0.01, an alarm every week, which turns the early warning into a standing top-up.";

N.recommendText = "We recommend the random forest, retrained on all weeks, with quintile thresholds chosen as the cheapest set whose recalls differ by at most 0.05, which in 2021–24 was both fairer and cheaper than one shared threshold. If the agency gives the poorest priority, the Q1-weighted thresholds are the equity option, a choice for the agency and those affected. Either way the thresholds must be re-chosen on recent weeks whenever the alert rate and the realised shock rate drift apart, because in 2025–26 no fixed threshold beat silence. Milestone 5 will test how quickly re-chosen thresholds recover.";

N.fatenRows = [
  ["Fairness", "equal errors across quintiles", "parity holds (1.05), Q1's recall is 2.6 points below Q5's, quintile thresholds cut the gap to 0.05", "Q1's weeks are ranked worse (AUC 0.64 against 0.72)", "quintile thresholds, monthly dashboard"],
  ["Autonomy", "people keep control", "the model informs staff, sets no eligibility and uses no personal data", "automation bias", "show reasons, staff decide"],
  ["Trust", "transparent and reliable", "open features and thresholds, calibrated in 2021–24", "in 2025–26 fewer than one alarm in six was right", "publish the alarm record, re-choose thresholds"],
  ["Equity", "support follows need", "a missed Q1 shock can count twice (Q1 recall 0.89)", "rural households and changed baskets are missing", "weight set with those affected, add rural prices"],
  ["Non-maleficence", "do no harm", "false alarms are transfers, misses the costly error", "a public warning could feed hoarding, silence could be misread as no need", "internal alarms that add to targeting, never replace it"],
];

N.labRows = [
  ["Regime change", "the 2021–24 threshold over-alerted in 2025–26", "monthly alert rate against shock rate, re-choose the threshold, retrain"],
  ["First wave of an administered price rise", "tariff shocks caught 69% of the time in 2021–24, 30% in 2025–26", "price setters notify the desk in advance"],
  ["One quintile served worse", "Q1's shocks are more often perishable, the type caught least (0.62)", "quintile thresholds, monthly dashboard"],
  ["Households outside the data", "17 cities, no rural prices, 2015-16 weights", "never the only trigger, add rural prices"],
  ["Late or revised data", "revised SPI values used in training", "pilot on first releases, version all data"],
  ["Automation bias or alert fatigue", "about six false alarms per shock caught in 2025–26", "show reasons, staff decide, publish the record"],
  ["Public warnings feed hoarding", "not testable", "internal alarms, delayed publication"],
  ["Pressure to silence alarms", "not testable", "log alarms and overrides for independent review"],
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
// only the works cited in Sections VI-VIII are listed, under their numbers in the full draft
const citedNow = [...cited].sort((x, y) => x - y);
if (citedNow.some((k) => k < 1 || k > REFS.length)) throw new Error(`citation out of range: ${citedNow}`);
add(H1("References"));
citedNow.forEach((k) => body.push(new Paragraph({
  children: [new TextRun({ text: `[${k}]`, font: FONT, size: 20, color: BLACK }), new TextRun({ text: "\t", font: FONT, size: 20 }), ...runs(REFS[k - 1], { size: 20 })],
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
