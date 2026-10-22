// Builds "DS4SG_M3_Reference.docx": the Milestone 3 reference and viva guide (files, concepts, decisions, numbers).
// Usage (from a folder where the npm package "docx" is installed, or with NODE_PATH pointing at its node_modules):
//   node tools/build_m3_reference_doc.js DS4SG_M3_Reference.docx
// The contents list is static (clickable links to bookmarked headings), so no field update is needed in Word.
// Same layout as tools/build_reference_doc.js (the project-wide script and data reference).
// Every number comes from notebooks/03_baseline_models.ipynb, notebooks/04_hypothesis_tests.ipynb and
// reports/tables/m3_*.csv (run of 2026-10-21).
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, BorderStyle, LevelFormat, PageOrientation, Header, Footer,
  PageNumber, PageBreak, VerticalAlign, TableLayoutType, Bookmark, InternalHyperlink,
} = require("docx");

const OUT = process.argv[2] || "DS4SG_M3_Reference.docx";
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
// ---------------------------------------------------------------- rubric map
const RUBRIC = [
  ["A. Naive benchmark", "35%", "majority class + persistence; `make_benchmarks()`; nb03 §3", "Majority class = always 'no shock' (accuracy floor). Persistence = 'next week like this week'."],
  ["A. Two+ ML models", "35%", "logistic regression, KNN, shallow decision tree; `make_models()`; nb03 §4", "Three complementary learners: linear and interpretable, analogue/non-parametric, rule-based."],
  ["A. Model justification", "35%", "nb03 §4 table; manuscript IV-C, Table 15", "LR = the form of H1 (odds ratios); KNN = 'weeks like this one'; tree = auditable if-then alarm rules."],
  ["B. Split ratio + stratification", "35%", "nb03 §1; decision B2", "74.8 / 25.2 chronological split; stratified random split rejected (leaks future, splits sister rows); imbalance handled by weights, threshold and metrics."],
  ["B. Leakage-free CV", "35%", "`time_series_folds()`; nb03 §2 and §5; decision B3", "Expanding window, 4 folds = years 2021–24, whole weeks; scaling inside pipelines; shuffled K-fold shown to inflate AUC by 0.05–0.14."],
  ["B. Hyperparameter tuning", "35%", "`grid_search_time_cv()`; nb03 §4; Figure B2", "Exhaustive grids (48 / 44 / 98 settings); selection by pooled out-of-fold AUC; validation curves."],
  ["C. Metrics", "30%", "`classification_metrics()`; nb03 §6; Table 19 of manuscript", "Accuracy, precision, recall, specificity, F1, ROC-AUC, plus PR-AUC and Brier; week-bootstrap CIs."],
  ["C. Asymmetric error costs", "30%", "nb03 §7; Figure B4; decision B7", "FN costs 5 × FP (FAO 7:1 evidence, irreversibility); threshold minimises expected cost; ratios 1–20 tested."],
  ["C. Confusion matrices + edge cases", "30%", "nb03 §8; Figures B5, B6; `m3_test_shock_weeks.csv`", "Models miss first waves, tariff hikes and perishable spikes; false alarms follow past shocks."],
  ["D. Feature importance", "20%", "nb03 §9; Figure B7", "LR standardised coefficients, odds ratios, tree Gini, permutation importance: rupee depreciation and recent momentum lead."],
  ["D. Policy takeaways", "20%", "nb03 §12; manuscript V-G", "Watch the rupee; front-load support before 1 July; coordinate on administered prices; recalibrate alarms by regime."],
  ["D. Roadmap for M4", "20%", "nb03 §12; manuscript V-H", "Ensembles, calibration, tariff calendar, fairness audit (H5), ethics."],
  ["Notebook + PDF quality", "15%", "nb03, nb04 run top to bottom; manuscript PDF", "Well-commented notebooks; script reproduces notebook numbers exactly."],
];

// ---------------------------------------------------------------- run order
const STEPS = [
  ["1", "`python src/features/build_features.py`", "`master_model_ready.csv`, `items_weekly_panel.csv`, `islamic_events.csv`", "`master_features.csv` (unchanged since M2; re-run only if data change)"],
  ["2", "`python src/models/train_baselines.py`", "`master_features.csv`", "`models/m3_baselines/*`, `reports/tables/m3_cv_*`, `m3_test_metrics.csv`, `m3_predictions.csv`"],
  ["3", "run `notebooks/03_baseline_models.ipynb`", "`master_features.csv`, `items_weekly_panel.csv`", "figures B1–B8, all `m3_*` model tables, `models/m3_baselines/*` (same numbers as step 2)"],
  ["4", "run `notebooks/04_hypothesis_tests.ipynb`", "`master_features.csv`", "figures B9–B10, `m3_h2_*`, `m3_h3_*`"],
  ["5", "`python tools/prepare_manuscript_figures.py`", "`reports/figures/*.png`", "caption-free copies in `manuscript/figures/`"],
  ["6", "`node tools/build_manuscript_m3.js manuscript/M3_manuscript_sections_IV_V.docx`", "`manuscript/figures/figB*.png`", "the M3 manuscript (Word); export to PDF from Word"],
];

// ---------------------------------------------------------------- files
const FILES = [
  {
    path: "src/models/baseline.py", type: "Python module (imported, not run directly)",
    what: "The single home of all Milestone 3 modelling code. It defines the feature lists, loads and splits the data, builds the cross-validation folds, defines the three model pipelines and their hyperparameter grids, runs the grid search, computes every metric, chooses the cost-based alarm threshold, and implements the DeLong test and the week-block bootstrap. Its docstring lists decisions B1–B8.",
    why: "Keeping the logic in one module means the notebook and the command-line script use the same code and give identical numbers (a reproducibility requirement in the rubric), and the notebook stays readable.",
    reads: ["`data/processed/master_features.csv` (via `load_model_data()`)"],
    writes: ["`models/m3_baselines/*.joblib` and `model_card.json` (via `save_models()`)"],
    run: "Imported: `from models import baseline as B` (after adding `src/` to the path).",
    concepts: "pipelines, time-series cross-validation, grid search, out-of-fold predictions, ROC-AUC, cost-sensitive thresholds, DeLong test, block bootstrap, cluster-robust logit.",
  },
  {
    path: "src/models/train_baselines.py", type: "Python script (command line)",
    what: "Runs the core modelling pipeline end to end without the notebook: load and split, build folds, grid-search the three models, choose thresholds on out-of-fold predictions, score benchmarks and models on the test period, save fitted models and tables, and print a summary.",
    why: "The rubric asks for clean modular scripts for training and evaluation, separate from the narrative notebook. Running it reproduces the notebook's predictions exactly (checked).",
    reads: ["`data/processed/master_features.csv`"],
    writes: ["`models/m3_baselines/{logistic_regression,knn,decision_tree}.joblib`, `model_card.json`", "`reports/tables/m3_cv_grid_*.csv`, `m3_cv_folds.csv`, `m3_test_metrics.csv`, `m3_predictions.csv`"],
    run: "`python src/models/train_baselines.py` (about 30 seconds; use the project `.venv`).",
    concepts: "reproducibility, separation of code and narrative, model artifacts.",
  },
  {
    path: "notebooks/03_baseline_models.ipynb", type: "Jupyter notebook (kernel 'DS4SG (.venv)')",
    what: "The main M3 deliverable. Twelve sections walk through the data split, the validation design, the benchmarks, model justification and tuning, a leakage demonstration, test-period metrics, asymmetric costs, confusion matrices and misclassified weeks, feature importance, the formal H1 test, saved artifacts, and the summary, policy takeaways and M4 roadmap. Every result is printed, plotted and interpreted in markdown.",
    why: "The rubric's executable notebook: all data splits, CV runs, model fits and metrics, documented for the SDP members of the team.",
    reads: ["`data/processed/master_features.csv`", "`data/processed/items_weekly_panel.csv` (edge-case drivers)", "code: `src/models/baseline.py`, `src/utils/plot_style.py`, `component()` from `src/features/build_features.py`"],
    writes: ["`reports/figures/figB1`–`figB8`", "`reports/tables/m3_*.csv` (all model tables)", "`models/m3_baselines/*`"],
    run: "Open in Jupyter/VS Code with the DS4SG kernel and Run All (2–4 minutes, depending on the machine), or `jupyter nbconvert --to notebook --execute --inplace notebooks/03_baseline_models.ipynb`.",
    concepts: "everything in Section 5 of this document.",
  },
  {
    path: "notebooks/04_hypothesis_tests.ipynb", type: "Jupyter notebook",
    what: "Tests hypotheses H2 (exchange-rate pass-through larger for Q5) and H3 (rotating burden: food widens and energy narrows the Q1–Q5 gap), promised in the M2 manuscript. Uses OLS with Newey–West (HAC) standard errors on the training period, with full-sample robustness checks, and an exploratory split of food and energy into components.",
    why: "Initial findings for the research questions about how the burden differs by quintile; they inform which signals matter for whom (and the M4 fairness work).",
    reads: ["`data/processed/master_features.csv`"],
    writes: ["`reports/figures/figB9_fx_passthrough_test.png`, `figB10_rotating_burden_test.png`", "`reports/tables/m3_h2_*.csv`, `m3_h3_*.csv`"],
    run: "Run All (a few seconds).",
    concepts: "OLS, HAC standard errors, one-sided tests, difference regression, exploratory vs confirmatory analysis.",
  },
  {
    path: "models/m3_baselines/", type: "Folder of model artifacts (joblib + JSON)",
    what: "`logistic_regression.joblib`, `knn.joblib`, `decision_tree.joblib`: the three fitted scikit-learn pipelines (scaler + model), refitted on all training weeks with their selected hyperparameters. `model_card.json`: the 18 features, training end date, validation years, cost weights, scikit-learn version, and for each model its selected settings, CV scores and alarm threshold.",
    why: "The rubric's model artifacts. Anyone can load a model and predict without re-training: `joblib.load('models/m3_baselines/knn.joblib').predict_proba(X)`.",
    reads: [], writes: [],
    run: "Written by nb03 §11 and by `train_baselines.py`. Load with the same scikit-learn version (1.9.1).",
    concepts: "model persistence, model cards (documentation of a model's intended use and settings).",
  },
  {
    path: "tools/build_manuscript_m3.js", type: "Node.js script (docx-js)",
    what: "Builds the M3 manuscript sections IV (Baseline Models and Experimental Setup) and V (Results and Initial Findings) as a Word document. Numbering continues the submitted M2 draft (Section IV, Table 14, Fig. 7, reference [11]). Black text, Times New Roman, no header or footer, three-rule tables.",
    why: "Building the manuscript from code keeps every number traceable to the notebooks and makes re-runs easy.",
    reads: ["`manuscript/figures/figB*.png`"],
    writes: ["`manuscript/M3_manuscript_sections_IV_V.docx` (then exported to `milestones/M3_baseline_model/M3_manuscript_sections_IV_V.pdf`)"],
    run: "`node tools/build_manuscript_m3.js manuscript/M3_manuscript_sections_IV_V.docx` (needs the npm package `docx`); word count: `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx` (3,000 body words).",
    concepts: "IEEE-style manuscript, reproducible documents.",
  },
  {
    path: "tools/prepare_manuscript_figures.py", type: "Python script",
    what: "Makes manuscript copies of the figures with the caption printed in the image cropped off (the manuscript sets captions as text). Now covers the M3 figures B1–B5, B7 and B10 as well as the M2 figures.",
    why: "Avoids each caption appearing twice in the PDF.",
    reads: ["`reports/figures/*.png`"], writes: ["`manuscript/figures/*.png`"],
    run: "`python tools/prepare_manuscript_figures.py`", concepts: "",
  },
  {
    path: "milestones/M3_baseline_model/", type: "Folder: brief and submission",
    what: "`M3_rubric.md` (the grading specification) and `M3_manuscript_sections_IV_V.pdf` (the manuscript to submit with the notebooks).",
    why: "One place for what is graded and what is submitted.",
    reads: [], writes: [], run: "", concepts: "",
  },
];

// Support files carried over from earlier milestones and used in M3
const SUPPORT = [
  ["`data/processed/master_features.csv`", "Model input: 2,220 rows (370 weeks × 6 groups) × 105 columns. M3 uses the Q1–Q5 rows, the target `target_shock_next` and 18 feature columns.", "`src/features/build_features.py` (M2)"],
  ["`data/processed/items_weekly_panel.csv`", "51 items × 370 weeks with prices, weekly % changes, weights and PBS item impacts. Used only to name the driver of each test-period shock.", "notebook 01 (M2)"],
  ["`data/processed/FEATURES_DICTIONARY.md`", "Meaning of every feature column (e.g. `fx_chg_8w`, `shocks_last_4w`).", "`build_features.py`"],
  ["`src/features/build_features.py`", "Defines the features; nb03 imports its `component()` function to classify items (utilities, motor fuel, perishables, staples …).", "M2"],
  ["`src/utils/plot_style.py`", "Shared colour-blind-safe palette and figure style (Q1 orange, Q5 blue).", "M2"],
  ["`tools/word_count_body.py`", "Counts body words of a manuscript .docx, excluding tables, captions and references.", "M2"],
];

// Functions of src/models/baseline.py
const FUNCS = [
  ["`load_model_data()`", "Reads `master_features.csv`, keeps Q1–Q5 rows, drops rows with a missing feature or target (45 rows = 9 weeks), adds a `split` column (train ≤ 2024-12-31, else test).", "listwise deletion (B8), chronological split (B2)"],
  ["`split_train_test(df)`", "Returns the train and test parts.", "hold-out test set"],
  ["`time_series_folds(train)`", "Four (train, validation) index pairs: validation = all weeks of 2021, 2022, 2023 or 2024; train = every earlier week.", "expanding-window CV (B3)"],
  ["`random_folds(train, by_week)`", "Shuffled stratified K-fold by rows, or grouped by week. Used ONLY to show how much shuffled CV overstates performance.", "data leakage demonstration"],
  ["`fold_table(train, folds)`", "Dates, sizes and shock rates of each fold.", "documentation of the CV design"],
  ["`make_models()`", "The three pipelines and their grids: LR = StandardScaler + LogisticRegression(saga); KNN = ColumnTransformer(scale continuous only) + KNeighborsClassifier; tree = DecisionTreeClassifier.", "pipelines, scaling (B4), regularisation, k, depth"],
  ["`grid_search_time_cv(pipe, grid, X, y, folds)`", "For every setting: train on each fold's training weeks, predict its validation year; keep pooled out-of-fold AUC (selection), mean and SD of per-fold AUCs, train AUC. Refits the best setting on all training weeks. Returns the results table, the fitted model and its out-of-fold predictions.", "grid search, pooled vs mean AUC (B5), over/underfitting"],
  ["`oof_predict(estimator, X, y, folds)`", "Out-of-fold probabilities for one fixed model (used for the benchmarks).", "out-of-fold predictions"],
  ["`cv_permutation_importance(...)`", "Per fold: fit, shuffle one feature at a time in the validation year, record the AUC drop; averaged over folds and 20 repeats.", "permutation importance"],
  ["`Persistence` (class)", "Benchmark: predicts a shock next week if this week's SPI rose by ≥ 1%.", "naive forecast"],
  ["`make_benchmarks()`", "Majority class (`DummyClassifier(strategy='prior')`) and persistence.", "naive benchmarks"],
  ["`classification_metrics(y, p, threshold)`", "Confusion-matrix counts and accuracy, precision, recall, specificity, F1, ROC-AUC, PR-AUC, Brier, number of alerts and expected cost.", "all rubric metrics"],
  ["`expected_cost(y, p, t)` / `best_threshold(y, p)`", "Cost = 1 × FP + 5 × FN at threshold t; the best threshold minimises it over 0.01–0.99 (middle of any tie).", "cost-sensitive threshold (B7)"],
  ["`trivial_policy_costs(y)`", "Cost of never alerting (every shock missed) and of always alerting (every calm week a false alarm).", "reference policies for the cost analysis"],
  ["`fit_logit(d, cols)` / `logit_predict(...)`", "Unpenalised logit (statsmodels) with standard errors clustered by week; prediction helper.", "H1 test, odds ratios, cluster-robust SE"],
  ["`save_models(fitted, card)`", "Writes the joblib files and the model card.", "model artifacts"],
  ["`delong_test(y, p_a, p_b)`", "DeLong test that two AUCs on the same rows are equal (fast midrank algorithm); returns both AUCs, z and p-values.", "comparing correlated AUCs"],
  ["`week_block_bootstrap(y, scores, weeks)`", "Resamples whole test weeks 2,000 times and recomputes each AUC.", "block bootstrap, confidence intervals"],
];

// Notebook 03 sections
const NB03 = [
  ["§1 Data and split", "Loads data, prints split sizes and ratio (74.8/25.2), class balance by group (17.2% vs 7.7% shocks).", "`m3_class_balance.csv`"],
  ["§2 Validation framework", "Builds the 4 yearly folds, asserts no week is on both sides, draws Figure B1, leakage checklist.", "`m3_cv_folds.csv`, figB1"],
  ["§3 Naive benchmarks", "Majority class and persistence, scored out-of-fold.", "—"],
  ["§4 Models and tuning", "Justification table; grid search of the three pipelines; selected settings; validation curves.", "`m3_cv_grid_*.csv`, `m3_cv_summary.csv`, figB2"],
  ["§5 Why time-aware CV matters", "Re-scores the tuned models with shuffled K-fold (rows; whole weeks) vs our design.", "`m3_cv_design_comparison.csv`"],
  ["§6 Test-period evaluation", "Thresholds from out-of-fold cost; full metric tables for validation years and test; bootstrap CIs; ROC/PR curves; metrics by quintile.", "`m3_oof_metrics.csv`, `m3_test_metrics.csv`, `m3_predictions.csv`, `m3_test_auc_bootstrap.csv`, `m3_test_metrics_by_group.csv`, figB3"],
  ["§7 Asymmetric costs", "FP vs FN consequences; Q1 shock size and persistence; cost-ratio sensitivity; cost curves.", "`m3_cost_sensitivity.csv`, figB4"],
  ["§8 Confusion matrices and edge cases", "Confusion matrices; every test shock week with its driver and which models caught it; false-alarm profile; week-by-week forecasts for Q1 and Q5.", "`m3_test_shock_weeks.csv`, `m3_false_alarm_profile.csv`, figB5, figB6"],
  ["§9 Feature importance", "LR standardised coefficients; unpenalised odds ratios; tree Gini; permutation importance; tree rules.", "`m3_feature_importance.csv`, `m3_odds_ratios.csv`, figB7, figB8"],
  ["§10 H1 test", "In-sample LR and week-clustered Wald tests; out-of-sample AUC comparison with DeLong and week-block bootstrap.", "`m3_h1_tests.csv`, `m3_h1_signal_odds_ratios.csv`"],
  ["§11 Save artifacts", "Saves the three fitted pipelines and the model card.", "`models/m3_baselines/*`"],
  ["§12 Summary", "Findings, policy takeaways, limitations, M4 roadmap.", "—"],
];

const NB04 = [
  ["§1 H2 pass-through", "`passthrough(h)`: per-quintile regressions of the next-h-week SPI change on the 8-week rupee change (+ controls), and the Q5 − Q1 difference regression; robustness over horizons 4/8/13, with/without controls, training vs full sample.", "`m3_h2_passthrough_by_quintile.csv`, `m3_h2_difference_tests.csv`, figB9"],
  ["§2 H3 rotating burden", "`gap_regression()`: Q1 − Q5 weekly gap on food and energy inflation (+ controls, period dummies); exploratory split into five components.", "`m3_h3_gap_regression.csv`, `m3_h3_components_exploratory.csv`, figB10"],
  ["§3 Summary", "Decision table for H2 and H3.", "—"],
];

// ---------------------------------------------------------------- outputs
const FIGURES = [
  ["`figB1_cv_design.png`", "The four expanding-window folds and the final train/test split, with shock rates.", "Blue = training weeks, orange = validation year, green = test. Training always precedes validation."],
  ["`figB2_validation_curves.png`", "ROC-AUC as one hyperparameter varies (C, k, depth).", "Dashed (training) rises with flexibility; solid (validation) does not: the gap is overfitting."],
  ["`figB3_roc_pr_test.png`", "ROC and precision–recall curves on 2025–26.", "Higher/left is better; diagonal (ROC) and the 7.7% line (PR) are no skill; dots = chosen operating points."],
  ["`figB4_cost_analysis.png`", "Cost of every threshold (top) and sensitivity to the FN:FP ratio (bottom).", "Below 1 = cheaper than doing nothing. Solid (2021–24) below 1, dashed (test) above 1 at the chosen thresholds."],
  ["`figB5_confusion_matrices.png`", "Confusion matrices of the three models and persistence on the test period.", "Rows = what happened; columns = what the model said. Top-right = false alarms, bottom-left = misses."],
  ["`figB6_test_timeline.png`", "Week-by-week predicted probabilities for Q1 and Q5, with hits and misses.", "Filled dot = caught shock; open dot = missed shock; dotted line = alarm threshold."],
  ["`figB7_feature_importance.png`", "LR relative coefficients, tree Gini importance, permutation importance.", "Long bars/large drops = important. Rupee depreciation and recent momentum lead."],
  ["`figB8_decision_tree.png`", "First three levels of the tuned tree.", "Each box: the split, share of training rows, class shares. First split: rupee fell > 8% in 8 weeks."],
  ["`figB9_fx_passthrough_test.png`", "Exchange-rate pass-through by quintile and horizon (H2).", "Overlapping intervals at the same height: no difference between Q1 and Q5."],
  ["`figB10_rotating_burden_test.png`", "What widens (orange) or narrows (blue) the Q1 − Q5 gap (H3).", "Food (above all perishables) hits the poor harder; motor fuel and LPG hit the rich harder. Utility tariffs lean towards the poor but their interval crosses zero."],
];

const TABLES = [
  ["`m3_class_balance.csv`", "Shock rows and rates by group, train vs test.", "nb03 §1"],
  ["`m3_cv_folds.csv`", "Dates, sizes and shock rates of the four folds.", "nb03 §2, script"],
  ["`m3_cv_grid_logistic_regression.csv`, `…_knn.csv`, `…_decision_tree.csv`", "Every hyperparameter setting with pooled AUC, per-fold AUCs, their mean and SD, and train AUC.", "nb03 §4, script"],
  ["`m3_cv_summary.csv`", "Selected setting of each model plus benchmarks: pooled and per-year AUC.", "nb03 §4"],
  ["`m3_cv_design_comparison.csv`", "Mean fold AUC under shuffled K-fold (rows), shuffled (weeks) and our design.", "nb03 §5"],
  ["`m3_oof_metrics.csv`, `m3_test_metrics.csv`", "All metrics at the chosen thresholds, validation years and test period.", "nb03 §6 (test also script)"],
  ["`m3_predictions.csv`", "Test-period predicted probabilities of every model, per quintile-week.", "nb03 §6, script"],
  ["`m3_test_auc_bootstrap.csv`", "Test AUC with 95% week-bootstrap interval.", "nb03 §6"],
  ["`m3_test_metrics_by_group.csv`", "Recall, specificity, AUC, misses and false alarms by quintile.", "nb03 §6"],
  ["`m3_cost_sensitivity.csv`", "Thresholds and relative costs for FN:FP = 1, 2, 3, 5, 10, 20.", "nb03 §7"],
  ["`m3_test_shock_weeks.csv`, `m3_false_alarm_profile.csv`", "Every test shock week with driver and catches; signals present in false-alarm weeks.", "nb03 §8"],
  ["`m3_feature_importance.csv`, `m3_odds_ratios.csv`", "All importance measures; unpenalised odds ratios with clustered CIs.", "nb03 §9"],
  ["`m3_h1_tests.csv`, `m3_h1_signal_odds_ratios.csv`", "H1 test statistics and p-values; odds ratios of the six signals.", "nb03 §10"],
  ["`m3_h2_*.csv`, `m3_h3_*.csv`", "Pass-through estimates and difference tests; gap regressions.", "nb04"],
];

// ---------------------------------------------------------------- concepts (simple, detailed, where used)
const CONCEPTS = [
  ["Validation and leakage", [
    ["Train/test split", "Keep some data aside that the model never sees until the very end, to check it works on new data.", "The test set estimates performance on future data. Here the split is by date: train = Oct 2019–Dec 2024, test = Jan 2025–Sep 2026 (74.8/25.2 by weeks). It is used exactly once.", "nb03 §1"],
    ["Data leakage", "The model accidentally gets information it would not have at prediction time, so it looks better than it really is.", "Typical leaks: training on future weeks, scaling with statistics computed on validation/test data, features built from future values, choosing settings on the test set. Each is closed in our design (nb03 §2 checklist).", "nb03 §2, §5"],
    ["K-fold cross-validation", "Split the training data into K parts; train on some, test on the rest, rotate, and average the scores.", "Gives a more stable estimate than one split and shows variance across folds. Standard K-fold shuffles rows, which is wrong for time series; we use the forward-chaining variant.", "nb03 §2"],
    ["Expanding-window (forward-chaining) CV", "Always train on the past and test on the next period, adding history each time.", "Fold k trains on all weeks before year 2020+k and validates on that year (K = 4). Respects time order, mimics a real forecaster, and lets us see how performance varies by year (13–33% shock rates).", "`time_series_folds()`"],
    ["Stratified sampling", "Split so that each part has the same share of each class (e.g. 17% shocks).", "Needs random assignment of rows, which would put future weeks in training and split a week's five quintile rows; rejected for time series. Shown in §5 to inflate AUC.", "nb03 §1, §5"],
    ["Out-of-fold (OOF) prediction", "A prediction for a week made by a model that never saw that week.", "Collecting OOF predictions over all validation years lets us choose thresholds and compute pooled AUC honestly.", "`grid_search_time_cv()`"],
    ["Pooled vs mean fold AUC", "Pooled: one AUC over all validation predictions together. Mean: average of each year's AUC.", "Mean rewards ranking within each year; pooled also requires probability levels to be comparable across years, which a single alarm threshold needs. We select by pooled AUC and report mean ± SD.", "decision B5"],
    ["Pipeline", "A chain 'scale → model' treated as one object.", "Guarantees the scaler is fitted only on each fold's training rows, so no information leaks from validation data.", "`make_models()`"],
  ]],
  ["Models", [
    ["Majority-class benchmark", "Always predicts the most common class ('no shock').", "Accuracy equals the share of calm weeks (92.3% in test) while catching nothing; AUC 0.5. Shows why accuracy is misleading with imbalance.", "nb03 §3"],
    ["Persistence benchmark", "'Next week will be like this week.'", "Predicts a shock if this week rose ≥ 1%. Tests whether shocks cluster (CV AUC 0.58; test 0.47).", "`Persistence`"],
    ["Logistic regression", "Adds up weighted features into a score, then turns the score into a probability between 0 and 1.", "log(p/(1−p)) = b0 + b1x1 + … Coefficients are changes in log-odds; exp(coefficient) = odds ratio. Linear in the log-odds, no interactions unless added.", "nb03 §4, §9, §10"],
    ["Regularisation (L1, L2, C)", "A penalty that keeps coefficients small so the model does not chase noise.", "L2 (ridge) shrinks all coefficients; L1 (lasso) can set some to zero. C = 1/penalty strength: small C = strong penalty. Our best: C = 0.0001, L2 — a strongly shrunk model, because the signal is weak and shifts over time.", "grid, Figure B2"],
    ["Class weights ('balanced')", "Make each rare shock count more during training.", "Weights each class inversely to its frequency so the model does not ignore the minority class. Side effect: probabilities are no longer calibrated (centred near 0.5 for LR).", "grids for LR and tree"],
    ["k-nearest neighbours (KNN)", "Find the k most similar past weeks and use the share of them that were followed by a shock.", "Non-parametric 'analogue' forecast. Small k = flexible (overfits); large k = smooth (underfits). Needs scaled features because it uses distances. Selected k = 100, uniform weights, z-scores.", "nb03 §4"],
    ["Distance weighting (KNN)", "Closer neighbours get a bigger vote.", "Gives training AUC = 1.0 (each training row is its own neighbour) — memorisation without validation gain.", "grid"],
    ["Decision tree", "A flow-chart of yes/no questions that ends in a prediction.", "Each split picks the feature and cut-off that most reduce impurity. max_depth and min_samples_leaf limit complexity. Selected: depth 4, leaves ≥ 40 rows. First split: rupee fell > 8% in 8 weeks.", "nb03 §4, §9"],
    ["Gini impurity", "How mixed a group is (0 = all one class).", "Gini = 1 − Σ p_k². A split is good if it lowers the weighted Gini of the child groups.", "tree"],
    ["Scaling (z-score, Min-Max)", "Put features on comparable scales.", "z = (x − mean)/SD; Min-Max = (x − min)/(max − min). Min-Max is hurt by outliers (heavy tails squeeze normal weeks together); z-score won for KNN (0.64 vs 0.53).", "Unit 04; `make_models()`"],
  ]],
  ["Metrics", [
    ["Confusion matrix", "A 2 × 2 count of right and wrong predictions.", "TP = shock caught; FN = shock missed; FP = false alarm; TN = calm week left alone. All threshold metrics come from these four counts.", "Figure B5"],
    ["Accuracy", "Share of all predictions that were right.", "(TP + TN) / all. Misleading with rare events: never alerting scores 92.3% in the test.", "Table 19"],
    ["Precision", "Of the alarms, how many were right?", "TP / (TP + FP). Low when shocks are rare (base-rate effect): 0.10–0.14 in test.", ""],
    ["Recall (sensitivity)", "Of the real shocks, how many did we catch?", "TP / (TP + FN). KNN 0.57 in test.", ""],
    ["Specificity", "Of the calm weeks, how many did we correctly leave alone?", "TN / (TN + FP). Trade-off with recall as the threshold moves.", ""],
    ["F1 score", "One number balancing precision and recall.", "Harmonic mean 2PR/(P+R); low if either is low.", ""],
    ["ROC curve and ROC-AUC", "How well the model ranks shock weeks above calm weeks, over all thresholds.", "ROC plots recall against false-positive rate. AUC = probability a random shock row scores higher than a random calm row: 0.5 = chance, 1 = perfect. Threshold-free and insensitive to the shock rate.", "Figure B3"],
    ["PR curve and PR-AUC", "Precision against recall over all thresholds.", "Focuses on the rare class; no-skill level = shock rate (0.077). More informative than ROC under imbalance.", "Figure B3"],
    ["Brier score", "Average squared error of the predicted probabilities.", "Mean of (p − y)²; lower is better. Measures calibration (does 20% mean 20%?). LR 0.238 is poor because its probabilities sit near 0.5.", ""],
    ["Calibration", "Whether predicted probabilities match observed frequencies.", "Needed if officials read the probability itself. Class weights and heavy shrinkage break it; M4 will calibrate (Platt, isotonic).", ""],
  ]],
  ["Costs and thresholds", [
    ["Decision threshold", "The probability above which we raise an alarm.", "Default 0.5 is arbitrary. We pick the threshold that minimises expected cost on out-of-fold predictions.", "`best_threshold()`"],
    ["Asymmetric error costs", "Missing a shock hurts more than a false alarm.", "We weight a miss (FN) as 5 false alarms (FP). Expected cost = 1 × FP + 5 × FN.", "nb03 §7"],
    ["Bayes-optimal threshold", "With true probabilities, alert when p ≥ c_FP / (c_FP + c_FN).", "= 1/6 ≈ 0.17 at 5:1. Only valid for calibrated probabilities, hence our empirical choice.", "nb03 §6"],
    ["Trivial policies", "Never alert, or always alert.", "The cheaper of the two is the benchmark any model must beat on cost. In 2021–24 at 5:1 always-alert was cheaper (shock rate 19.5% > 1/6); in the test never-alert was.", "`trivial_policy_costs()`"],
    ["Prior shift / base-rate effect", "The share of shocks changes between periods.", "Shock rate 17% (train) → 8% (test). Ranking can stay similar but precision falls and fixed thresholds over-alert.", "nb03 §1, §7"],
  ]],
  ["Feature importance", [
    ["Standardised coefficient", "Effect of a one-standard-deviation change in a feature.", "Because all LR inputs are z-scored, coefficients are comparable across features. We show them relative to the largest.", "Figure B7"],
    ["Odds ratio", "How many times the odds of a shock multiply when a feature rises by one unit.", "exp(coefficient) from the unpenalised logit: rupee +1% → odds × 1.11; fiscal-year start → odds × 5.3 (from only five fiscal years, so the 95% interval is 1.4–19.5).", "`m3_odds_ratios.csv`"],
    ["Gini importance", "How much a feature helped the tree separate shocks from calm weeks.", "Share of the total impurity reduction from splits on that feature (rupee 0.45).", "Figure B7"],
    ["Permutation importance", "Shuffle one feature and see how much worse the model gets.", "Mean drop in validation AUC over folds and repeats; works for any model (including KNN); computed on the validation years, not the test.", "`cv_permutation_importance()`"],
  ]],
  ["Statistical tests", [
    ["Hypothesis test, p-value", "Assume no effect (H0); p = how surprising our data would be if H0 were true.", "Reject H0 when p < 0.05 (Unit 07). One-sided tests when M2 stated a direction.", "nb03 §10, nb04"],
    ["Likelihood-ratio (LR) test", "Compare a model with and without the signals.", "2 × (log-likelihood difference) ~ χ²(6). Assumes independent rows, so overstated here (χ² = 94).", "H1"],
    ["Wald test, clustered SE", "Test whether coefficients are zero using their standard errors.", "Standard errors clustered by week treat a week's five quintile rows as one block of evidence: χ²(6) = 22.4, p = 0.001.", "H1"],
    ["DeLong test", "Are two AUCs on the same rows different?", "Uses each row's contribution to the AUC to get the variance of the difference (Sun & Xu fast algorithm). Assumes independent rows.", "`delong_test()`"],
    ["Block bootstrap", "Resample whole weeks many times to see how much a result could vary.", "2,000 resamples of test weeks (all five rows together) give 95% intervals for AUCs and AUC differences.", "`week_block_bootstrap()`"],
    ["HAC (Newey–West) SE", "Standard errors that allow weekly errors to be correlated over time.", "Without them, p-values would be too small. Lags = horizon + 2 for overlapping windows.", "nb04"],
    ["Difference regression", "Regress Q5's minus Q1's outcome on the shared driver.", "Its slope equals β_Q5 − β_Q1 directly, with one standard error that already handles the correlation between the groups.", "H2"],
  ]],
  ["Bias and variance", [
    ["Overfitting", "The model memorises training data and does worse on new data.", "Seen as training AUC rising while validation AUC falls (KNN k = 5: 0.98 vs 0.56).", "Figure B2"],
    ["Underfitting", "The model is too simple to capture the pattern.", "Both training and validation scores low. Our baselines underfit a weak signal (CV AUC ≈ 0.64).", "nb03 §12"],
    ["Validation curve", "A plot of score against a hyperparameter.", "Shows the bias–variance trade-off and where the best setting lies.", "Figure B2"],
    ["Grid search", "Try every combination of candidate settings and keep the best.", "Exhaustive and transparent; 48 (LR), 44 (KNN), 98 (tree) settings × 4 folds.", "`grid_search_time_cv()`"],
  ]],
];

// ---------------------------------------------------------------- decisions
const DECISIONS = [
  {
    id: "B1", title: "Model the five quintiles only; leave out the Combined index",
    simple: "The national (Combined) index is basically an average of the five quintiles, so including it would repeat the same week's information.",
    detail: "Combined is a weighted average of Q1–Q5. Adding it would give each week six nearly duplicated rows and weight the middle quintiles more. The research question is about quintiles, so rows are quintile-weeks (5 per week; 1,805 rows after deletion).",
    alt: "Separate models per quintile (too few shocks per group: about 41–51 in training) — left for M4 (H4).",
    where: "`load_model_data()` (`GROUPS`)",
  },
  {
    id: "B2", title: "Chronological train/test split, fixed in M2: train ≤ 2024, test 2025–26",
    simple: "We train on the past and test on the most recent period, like a real forecaster. We do not shuffle.",
    detail: "Train = 270 weeks (31 Oct 2019–26 Dec 2024, 1,350 rows); test = 91 weeks (2 Jan 2025–24 Sep 2026, 455 rows): 74.8/25.2 by weeks. The boundary was stated in the M2 manuscript before any model existed, so it cannot have been chosen to flatter results. Stratified random splitting was rejected: it would train on 2025 to predict 2022 and split the five sister rows of a week (which share all week-level features) across train and test.",
    alt: "70/30 or 80/20 random stratified split (rubric example) — invalid for time series. Imbalance is handled by B6 instead.",
    where: "`TRAIN_END`, `load_model_data()`, nb03 §1",
  },
  {
    id: "B3", title: "Expanding-window CV with one calendar year per fold (K = 4), whole weeks together, no gap",
    simple: "To tune the models we pretend to be in 2021, 2022, 2023 and 2024 in turn: train on everything before that year and test on that year.",
    detail: "Fold k validates on year 2020 + k and trains on all earlier weeks. Calendar years guarantee each block has one fiscal-year start, one Ramadan and one Eid ul-Adha (equal 45-week blocks would not). A week's five rows stay together. No gap is needed because the target is one week ahead (gap = horizon − 1 = 0). The first fold trains on 62 weeks; validation shock rates are 13%, 33%, 20% and 12%, so folds cover calm and crisis years.",
    alt: "Shuffled stratified K-fold (§5 shows it inflates AUC by 0.05–0.14); sklearn TimeSeriesSplit with equal blocks (first fold only 45 weeks, uneven calendar coverage).",
    where: "`time_series_folds()`, `VAL_YEARS`, Figure B1",
  },
  {
    id: "B4", title: "Scale inside each model's pipeline; z-score for LR; scale only continuous features for KNN; no scaling for the tree",
    simple: "Scaling is learned from the training part of each fold only, so the validation data never leak in. Each model gets the scaling it needs.",
    detail: "LR: all 18 features z-scored so the penalty treats them alike and coefficients are standardised. KNN: continuous features scaled (z-score or Min-Max, chosen by CV: z-score won 0.64 vs 0.53); 0/1 flags left as 0/1 so a rare flag (fiscal-year start, z ≈ 7 when on) does not dominate distances. Tree: splits are thresholds, so scaling changes nothing. The M2 `*_z`/`*_mm` columns were scaled on all of 2019–24 and would leak later folds into earlier ones, so they are not used.",
    alt: "Pre-scaled M2 columns (leak inside CV).",
    where: "`make_models()`",
  },
  {
    id: "B5", title: "Select hyperparameters by ROC-AUC of the pooled out-of-fold predictions",
    simple: "We choose the setting whose predictions, put together across all four validation years, rank shock weeks best — because one alarm threshold must work in every year.",
    detail: "ROC-AUC is threshold-free and unaffected by the shock rate, and it is the metric of hypothesis H1. Pooling matters: an unweighted LR scored 0.65 averaged over folds but only 0.53 pooled, because its probability level followed each fold's base rate. The majority class shows the same effect (0.5 per fold, 0.467 pooled). Mean ± SD of per-fold AUCs is still reported for the rubric's 'variance across folds'. Caveat found in the audit: pooled AUC also rewards telling crisis years from calm ones. An oracle that knows only each validation year's realised shock rate (constant within the year) scores 0.640 pooled. Within years (mean fold AUC) the order is KNN 0.672 > LR 0.651 > tree 0.578 ≈ persistence 0.569, and that is the order the test reproduced. We kept the planned rule, because switching after seeing the test would leak test information into model choice; M4 reports both.",
    alt: "Mean per-fold AUC (standard GridSearchCV): ignores whether probability levels are comparable across years, but measures within-year ranking cleanly (M4 will report it alongside). Accuracy: rewards never alerting.",
    where: "`grid_search_time_cv()`",
  },
  {
    id: "B6", title: "Handle class imbalance without resampling",
    simple: "Shocks are rare (17% of training rows). Instead of creating fake shock rows, we let the models weight shocks more if that helps, choose the alarm cut-off by cost, and use metrics that are fair to rare events.",
    detail: "Class weights (none vs balanced) are a tuning option for LR (balanced won) and the tree (unweighted won). KNN has no weights; its threshold adapts. Metrics: recall, specificity, F1, ROC-AUC, PR-AUC. Oversampling methods such as SMOTE create synthetic rows by interpolating neighbours, which in a time series mixes weeks and can leak information across folds.",
    alt: "SMOTE / random oversampling; undersampling calm weeks (throws data away).",
    where: "grids in `make_models()`, `best_threshold()`",
  },
  {
    id: "B7", title: "Alarm threshold minimises expected cost with a missed shock = 5 false alarms; ratios 1–20 tested",
    simple: "Missing a real shock hurts poor families much more than a false alarm costs the government, so we count a miss as five times worse and pick the cut-off that minimises total cost.",
    detail: "Evidence: a Q1 shock is not given back (8 weeks later Q1 prices are 4.2% above the pre-shock week, against 1.9% around an ordinary week, and after the shock they keep rising at the usual pace, 2.1% vs 2.0%), a typical shock is up to Rs 355/month at the Q1 ceiling (≈ 8% of the Rs 4,500/month Kafaalat value), coping is irreversible, and FAO found ≈ US$7 return per US$1 of early action. A false alarm is a transfer to poor households, not a pure loss, so 5:1 sits between parity and 7:1. Thresholds are chosen on 2021–24 out-of-fold predictions (not the test): LR 0.50, KNN 0.12, tree 0.16. The Bayes rule 1/6 is quoted for comparison but needs calibrated probabilities.",
    alt: "Default 0.5; maximising F1; a different ratio (all reported in the sensitivity table).",
    where: "`COST_FN`, `best_threshold()`, nb03 §7, Figure B4",
  },
  {
    id: "B8", title: "Listwise deletion of rows with a missing feature or target",
    simple: "The very first weeks cannot have an 8-week exchange-rate change, and the very last week has no 'next week'. We simply drop those 9 weeks.",
    detail: "45 rows (9 weeks × 5 groups) dropped, as promised in M2 Table 2. These gaps are structural (not random), and imputing them would invent price movements, the very thing we forecast.",
    alt: "Mean imputation (would create fake signals).",
    where: "`load_model_data()`",
  },
  {
    id: "B9", title: "Baselines: logistic regression, KNN and a shallow decision tree; benchmarks: majority class and persistence",
    simple: "Three simple models that think differently (a weighted sum, 'similar past weeks', and yes/no rules), plus two no-brain benchmarks every model must beat.",
    detail: "LR is the model form of H1 (odds ratios, testable coefficients) and regularises well in small samples. KNN is an analogue forecast with no assumed shape. The tree gives auditable alarm rules and captures thresholds/interactions. All three are syllabus methods (KNN Week 7, LR Week 9; trees lead into the Week 12 ensembles in M4). Majority class sets the accuracy floor; persistence is the standard naive time-series forecast.",
    alt: "Ridge/Lasso regression on the continuous change (we forecast a binary alarm); neural networks (not baselines).",
    where: "`make_models()`, `make_benchmarks()`",
  },
  {
    id: "B10", title: "Eighteen features in four blocks, one pooled model with quintile dummies (Q5 = reference)",
    simple: "The model sees the group's own recent inflation, the early-warning signals from M2, momentum in the volatile components, and a few controls.",
    detail: "Own history (2), the six H1 signals, perishables/utilities/motor-fuel momentum (3), policy rate, Ramadan, Eid ul-Adha, and grp_Q1–Q4. Only the 8-week FX change is used (the 4- and 13-week versions are highly correlated with it, M2 §III-F). Dummies let the baseline shock risk differ by quintile; they turned out near zero.",
    alt: "All 35 M2 features (redundant, more noise for KNN); separate models per quintile (M4, H4).",
    where: "`FEATURES` and blocks in `baseline.py`",
  },
  {
    id: "B11", title: "Grid ranges, extended where the best value sat on an edge; saga solver for LR",
    simple: "We tried wide ranges of settings and widened them when the best setting landed at the edge of the range.",
    detail: "LR C was extended down to 10^−4; the curve is flat for C ≤ 0.01 (all within 0.013), so the edge choice is a plateau, not a missed optimum. KNN k stops at 250 because the smallest training fold has about 310 rows. Tree leaf size extended to 160. The saga solver supports L1 and L2 and, unlike liblinear, does not penalise the intercept (a penalised intercept pushed every probability towards 0.5 in an early trial).",
    alt: "Random search (unnecessary for small grids).",
    where: "`make_models()`",
  },
  {
    id: "B12", title: "Three feature-importance measures; permutation importance on validation folds; odds ratios from an unpenalised logit",
    simple: "Different models 'see' features differently, so we use three ways of measuring importance and look for agreement.",
    detail: "Standardised LR coefficients (comparable because z-scored), tree Gini importance, and permutation importance for all three models (works for KNN). Permutation importance uses the 2021–24 validation folds so the test period is not used to judge features. The tuned LR is so shrunk that its raw coefficients are tiny, so we show them relative to the largest and take odds ratios in natural units from an unpenalised logit with week-clustered CIs.",
    alt: "Permutation importance on the test (only 35 shock rows from 13 weeks: unstable).",
    where: "nb03 §9, `cv_permutation_importance()`",
  },
  {
    id: "B13", title: "H1: week-clustered Wald test in sample; DeLong and week-block bootstrap out of sample",
    simple: "The five quintile rows of a week are not five independent pieces of evidence, so our tests treat each week as one block.",
    detail: "Plain LR test χ²(6) = 94 vs clustered Wald χ²(6) = 22.4 (p = 0.001): clustering cuts the evidence about four-fold but H0 is still rejected in sample. Out of sample, DeLong (promised in M2) gives p = 0.42; because DeLong also assumes independent rows, the week-block bootstrap is the robustness check (gain −0.08 to +0.10).",
    alt: "Only the plain LR test (overstates evidence).",
    where: "nb03 §10, `fit_logit()`, `delong_test()`, `week_block_bootstrap()`",
  },
  {
    id: "B14", title: "H2 tested with a Q5 − Q1 difference regression on the training period, HAC errors",
    simple: "Both groups face the same exchange rate each week, so we look at the difference between their price rises and ask whether it grows when the rupee falls.",
    detail: "Slope of (8-week-ahead SPI change Q5 − Q1) on the 8-week rupee change = β_Q5 − β_Q1, with one HAC standard error. Training weeks only, and only windows ending by 31 Dec 2024, so no 2025 price enters. Robust across 4/8/13-week horizons, with/without controls, full sample.",
    alt: "Stacked panel with interactions (equivalent but needs panel-HAC errors).",
    where: "nb04 §1",
  },
  {
    id: "B15", title: "H3 tested as pre-stated; the component split reported as exploratory",
    simple: "We tested exactly the hypothesis written in M2 first. When energy did not behave as expected, we looked deeper, but we label that deeper look as a new idea, not a proven result.",
    detail: "β_food = 0.12 (p = 0.003) supports the food part; β_energy = +0.04 (p = 0.92 for < 0) does not support the energy part. Splitting energy shows motor fuel (−0.07) and LPG (−0.03) narrow the gap, while utility tariffs point the other way (+0.03, p = 0.10, not significant; the 'for Q1' tariff slabs weigh heavily in Q1's basket). Because the split was chosen after seeing the result, it is a hypothesis for M4 (avoids p-hacking).",
    alt: "Replacing H3 after the fact (would be HARKing: hypothesising after results are known).",
    where: "nb04 §2",
  },
  {
    id: "B16", title: "The test period is used once; results reported honestly",
    simple: "We looked at the test results only after all choices were fixed, and we report that the models did not beat 'never alert' in 2025–26 instead of re-tuning until they did.",
    detail: "All tuning, thresholds and the cost ratio come from 2019–24 data; the cost evidence also uses training weeks only. The calm test period (prior shift) is a real finding: thresholds learned in crisis years over-alert in calm years. Adjusting thresholds to the test would be leakage.",
    alt: "Re-tuning on the test set (invalid).",
    where: "nb03 §6–§7",
  },
  {
    id: "B17", title: "The driver of a shock = the items with the largest upward PBS impact that week",
    simple: "To explain a missed shock we name the items that pushed prices up most that week.",
    detail: "Uses PBS item impacts (percentage points of the Combined SPI change); for unpublished weeks, weight × % change. Largest positive impact, not largest absolute: in July 2026 petrol fell 20% while tomatoes rose 125% — the tomatoes caused the shock.",
    alt: "Largest absolute impact (mislabels falls as drivers).",
    where: "nb03 §8",
  },
  {
    id: "B18", title: "Disclosed limitation: momentum items were chosen on all training years",
    simple: "One feature was designed in M2 using all of 2019–24; inside cross-validation it has a tiny peek at later folds (never at the test).",
    detail: "The seven 'momentum' items behind `momentum_spikes_4w` were picked on weeks up to 2024. Within CV that is a mild look-ahead; its permutation importance is small, so the effect is minor. Fixing it fully would mean re-selecting items inside every fold (planned if the feature is kept in M4).",
    alt: "Re-select inside folds (more code; small expected effect).",
    where: "nb03 §2 checklist",
  },
  {
    id: "B19", title: "Reproducibility: shared module, fixed seed, script = notebook",
    simple: "Anyone can re-run everything and get the same numbers.",
    detail: "Seed 42 for the tree, solver and bootstrap; data paths relative to the project root; the script and the notebook call the same functions and their predictions match exactly; models saved with the scikit-learn version in the model card.",
    alt: "",
    where: "`SEED`, `train_baselines.py`, `model_card.json`",
  },
];

// ---------------------------------------------------------------- numbers
const NUMBERS = [
  ["Rows after deletion", "1,805 quintile-weeks (45 rows / 9 weeks dropped)"],
  ["Train / test", "270 weeks (1,350 rows) / 91 weeks (455 rows); 74.8% / 25.2%"],
  ["Shock rate", "17.2% train (232 rows) / 7.7% test (35 rows, 13 distinct weeks)"],
  ["Validation years", "2021 (13% shocks), 2022 (33%), 2023 (20%), 2024 (12%)"],
  ["Selected LR", "C = 0.0001, L2, balanced; pooled CV AUC 0.643; mean 0.651 ± 0.053; threshold 0.50"],
  ["Selected KNN", "k = 100, uniform, z-score; pooled 0.643; mean 0.672 ± 0.080; threshold 0.12"],
  ["Selected tree", "depth 4, leaf ≥ 40, unweighted; pooled 0.652; mean 0.578 ± 0.082; threshold 0.16"],
  ["Benchmarks (CV)", "persistence pooled 0.584; majority 0.467 pooled (0.500 per fold)"],
  ["Shuffled K-fold inflation", "+0.05 (LR) to +0.14 (tree): 0.70–0.73 vs 0.58–0.67"],
  ["Test AUC [95% CI]", "KNN 0.68 [0.47, 0.83]; LR 0.57 [0.35, 0.76]; tree 0.54 [0.43, 0.67]; persistence 0.47"],
  ["Test recall / false alarms", "KNN 20/35, 133 FP; tree 10/35, 91 FP; LR 6/35, 37 FP"],
  ["Test accuracy", "majority 92.3% (catches nothing); KNN 67.5%; LR 85.5%; tree 74.5%"],
  ["Brier (test)", "KNN 0.070, tree 0.078, majority 0.080, LR 0.238"],
  ["Cost 2021–24 (5:1)", "33–39% below never-alert; 18–26% below always-alert"],
  ["Cost test (5:1)", "4–23% above never-alert (LR 1.04, KNN 1.19, tree 1.23)"],
  ["Q1 shock size", "median 1.6%, mean 2.0%; not reversed: 4.2% above the pre-shock week 8 weeks later (ordinary week: 1.9%); Rs 355/month ≈ 8% of Kafaalat"],
  ["Regime tracking (CV)", "year-level oracle pooled AUC 0.640; within-year (mean fold) AUC: KNN 0.672, LR 0.651, tree 0.578, persistence 0.569"],
  ["Top drivers", "rupee 8-week change (LR weight 1.00, Gini 0.45, OR 1.11 per 1%); fiscal-year start OR 5.3 (5 fiscal years, 14 of 25 rows shocked; CI 1.4–19.5)"],
  ["July in the test", "4 of 13 shock weeks (14 of 35 shock rows); only 1 in the week containing 1 July"],
  ["H1", "in sample Wald χ²(6) = 22.4, p = 0.001 (LR χ² = 94); test AUC 0.554 → 0.561, DeLong p = 0.42"],
  ["H2", "pass-through ≈ 0.21 (Q1) vs 0.22 (Q5) per 1% over 8 weeks; δ = 0.04, p = 0.27"],
  ["H3", "β_food = 0.12 (p = 0.003); β_energy = +0.04 (p = 0.92); split R² 0.16 → 0.38"],
];

// ---------------------------------------------------------------- viva questions
const VIVA = [
  ["Why didn't you use a random 80/20 stratified split?", "Our data are a time series. A random split would train on later weeks to predict earlier ones and put sister quintile rows of the same week on both sides. We split by date (train ≤ 2024, test 2025–26, about 75/25), fixed in M2 before modelling, and handle imbalance with class weights, a cost-based threshold and imbalance-aware metrics."],
  ["How does your cross-validation avoid leakage?", "Expanding window: each fold trains only on weeks before its validation year; whole weeks stay together; scaling is fitted inside the pipeline on the training part only; the test period is never used for tuning or thresholds."],
  ["Why K = 4?", "One fold per calendar year 2021–2024, so each validation block has exactly one fiscal-year start, Ramadan and Eid. 2020 cannot be a validation year because its training window would hold only 9 weeks (Oct–Dec 2019)."],
  ["What would shuffled K-fold have shown?", "AUCs of 0.70–0.73 instead of 0.58–0.67: inflated by sister rows of the same week and by learning from the future."],
  ["Why ROC-AUC for tuning and not accuracy?", "Accuracy rewards never raising an alarm (92% in the test). AUC measures ranking, is threshold-free and is not affected by the shock rate."],
  ["What is 'pooled' AUC?", "One AUC over the out-of-fold predictions of all four years together. Because the system uses one threshold for all years, probabilities must mean the same in every year; pooled AUC checks that, the per-fold average does not. Its weakness: it also rewards telling crisis years from calm ones (a year-level oracle scores 0.640)."],
  ["Your tree had the best CV score but the worst test score. Why?", "Pooled AUC rewards regime tracking, and the tree's first split (rupee down > 8% in 8 weeks) recognises the 2022–23 crisis. Within years its AUC is only 0.578, about persistence (0.569). The test period is one calm regime, so only within-year ranking counts there, and the within-year order (KNN > LR > tree) is exactly the test order. We did not re-select after seeing this, because that would leak the test into model choice; M4 will report both views."],
  ["Explain the C you chose.", "C is the inverse of the penalty strength. C = 0.0001 means a very strong L2 penalty: coefficients are shrunk heavily. Weaker penalties fit training weeks better (AUC 0.86) but validate worse (0.56): overfitting. The curve is flat for C ≤ 0.01."],
  ["Why k = 100 for KNN?", "Small k overfits (k = 5: training AUC 0.98, validation 0.56). Around 100 neighbours the validation AUC peaks (0.64) and then declines as the forecast becomes too smooth."],
  ["Why does KNN need scaling and the tree not?", "KNN uses distances, so a feature measured in large units would dominate. A tree only asks 'is x above a cut-off?', which no rescaling changes."],
  ["What does a confusion matrix show for KNN?", "Test: 20 shocks caught (TP), 15 missed (FN), 133 false alarms (FP), 287 calm weeks correctly left alone (TN)."],
  ["Precision is only 0.13. Is the model useless?", "Precision depends on how common shocks are. In 2025–26 only 7.7% of rows were shocks, so most alarms are false even with decent ranking (AUC 0.68). In 2021–24 precision was 0.26–0.38."],
  ["Why is a false negative worse than a false positive here?", "A miss leaves poor households to absorb a price step that is not given back (8 weeks later Q1 prices are 4.2% above the pre-shock week, against 1.9% around an ordinary week), with irreversible coping; a false alarm is a top-up that still reaches poor families. We weight a miss as 5 false alarms and test 1–20."],
  ["How did you choose the threshold?", "The value that minimises 1 × FP + 5 × FN on the 2021–24 out-of-fold predictions; then applied unchanged to the test."],
  ["Why did no model beat 'never alert' in the test?", "Prior shift: the shock rate halved. Thresholds learned when shocks were common over-alert when they are rare. The ranking still works (KNN AUC 0.68), so recalibration/retraining (M4–M5) is the fix. (At 5:1. At 20:1 the models do beat never-alert, but only by alerting almost every week, i.e. by matching the always-alert policy.)"],
  ["Which features matter most?", "The 8-week rupee depreciation (largest LR weight, the tree's first split, odds ratio 1.11 per 1%), recent shocks and food-price momentum. The fiscal-year start multiplies the odds by about 5 but is rare, and that estimate rests on only five fiscal years (CI 1.4–19.5)."],
  ["Is 'front-load support before 1 July' still justified?", "Yes for the timing, not for the one-week flag. In 2019–24, 14 of the 25 rows flagged as fiscal-year starts were followed by a shock (56% vs 17%). In 2025–26, 4 of the 13 shock weeks fell in July, but three came after its first week. M4 will try a first-month-of-the-fiscal-year window."],
  ["What is permutation importance?", "Shuffle one feature in the validation data and measure how much the AUC falls. Works for any model, including KNN."],
  ["What is an odds ratio?", "exp(coefficient): how many times the odds of a shock multiply for a one-unit rise. 1.11 for the rupee means +11% odds per 1% depreciation."],
  ["Was H1 supported?", "In sample yes (clustered Wald p = 0.001). Out of sample in 2025–26 no (DeLong p = 0.42). The early warning works in turbulent periods but not in a calm one."],
  ["Why cluster standard errors by week?", "The five quintile rows of a week share the same signals, so they are not independent; the plain LR test (χ² = 94) overstates the evidence about four-fold."],
  ["What did H2 and H3 find?", "H2: pass-through is about the same for Q1 and Q5 (p = 0.27). H3: food widens the gap against the poor (p = 0.003); energy as a whole does not narrow it. The exploratory split shows why: motor fuel and LPG hit the rich harder, while utility tariffs lean towards the poor (not significant, p = 0.10)."],
  ["What are the systematic errors?", "First waves of a new shock, administered utility tariffs and perishable supply spikes are missed; false alarms follow past shocks."],
  ["What are the main limitations?", "Weak signal (underfitting), uncalibrated probabilities, a small test set (13 shock weeks), no data on tariff decisions, urban-only SPI (rural poor invisible), revised data vintage."],
  ["What will you do in M4?", "Ensembles (random forest, gradient boosting) under the same protocol; calibration; a tariff-notification calendar; fairness audit of Q1 vs Q5 (Brier, miss rates, Diebold–Mariano, equal opportunity); ethics of public warnings."],
  ["Can you show the code that prevents leakage?", "`time_series_folds()` (folds by year, asserted in nb03 §2), the scaler inside each `Pipeline` in `make_models()`, and `best_threshold()` applied to out-of-fold predictions only."],
  ["How do you know the notebook is reproducible?", "Fixed seed 42; `python src/models/train_baselines.py` gives exactly the same test predictions as the notebook; fitted models and the model card are saved."],
];

// ---------------------------------------------------------------- matrix (files x steps)
const MCOLS = ["build_ features", "train_ baselines", "nb03", "nb04", "prepare_ figures", "build_ manuscript_m3"];
const M = [
  ["data/processed/master_features.csv", ["W", "R", "R", "R", "", ""]],
  ["data/processed/items_weekly_panel.csv", ["R", "", "R", "", "", ""]],
  ["src/models/baseline.py (code)", ["", "R", "R", "", "", ""]],
  ["models/m3_baselines/*.joblib, model_card.json", ["", "W", "W", "", "", ""]],
  ["reports/tables/m3_cv_*.csv, m3_test_metrics.csv, m3_predictions.csv", ["", "W", "W", "", "", ""]],
  ["reports/tables/m3_* (other model tables)", ["", "", "W", "", "", ""]],
  ["reports/tables/m3_h2_*.csv, m3_h3_*.csv", ["", "", "", "W", "", ""]],
  ["reports/figures/figB1–B8", ["", "", "W", "", "R", ""]],
  ["reports/figures/figB9–B10", ["", "", "", "W", "R", ""]],
  ["manuscript/figures/figB*.png", ["", "", "", "", "W", "R"]],
  ["manuscript/M3_manuscript_sections_IV_V.docx", ["", "", "", "", "", "W"]],
];

// ================================================================ ASSEMBLY
const body = [];

// Cover
body.push(new Paragraph({ children: [new TextRun({ text: "Milestone 3 Reference and Viva Guide", font: FONT, size: 52, bold: true, color: ACCENT })], spacing: { after: 200 } }));
body.push(P("Baseline models, evaluation and initial findings: files, concepts and decisions", { size: 28, color: MUTED, after: 120 }));
body.push(P("Early-warning system for essential-price shocks across income quintiles in Pakistan", { size: 24, color: MUTED, after: 120 }));
body.push(P("CS/SDP 312/314 Data Science for Social Good · Team: Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid", { size: 22, color: MUTED, after: 120 }));
body.push(P("Version: 21 October 2026 (Milestone 3 due 24 October 2026)", { size: 22, color: MUTED, after: 600 }));
body.push(P("This document is the companion to Milestone 3. It lists every file the milestone created or used, what each one does and the concepts behind it, and explains every important modelling decision twice: once in plain words and once in technical detail. It ends with a cheat sheet of key numbers and a list of likely viva questions with short answers. The project-wide script and data reference (`DS4SG_Script_and_Data_Reference.docx`) still covers the data pipeline of Milestones 1–2.", { size: 22 }));
body.push(pageBreak());

// TOC
body.push(new Paragraph({ children: [new TextRun({ text: "Contents", font: FONT, size: 32, bold: true, color: ACCENT })], spacing: { after: 200 } }));
const TOC_AT = body.length;            // the contents list is inserted here once all headings exist
body.push(pageBreak());

// 1. How to use
body.push(H1("1. How to use this document"));
body.push(P("The M3 grade is the rubric score multiplied by a viva factor V between 0 and 1. In a 5-minute viva the examiner checks code understanding, algorithmic understanding and analytical rigour. Full marks (V = 1.00) need a confident defence of the modelling choices, the cross-validation set-up and the trade-off between the two kinds of error. Hesitating on hyperparameters or validation details costs 15%; being unable to explain the CV splits, feature importance or metric trade-offs costs 30%."));
body.push(P("Suggested preparation:", { before: 80 }));
body.push(NUM("Run `notebooks/03_baseline_models.ipynb` top to bottom yourself and read each interpretation cell."));
body.push(NUM("Learn the cheat-sheet numbers (Section 7)."));
body.push(NUM("For each decision in Section 6, say the simple version out loud, then the detailed one."));
body.push(NUM("Quiz each other with the viva questions (Section 8). Any team member may be asked anything."));
body.push(NUM("Change one thing and see what moves, e.g. set `COST_FN = 10` in `baseline.py`, or validate on 2022–2024 only."));
body.push(P("Paths are relative to the project folder. Code names appear in `monospace`.", { before: 80 }));

// 2. At a glance
body.push(pageBreak());
body.push(H1("2. Milestone 3 at a glance"));
body.push(H2("2.1 What we built, in one paragraph"));
body.push(P("We built and honestly evaluated the first versions of an early-warning classifier. Standing at the end of a week, it predicts whether next week will be a price-shock week (SPI up by at least 1%) for each income quintile. Three baseline models (logistic regression, KNN, a shallow decision tree) were compared with two naive benchmarks. They were tuned with cross-validation that respects time, judged with all standard metrics and with a cost analysis in which missing a shock is five times worse than a false alarm, and explained with three feature-importance measures. We also ran the three hypothesis tests promised in Milestone 2."));
body.push(H2("2.2 Headline results"));
body.push(BUL("In the 2021–24 validation years all three models beat both benchmarks on pooled AUC (0.64–0.65 vs 0.58 for persistence) and cut error costs by a third compared with never alerting. Much of the pooled score is regime tracking, though: within years, KNN (0.67) and LR (0.65) beat persistence (0.57) and the tree (0.58) barely does."));
body.push(BUL("In the calm 2025–26 test period, KNN ranked shocks best (AUC 0.68), but at 5:1 no model beat 'never alert' on cost: the shock rate halved (17% → 8%), so thresholds learned in crisis years over-alert."));
body.push(BUL("Drivers: rupee depreciation and recent price momentum; the fiscal-year start multiplies shock odds about five-fold (from only five fiscal years)."));
body.push(BUL("Misses: first waves of new shocks, utility-tariff hikes and perishable spikes. False alarms follow past shocks."));
body.push(BUL("H1 is supported in sample but not in the test period; H2 is not supported (pass-through is equal); H3 holds for food. Motor fuel hits the rich harder; utility tariffs lean towards the poor but are not significant."));
body.push(H2("2.3 Rubric map"));
body.push(grid(["Rubric item", "Weight", "Where", "One-line answer"], RUBRIC, [2100, 800, 2800, 3326], { size: 17 }));

// 3. Run order
body.push(pageBreak());
body.push(H1("3. Run order and data flow"));
body.push(P("Run from the project folder with the `.venv` environment (scikit-learn 1.9.1, statsmodels 0.15.0, pandas 3.0). Steps 2 and 3 give identical numbers; the script exists for the rubric's 'modular scripts' requirement and for quick re-runs."));
body.push(grid(["#", "Command", "Reads", "Writes"], STEPS, [400, 3000, 2600, 3026], { size: 17 }));
body.push(spacer());
body.push(P("**In short:** `master_features.csv` → `baseline.py` functions (split → folds → grid search → thresholds → test) → fitted models, tables and figures → manuscript Sections IV–V."));

// 4. Files
body.push(pageBreak());
body.push(H1("4. Files of Milestone 3"));
body.push(P("New files first, then the existing files that M3 uses. For the two notebooks and the module, a second table lists their sections or functions."));
for (const f of FILES) {
  body.push(H3("`" + f.path + "`"));
  body.push(card([["Type", f.type], ["What it does", f.what], ["Why it exists", f.why], ["Reads", f.reads], ["Writes", f.writes], ["How to run", f.run], ["Concepts", f.concepts]]));
  body.push(spacer());
}
body.push(H2("4.1 Functions in src/models/baseline.py"));
body.push(P("Constants at the top: `TRAIN_END` (2024-12-31), `GROUPS` (Q1–Q5), `TARGET`, `SEED` (42), `VAL_YEARS` (2021–2024), `COST_FP` = 1, `COST_FN` = 5, `COST_RATIOS`, and the feature blocks `OWN_HISTORY`, `SIGNALS`, `COMPONENTS`, `CONTROLS`, `GROUP_DUMMIES` (together `FEATURES`, 18 columns), plus `H1_BASE` and `H1_FULL` for the H1 test and `LABELS` for plot labels."));
body.push(grid(["Function", "What it does", "Concept"], FUNCS, [2500, 4626, 1900], { size: 17 }));
body.push(H2("4.2 Sections of notebooks/03_baseline_models.ipynb"));
body.push(grid(["Section", "What it does", "Outputs"], NB03, [2000, 4426, 2600], { size: 17 }));
body.push(H2("4.3 Sections of notebooks/04_hypothesis_tests.ipynb"));
body.push(grid(["Section", "What it does", "Outputs"], NB04, [2000, 4426, 2600], { size: 17 }));
body.push(H2("4.4 Existing files used by Milestone 3"));
body.push(grid(["File", "Role in M3", "Made in"], SUPPORT, [3000, 4526, 1500], { size: 17 }));
body.push(H2("4.5 Output figures (reports/figures/)"));
body.push(grid(["File", "What it shows", "How to read it"], FIGURES, [2700, 3000, 3326], { size: 17 }));
body.push(H2("4.6 Output tables (reports/tables/)"));
body.push(grid(["File(s)", "Contents", "Produced by"], TABLES, [3300, 4126, 1600], { size: 17 }));

// 5. Concepts
body.push(pageBreak());
body.push(H1("5. Concepts"));
body.push(P("Each concept is explained in plain words and then in more detail, with where it appears. Course units: KNN, hold-out and cross-validation, and bias in training data are Week 7; logistic regression is Week 9; model evaluation metrics are Week 6; scaling is Unit 04; resistant statistics are Unit 05; hypothesis tests and p-values are Unit 07. Decision trees, ensembles and fairness come later in the course and are explained here."));
for (const [group, rows] of CONCEPTS) {
  body.push(H2(`5.${CONCEPTS.findIndex((c) => c[0] === group) + 1} ${group}`));
  body.push(grid(["Concept", "In simple words", "In more detail", "Where"], rows, [1700, 2600, 3500, 1226], { size: 17, firstBold: true }));
}

// 6. Decisions
body.push(pageBreak());
body.push(H1("6. Decisions made in Milestone 3 (for the viva)"));
body.push(P("Decision IDs B1–B8 match the docstring of `src/models/baseline.py`; B9–B19 cover the remaining choices. For each one: the **simple** version (green) is what you say first; the **detailed** version (grey) is what you add if the examiner pushes. 'Alternatives' lists what we rejected and why. M2 decisions (D1–D5 data cleaning, F1–F4 features) are in the project reference document and the M2 manuscript."));
for (const d of DECISIONS) {
  body.push(H3(`${d.id} · ${d.title}`));
  body.push(card([["In simple terms", d.simple, SIMPLE_FILL], ["In detail", d.detail, DETAIL_FILL], ["Alternatives considered", d.alt], ["Where in the code", d.where]], 2100));
  body.push(spacer());
}

// 7. Numbers
body.push(pageBreak());
body.push(H1("7. Key numbers cheat sheet"));
body.push(grid(["Quantity", "Value"], NUMBERS, [2800, 6226], { size: 18, firstBold: true }));

// 8. Viva questions
body.push(pageBreak());
body.push(H1("8. Likely viva questions with short answers"));
body.push(grid(["Question", "Short answer"], VIVA, [3000, 6026], { size: 18, firstBold: true, cantSplit: true }));

// 9. Limitations and roadmap
body.push(H1("9. Limitations and the road to Milestone 4"));
body.push(BUL("**Underfitting and a weak signal:** no cross-validated AUC reaches 0.7; the best LR is shrunk almost to a constant."));
body.push(BUL("**Calibration and prior shift:** class weights and shrinkage distort probabilities; thresholds do not transfer from crisis to calm years."));
body.push(BUL("**Selection criterion:** pooled AUC partly rewards telling crisis years from calm ones (year-level oracle 0.640), which flattered the tree; M4 reports within-year AUC alongside it."));
body.push(BUL("**Small test set:** 35 shock rows in 13 weeks, so the confidence intervals are wide."));
body.push(BUL("**Missing lead information:** tariff decisions (NEPRA, OGRA, ECC) and perishable supply shocks."));
body.push(BUL("**Potential bias:** urban-only SPI (17 cities); 2015-16 quintile weights; LR and tree missed 6 of 7 Q1 shocks vs 4 of 6 for Q5."));
body.push(BUL("**M4 plan:** ensembles (random forest, gradient boosting) under the same protocol; quintile-specific models and the H4 interaction test; Platt/isotonic calibration; within-year AUC reported next to pooled AUC; a tariff-notification calendar, a first-month-of-the-fiscal-year window and a regime feature; fairness audit (H5: Brier and miss rates Q1 vs Q5, Diebold–Mariano test, equal opportunity, welfare-weighted thresholds); ethics of public warnings."));

// ================================================================ DOCUMENT
const matrixHeading = H1("10. Cross-reference matrix: files × steps");
body.splice(TOC_AT, 0, ...HEADINGS.map((h) => new Paragraph({
  children: [new InternalHyperlink({ anchor: h.id, children: [new TextRun({ text: h.text, font: FONT, size: h.level === 1 ? 22 : 20, bold: h.level === 1, color: h.level === 1 ? ACCENT : INK })] })],
  indent: { left: h.level === 1 ? 0 : 400 }, spacing: { before: h.level === 1 ? 120 : 0, after: 40 },
})));
const matrixRows = M.map(([f, cells]) => [`\`${f}\``, ...cells]);
const firstW = 5000;
const colW = Math.floor((LAND_W - firstW) / MCOLS.length);
const mw = [firstW, ...Array(MCOLS.length).fill(colW)];
const matrixTable = new Table({
  layout: TableLayoutType.FIXED,
  width: { size: mw.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: mw,
  rows: [
    new TableRow({ tableHeader: true, children: ["File  ↓  /  step  →", ...MCOLS].map((h, i) => cell(h, mw[i], { bold: true, fill: HEAD_FILL, size: 16, align: i ? AlignmentType.CENTER : undefined, valign: VerticalAlign.BOTTOM })) }),
    ...matrixRows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, mw[i], {
      size: i ? 18 : 16, bold: i > 0 && c !== "", align: i ? AlignmentType.CENTER : undefined,
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
const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "DS4SG · Milestone 3 Reference and Viva Guide", font: FONT, size: 16, color: MUTED })] })] });
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED })] })] });

const doc = new Document({
  creator: "DS4SG team", title: "Milestone 3 Reference and Viva Guide", styles: STYLES,
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } }] },
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: body },
    {
      properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
      headers: { default: header }, footers: { default: footer },
      children: [
        matrixHeading,
        P("**R** = the step reads the file; **W** = the step writes it (green = read; orange = written). Steps: `build_features.py` (M2), `train_baselines.py`, notebook 03, notebook 04, `prepare_manuscript_figures.py`, `build_manuscript_m3.js`.", { size: 18 }),
        matrixTable,
        P("Code dependencies: notebook 03 and `train_baselines.py` import `src/models/baseline.py`; notebook 03 also imports `component()` from `src/features/build_features.py`; both notebooks import `src/utils/plot_style.py`.", { size: 18, before: 160 }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("wrote", OUT); });
