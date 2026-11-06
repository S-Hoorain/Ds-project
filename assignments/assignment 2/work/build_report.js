// Builds the Assignment 2 executive summary: node build_report.js report.docx
// Tables and numbers come from numbers.json (collect_numbers.py reads the notebook's exported tables),
// figures from ../group_XX/figures. Style: black text and headings, no header or footer, Times New Roman.
const fs = require("fs");
const path = require("path");
const { makeHelpers } = require("./docx_helpers");
const H = makeHelpers({ body: 21, small: 16, cap: 17, line: 245, h1: 23, h2: 21 });
const { P, H1, H2, BUL, table, figure, build, AlignmentType, Paragraph } = H;

const OUT = process.argv[2] || "report.docx";
const FIG = path.join(__dirname, "..", "group_XX", "figures");
const D = JSON.parse(fs.readFileSync(path.join(__dirname, "numbers.json"), "utf8"));
const f3 = (x) => Number(x).toFixed(3), f2 = (x) => Number(x).toFixed(2), f1 = (x) => Number(x).toFixed(1), f0 = (x) => Number(x).toFixed(0);
const comma = (x) => Number(x).toLocaleString("en-US");

const cmp = Object.fromEntries(D.t06_model_comparison.map((r) => [r["Model (grouped 5-fold CV on training patients)"], r]));
const hold = Object.fromEntries(D.t13_holdout.map((r) => [r["Model (holdout test patients)"], r]));
const fin = Object.fromEntries(D.t14_final_holdout_metrics.map((r) => [r["Unnamed: 0"], r["Holdout value"]]));
const cm = D.t15_confusion_matrix;
const TP = cm[0]["Flagged"], FN = cm[0]["Not flagged"], FP = cm[1]["Flagged"], TN = cm[1]["Not flagged"];
const thr = D.threshold;
const thrAt = (t) => D.t12_thresholds.find((r) => Math.abs(r.Threshold - t) < 1e-9);
const choices = Object.fromEntries(D.t08_cleaning_choices.map((r) => [r["Unnamed: 0"], r]));
const sub = D.t16_subgroups;
const S = (v, g) => sub.find((r) => r.Variable === v && r.Group === g);
const race = D.t17_race_input_check;
const R = (g, m) => race.find((r) => r.Group === g && r.Model.startsWith(m));
const imp = D.t10_permutation_importance;
const GB = cmp["Gradient boosting"], LR = cmp["Logistic regression"], RF = cmp["Random forest"];
const T = require("./report_text")({ D, cmp, hold, fin, TP, FN, FP, TN, thr, thrAt, choices, S, R, imp, GB, LR, RF, f3, f2, f1, f0, comma });

const body = [];
const add = (...xs) => xs.flat().forEach((x) => body.push(x));

// ---------------------------------------------------------------- title block
add(
  new Paragraph({ children: H.runs("Predicting Early Hospital Readmission for Patients with Diabetes", { size: 30, bold: true }), alignment: AlignmentType.CENTER, spacing: { after: 60 } }),
  new Paragraph({ children: H.runs("Assignment 2 executive summary  ·  CS/SDP 312/314 Data Science for Social Good", { size: 21, italics: true }), alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
  new Paragraph({ children: H.runs("Syeda Hoorain Imran (08704)  ·  Munib Sattar (09239)  ·  November 2026", { size: 20 }), alignment: AlignmentType.CENTER, spacing: { after: 160 } }),
);

// ---------------------------------------------------------------- 1
add(H1("1. Purpose and prediction target"));
T.s1.forEach((t) => add(P(t)));

// ---------------------------------------------------------------- 2
add(H1("2. Data cleaning and feature design"));
add(P(T.s2_intro));
add(table("Main cleaning and grouping choices (all inside `clean()` in predict.py).", ["Raw column(s)", "Problem", "Our choice"], T.cleaningRows, [2500, 2350, 5050], "lll"));
T.s2.forEach((t) => add(P(t)));

// ---------------------------------------------------------------- 3
add(H1("3. Validation strategy"));
T.s3.forEach((t) => add(P(t)));

// ---------------------------------------------------------------- 4
add(H1("4. Model comparison"));
add(P(T.s4_intro));
const order = ["No-skill baseline", "Prior-inpatient-visits rule", "Logistic regression", "Decision tree", "K-nearest neighbours", "Random forest", "Gradient boosting"];
const settings = {
  "No-skill baseline": "everyone gets the training rate",
  "Prior-inpatient-visits rule": "rate for 0, 1, …, 6+ prior stays",
  "Logistic regression": T.setting("Logistic regression"),
  "Decision tree": T.setting("Decision tree"),
  "K-nearest neighbours": T.setting("K-nearest neighbours"),
  "Random forest": T.setting("Random forest"),
  "Gradient boosting": T.setting("Gradient boosting"),
};
add(table("Grouped 5-fold cross-validation on the training patients and the one-time check on the holdout patients. AP = average precision (no-skill level 0.111). A lower Brier score is better.",
  ["Model", "Chosen setting", "CV AP (± SD)", "CV AUC", "CV Brier", "Holdout AP", "Holdout AUC", "Holdout Brier"],
  order.map((m) => [m, settings[m], `${f3(cmp[m].AP)} ± ${f3(cmp[m]["AP sd"])}`, f3(cmp[m].AUC), f3(cmp[m].Brier),
    hold[m] ? f3(hold[m].AP) : "–", hold[m] ? f3(hold[m].AUC) : "–", hold[m] ? f3(hold[m].Brier) : "–"]),
  [1750, 2300, 1150, 750, 800, 900, 1000, 1050], "llcccccc", null, { boldRows: [6] }));
add(figure(path.join(FIG, "f04_pr_curves.png"), T.fig1, 3.4));
T.s4.forEach((t) => add(P(t)));

// ---------------------------------------------------------------- 5
add(H1("5. Decision threshold"));
T.s5a.forEach((t) => add(P(t)));
const showT = [0.05, 0.08, 0.10, 0.12, 0.14, 0.16, 0.20, 0.30, 0.50];
add(table("Effect of the threshold on out-of-fold predictions of the training patients (gradient boosting). Cost counts 7 for a miss and 1 for an unneeded follow-up.",
  ["Threshold", "Stays flagged", "Precision", "Recall", "F1", "False alarm rate", "Cost per 100 stays"],
  showT.map((t) => { const r = thrAt(t); return [f2(t), `${f1(r["Flagged (%)"])}%`, f3(r.Precision), f3(r.Recall), f3(r.F1), f3(r["False alarm rate"]), f1(r["Cost per 100 stays"])]; }),
  [1100, 1300, 1150, 1050, 1000, 1500, 1700], "ccccccc", null, { boldRows: [showT.indexOf(thr)] }));
add(figure(path.join(FIG, "f03_threshold.png"), T.fig2, 6.6));
T.s5b.forEach((t) => add(P(t)));

// ---------------------------------------------------------------- 6
add(H1("6. Performance across patient groups"));
add(P(T.s6_intro));
const pretty = (g) => ({ AfricanAmerican: "African American" }[g] || g);
const subRows = sub.map((r) => [r.Variable === "All" ? "**All**" : r.Variable, pretty(r.Group), comma(r.Stays), comma(r["Readmitted <30"]), f1(r["Rate (%)"]), f1(r["Mean predicted (%)"]),
  r.AUC == null ? "–" : f3(r.AUC), r.AP == null ? "–" : f3(r.AP), r.Recall == null ? "–" : f3(r.Recall), f3(r["False alarm rate"])]);
add(table("Final model on the holdout patients by group, at the submitted threshold. Rate = observed early-readmission rate. Recall = share of the group's early readmissions caught. False alarm rate = share of the group's other stays that are flagged.",
  ["Variable", "Group", "Stays", "Readm. <30", "Rate (%)", "Mean pred. (%)", "AUC", "AP", "Recall", "False alarm"],
  subRows, [850, 1600, 800, 900, 850, 1050, 750, 750, 800, 1000], "llcccccccc", null, { boldRows: [0] }));
T.s6.forEach((t) => add(P(t)));

// ---------------------------------------------------------------- 7
add(H1("7. Limitations and recommendations"));
T.s7.forEach((t) => add(BUL(t)));

add(H2("References"));
T.refs.forEach((t) => add(P(t, { after: 40, size: 18, align: AlignmentType.LEFT })));

build(OUT, { creator: "Syeda Hoorain Imran, Munib Sattar", title: "Predicting Early Hospital Readmission for Patients with Diabetes" }, body, 1000);
