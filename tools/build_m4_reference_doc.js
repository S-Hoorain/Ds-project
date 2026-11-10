// Builds "DS4SG_M4_Reference.docx": the Milestone 4 reference (files, run order, concepts, limitations).
// The viva preparation (decisions with the alternatives checked, key numbers, question bank) is in
// tools/build_viva_guide.js.
// Usage (from a folder where the npm package "docx" is installed, or with NODE_PATH pointing at its node_modules):
//   node tools/build_m4_reference_doc.js DS4SG_M4_Reference.docx
// The contents list is static (clickable links to bookmarked headings), so no field update is needed in Word.
// Same layout as tools/build_m3_reference_doc.js. Every number comes from notebooks/05_advanced_models.ipynb,
// notebooks/06_fairness_audit.ipynb and reports/tables/m4_*.csv (run of 2026-11-10).
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, BorderStyle, LevelFormat, PageOrientation, Header, Footer,
  PageNumber, PageBreak, VerticalAlign, TableLayoutType, Bookmark, InternalHyperlink,
} = require("docx");

const OUT = process.argv[2] || "DS4SG_M4_Reference.docx";
const FONT = "Calibri";
const MONO = "Consolas";
const INK = "1F1F1F", MUTED = "5A5A5A", ACCENT = "1F4E79", HEAD_FILL = "DCE6F1", KEY_FILL = "F2F2F2";
const SIMPLE_FILL = "EAF4EA", DETAIL_FILL = "F7F7F7";

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
const NUM = (text) => new Paragraph({ numbering: { reference: "steps", level: 0 }, children: runs(text), spacing: { after: 60 } });
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
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], { bold: true, fill: HEAD_FILL, size: opts.headSize || 19, align: opts.headAlign })) }),
      ...rows.map((r) => new TableRow({ cantSplit: opts.cantSplit, children: r.map((c, i) => cell(c, widths[i], { size: opts.size || 19, align: opts.align && i > 0 ? opts.align : undefined, fill: opts.firstFill && i === 0 ? KEY_FILL : undefined, bold: opts.firstBold && i === 0 })) })),
    ],
  });
}

// Two-column "property card" for a file, function or decision. A value may be a string or a list of strings.
function card(pairs, keyW = 2000) {
  const w = [keyW, PORTRAIT_W - keyW];
  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: PORTRAIT_W, type: WidthType.DXA }, columnWidths: w,
    rows: pairs.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v, fill]) =>
      new TableRow({ children: [cell(k, w[0], { bold: true, fill: fill || KEY_FILL }), cell(Array.isArray(v) ? v.map((x) => new Paragraph({ children: runs(x, { size: 19 }), spacing: { after: 40 } })) : v, w[1], { fill: fill && fill !== KEY_FILL ? fill : undefined })] })),
  });
}
const spacer = () => new Paragraph({ children: [], spacing: { after: 80 } });

// ================================================================ CONTENT

// ================================================================ CONTENT
const CONCEPTS = require("./m4_reference_concepts.js");
const { STEPS, FILES, FUNCS, NB05, NB06, FIGURES } = require("./m4_reference_files.js");
const { HEADLINE, RUBRIC, BEYOND, LIMITS } = require("./m4_reference_results.js");

const body = [];
body.push(new Paragraph({ children: [new TextRun({ text: "Milestone 4 Reference", font: FONT, size: 52, bold: true, color: ACCENT })], spacing: { after: 200 } }));
body.push(P("Advanced models, fairness audit, bias mitigation and ethics: files, concepts and limitations", { size: 28, color: MUTED, after: 120 }));
body.push(P("Early-warning system for essential-price shocks across income quintiles in Pakistan", { size: 24, color: MUTED, after: 120 }));
body.push(P("CS/SDP 312/314 Data Science for Social Good · Team: Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid", { size: 22, color: MUTED, after: 120 }));
body.push(P("Version: 10 November 2026 (Milestone 4)", { size: 22, color: MUTED, after: 600 }));
body.push(P("This document is the companion to Milestone 4. It lists every file the milestone created or used, what each one does and the concepts behind it in plain words, and the limitations that lead into Milestone 5. The viva preparation (every decision with the alternatives we checked, the key numbers and a question bank) is in the combined viva guide, `DS4SG_Viva_Guide_M2_M4.docx`.", { size: 22 }));
body.push(pageBreak());

body.push(new Paragraph({ children: [new TextRun({ text: "Contents", font: FONT, size: 32, bold: true, color: ACCENT })], spacing: { after: 200 } }));
const TOC_AT = body.length;
body.push(pageBreak());

body.push(H1("1. How to use this document"));
body.push(P("Section 2 says what Milestone 4 built and found. Section 3 gives the run order, Section 4 every file, function and notebook section, Section 5 the concepts in plain words and in detail, and Section 6 the limitations and the plan for Milestone 5."));
body.push(P("Suggested use, before the viva:", { before: 80 }));
body.push(NUM("Run notebook 05, then notebook 06, top to bottom, and read every interpretation cell."));
body.push(NUM("Look up every unfamiliar term in Section 5. Each one has a one-line version you can say out loud."));
body.push(NUM("Change one thing and see what moves, for example set `Q1_MISS_MULT = 3` or `RATE_WINDOW = 13` in `src/models/advanced.py`, and re-run."));
body.push(P("Paths are relative to the project folder. Code names appear in `monospace`. Decision labels (A1–A6, R1–R4) are our own bookkeeping, used only in the code docstrings and the viva guide.", { before: 80 }));

body.push(pageBreak());
body.push(H1("2. Milestone 4 at a glance"));
body.push(H2("2.1 What we built, in one paragraph"));
body.push(P(HEADLINE.paragraph));
body.push(H2("2.2 Headline results"));
HEADLINE.bullets.forEach((b) => body.push(BUL(b)));
body.push(H2("2.3 Rubric map"));
body.push(grid(["Rubric item", "Weight", "Where", "One-line answer"], RUBRIC, [2100, 800, 2800, 3326], { size: 17 }));

body.push(pageBreak());
body.push(H1("3. Run order and data flow"));
body.push(P("Run from the project folder with the `.venv` environment (scikit-learn 1.9.1, statsmodels 0.15.0, pandas 3.0). Notebook 06 reads the models and predictions that notebook 05 saves, so run 05 first."));
body.push(grid(["#", "Command", "Reads", "Writes"], STEPS, [400, 3000, 2600, 3026], { size: 17 }));
body.push(spacer());
body.push(P("**In short:** `master_features.csv` → notebook 05 (five learners, tuning, comparison, H4) → `models/m4_advanced/` → notebook 06 (audit, H5, mitigation, Pareto frontier) → manuscript Sections VI–VIII."));

body.push(pageBreak());
body.push(H1("4. Files of Milestone 4"));
for (const f of FILES) {
  body.push(H3("`" + f.path + "`"));
  body.push(card([["Type", f.type], ["What it does", f.what], ["Why it exists", f.why], ["Reads", f.reads], ["Writes", f.writes], ["How to run", f.run], ["Concepts", f.concepts]]));
  body.push(spacer());
}
body.push(H2("4.1 Functions in src/models/advanced.py"));
body.push(P("Constants at the top: `UNPRIV` = Q1, `PRIV` = Q5, `RATE_WINDOW` = 26, `Q1_MISS_MULT` = 2, `MISS_MULTS` = 1, 1.5, 2, 3, the feature lists (`FEATURES` = the 18 of M3 plus `shock_rate_26w` and `july_next_week`), `MODELS` and `ENSEMBLES`. Folds, thresholds, metrics and the bootstrap come from `baseline.py`."));
body.push(grid(["Function", "What it does", "Concept"], FUNCS, [2500, 4626, 1900], { size: 17 }));
body.push(H2("4.2 Sections of notebooks/05_advanced_models.ipynb"));
body.push(grid(["Section", "What it does", "Outputs"], NB05, [2000, 4426, 2600], { size: 17 }));
body.push(H2("4.3 Sections of notebooks/06_fairness_audit.ipynb"));
body.push(grid(["Section", "What it does", "Outputs"], NB06, [2000, 4426, 2600], { size: 17 }));
body.push(H2("4.4 Output figures (reports/figures/)"));
body.push(grid(["File", "What it shows", "How to read it"], FIGURES, [2700, 3000, 3326], { size: 17 }));

body.push(pageBreak());
body.push(H1("5. Concepts"));
body.push(P("Each concept in plain words, then in more detail, with where it appears. From the course: bootstrap and cluster sampling (Unit 04), hypothesis tests and p-values (Unit 07), decision trees with Gini and entropy (Units 08–09), the confusion matrix, precision, recall, F1, ROC and AUC (Unit 10), KNN and distances (Unit 11), cross-validation and bias in training data (Week 8), logistic regression (Week 9), ensembles (Week 12) and ethics and fairness (Week 15 and the milestone brief). The last subsection lists what comes from beyond the course."));
CONCEPTS.forEach(([group, rows], i) => {
  body.push(H2("5." + (i + 1) + " " + group));
  body.push(grid(["Concept", "In simple words", "In more detail", "Where"], rows, [1700, 2600, 3500, 1226], { size: 17, firstBold: true }));
});
body.push(H2("5." + (CONCEPTS.length + 1) + " Methods beyond the lecture slides"));
body.push(P("Most of Milestone 4 comes from the slides, the syllabus or the milestone brief (the fairness metrics, the mitigation families, the Pareto frontier, FATEN and the living lab are all named in the brief). These are the exceptions. Each is there for a reason you should be able to say in one sentence."));
body.push(grid(["Method", "Why we needed it", "One-line explanation"], BEYOND, [2300, 3600, 3126], { size: 17, firstBold: true }));

body.push(pageBreak());
body.push(H1("6. Limitations and the road to Milestone 5"));
LIMITS.forEach((b) => body.push(BUL(b)));

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
const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "DS4SG · Milestone 4 Reference", font: FONT, size: 16, color: MUTED })] })] });
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED })] })] });

const doc = new Document({
  creator: "DS4SG team", title: "Milestone 4 Reference", styles: STYLES,
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: body },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
