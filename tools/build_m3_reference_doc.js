// Builds "DS4SG_M3_Reference.docx": the Milestone 3 reference (files, run order, concepts, limitations).
// The viva preparation for Milestones 2 and 3 (decisions, numbers, questions) is in tools/build_viva_guide.js.
// Usage (from a folder where the npm package "docx" is installed, or with NODE_PATH pointing at its node_modules):
//   node tools/build_m3_reference_doc.js DS4SG_M3_Reference.docx
// The contents list is static (clickable links to bookmarked headings), so no field update is needed in Word.
// Same layout as tools/build_reference_doc.js (the project-wide script and data reference).
// Every number comes from notebooks/03_baseline_models.ipynb, notebooks/04_hypothesis_tests.ipynb and
// reports/tables/m3_*.csv (run of 2026-10-22).
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
    what: "The single home of all Milestone 3 modelling code. It defines the feature lists, loads and splits the data, builds the cross-validation folds, defines the three model pipelines and their hyperparameter grids, runs the grid search, computes every metric, chooses the cost-based alarm threshold, and implements the week-block bootstrap. Its docstring lists decisions B1–B8.",
    why: "Keeping the logic in one module means the notebook and the command-line script use the same code and give identical numbers (a reproducibility requirement in the rubric), and the notebook stays readable.",
    reads: ["`data/processed/master_features.csv` (via `load_model_data()`)"],
    writes: ["`models/m3_baselines/*.joblib` and `model_card.json` (via `save_models()`)"],
    run: "Imported: `from models import baseline as B` (after adding `src/` to the path).",
    concepts: "pipelines, time-series cross-validation, grid search, out-of-fold predictions, ROC-AUC, cost-sensitive thresholds, week-block bootstrap, standard errors clustered by week.",
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
    path: "src/models/sensitivity_checks.py", type: "Python script (command line)",
    what: "Checks, after the M3 submission, whether other reasonable values of the numbers we fixed by judgement would have changed the results: the 1% shock threshold, the 1% fuel-revision cut-off, the EDA signal cut-offs, window lengths, the momentum-item rule, HAC lags, the random seed and the bootstrap size, plus two settings left at their defaults (Gini impurity, Euclidean distance).",
    why: "Prepares honest answers to 'did you try other values?' for the M2 and M3 viva. The results are reported in the viva guide (Section 9) and change no submitted result.",
    reads: ["`data/processed/master_features.csv`", "`data/processed/items_weekly_panel.csv`", "`data/external/islamic_events.csv`"],
    writes: ["nothing (prints only)"],
    run: "`python src/models/sensitivity_checks.py` (about 4 minutes).",
    concepts: "sensitivity analysis, robustness checks, choosing with hindsight.",
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
    run: "`node tools/build_manuscript_m3.js manuscript/M3_manuscript_sections_IV_V.docx` (needs the npm package `docx`); word count: `python tools/word_count_body.py manuscript/M3_manuscript_sections_IV_V.docx` (3,529 body words).",
    concepts: "IEEE-style manuscript, reproducible documents.",
  },
  {
    path: "tools/build_viva_guide.js", type: "Node.js script (docx-js)",
    what: "Builds `DS4SG_Viva_Guide_M2_M3.docx`, the viva preparation guide for Milestones 2 and 3: the numbers we chose and the alternatives checked, the methods used and not used, every decision explained simply and in detail, key numbers, a question bank and the after-submission checks.",
    why: "The instructor examines M2 and M3 together, mostly with open questions about decisions.",
    reads: [], writes: ["`DS4SG_Viva_Guide_M2_M3.docx`"],
    run: "`node tools/build_viva_guide.js DS4SG_Viva_Guide_M2_M3.docx` (needs the npm package `docx`).",
    concepts: "",
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
  ["`fit_logit(d, cols)` / `logit_predict(...)`", "Unpenalised logit (statsmodels) with standard errors clustered by week; prediction helper.", "H1 test, odds ratios, standard errors clustered by week"],
  ["`save_models(fitted, card)`", "Writes the joblib files and the model card.", "model artifacts"],
  ["`week_block_bootstrap(y, scores, weeks)`", "Bootstrap sampling of whole test weeks (2,000 times, with replacement), recomputing each AUC.", "bootstrap and cluster sampling (Unit 04), confidence intervals (Unit 06)"],
];

// Notebook 03 sections
const NB03 = [
  ["§1 Data and split", "Loads data, prints split sizes and ratio (74.8/25.2), class balance by group (17.2% vs 7.7% shocks).", "`m3_class_balance.csv`"],
  ["§2 Validation framework", "Builds the 4 yearly folds, asserts no week is on both sides, draws Figure B1, leakage checklist.", "`m3_cv_folds.csv`, figB1"],
  ["§3 Naive benchmarks", "Majority class and persistence, scored out-of-fold.", "—"],
  ["§4 Models and tuning", "Justification table; grid search of the three pipelines; selected settings; validation curves; check of C values below the grid (plateau).", "`m3_cv_grid_*.csv`, `m3_cv_summary.csv`, figB2"],
  ["§5 Why time-aware CV matters", "Re-scores the tuned models with shuffled K-fold (rows; whole weeks) vs our design.", "`m3_cv_design_comparison.csv`"],
  ["§6 Test-period evaluation", "Thresholds from out-of-fold cost; full metric tables for validation years and test; bootstrap CIs and paired KNN differences; ROC/PR curves; metrics by quintile.", "`m3_oof_metrics.csv`, `m3_test_metrics.csv`, `m3_predictions.csv`, `m3_test_auc_bootstrap.csv`, `m3_test_metrics_by_group.csv`, figB3"],
  ["§7 Asymmetric costs", "FP vs FN consequences; Q1 shock size and persistence; cost-ratio sensitivity; cost curves.", "`m3_cost_sensitivity.csv`, figB4"],
  ["§8 Confusion matrices and edge cases", "Confusion matrices; every test shock week with its driver and which models caught it; false-alarm profile; week-by-week forecasts for Q1 and Q5.", "`m3_test_shock_weeks.csv`, `m3_false_alarm_profile.csv`, figB5, figB6"],
  ["§9 Feature importance", "LR standardised coefficients; unpenalised odds ratios; tree Gini; permutation importance; top-5 drivers with a policy implication each; tree rules.", "`m3_feature_importance.csv`, `m3_odds_ratios.csv`, `m3_top5_drivers.csv`, figB7, figB8"],
  ["§10 H1 test", "In-sample LR and week-clustered Wald tests; out-of-sample AUC comparison with the week-block bootstrap (replacing the DeLong test planned in M2).", "`m3_h1_tests.csv`, `m3_h1_signal_odds_ratios.csv`"],
  ["§11 Save artifacts", "Saves the three fitted pipelines and the model card.", "`models/m3_baselines/*`"],
  ["§12 Summary", "Findings, policy takeaways, limitations, M4 roadmap.", "—"],
];

const NB04 = [
  ["§1 H2 pass-through", "`passthrough(h)`: per-quintile regressions of the next-h-week SPI change on the 8-week rupee change (+ controls), and the Q5 − Q1 difference regression; robustness over horizons 4/8/13, with/without controls, training vs full sample.", "`m3_h2_passthrough_by_quintile.csv`, `m3_h2_difference_tests.csv`, figB9"],
  ["§2 H3 rotating burden", "`gap_regression()`: Q1 − Q5 weekly gap on food and energy inflation (+ controls, period dummies); caveat that the gap is built from basket weights (descriptive, not causal); exploratory split into five components.", "`m3_h3_gap_regression.csv`, `m3_h3_components_exploratory.csv`, figB10"],
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
  ["`m3_top5_drivers.csv`", "The five leading drivers by mean permutation importance, with Gini importance and odds ratios.", "nb03 §9"],
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
    ["Pooled vs mean fold AUC", "Pooled: one AUC over all validation predictions together. Mean: average of each year's AUC.", "Mean rewards ranking within each year; pooled also requires probability levels to be comparable across years, which a single alarm threshold needs. We select by pooled AUC and report mean ± SD. Pooled AUC also rewards telling crisis years from calm years: the tree's pooled AUC beats three of its four yearly AUCs.", "decision B5"],
    ["Pipeline", "A chain 'scale → model' treated as one object.", "Guarantees the scaler is fitted only on each fold's training rows, so no information leaks from validation data.", "`make_models()`"],
  ]],
  ["Models", [
    ["Majority-class benchmark", "Always predicts the most common class ('no shock').", "Accuracy equals the share of calm weeks (92.3% in test) while catching nothing; AUC 0.5. Shows why accuracy is misleading with imbalance.", "nb03 §3"],
    ["Persistence benchmark", "'Next week will be like this week.'", "Predicts a shock if this week rose ≥ 1%. Tests whether shocks cluster (CV AUC 0.58; test 0.47).", "`Persistence`"],
    ["Logistic regression", "Adds up weighted features into a score, then turns the score into a probability between 0 and 1.", "log(p/(1−p)) = b0 + b1x1 + … Coefficients are changes in log-odds; exp(coefficient) = odds ratio. Linear in the log-odds, no interactions unless added.", "nb03 §4, §9, §10"],
    ["Regularisation (L1, L2, C)", "A penalty that keeps coefficients small so the model does not chase noise.", "L2 (ridge) shrinks all coefficients; L1 (lasso) can set some to zero. C = 1/penalty strength: small C = strong penalty. Our best: C = 0.0001, L2 — a strongly shrunk model, because the signal is weak and shifts over time.", "grid, Figure B2"],
    ["Class weights ('balanced')", "Make each rare shock count more during training.", "Weights each class inversely to its frequency so the model does not ignore the minority class. Side effect: probabilities are no longer calibrated (centred near 0.5 for LR).", "grids for LR and tree"],
    ["k-nearest neighbours (KNN)", "Find the k most similar past weeks and use the share of them that were followed by a shock.", "Non-parametric 'analogue' forecast (Unit 11). Small k = flexible (overfits); large k = smooth (underfits). Needs scaled features because it uses distances. Selected k = 100, uniform weights, z-scores.", "nb03 §4"],
    ["Distance weighting (KNN)", "Closer neighbours get a bigger vote.", "Gives training AUC = 1.0 (each training row is its own neighbour) — memorisation without validation gain.", "grid"],
    ["Decision tree", "A flow-chart of yes/no questions that ends in a prediction.", "Each split picks the feature and cut-off that most reduce impurity. max_depth and min_samples_leaf limit complexity. Selected: depth 4, leaves ≥ 40 rows. First split: rupee fell > 8% in 8 weeks.", "nb03 §4, §9"],
    ["Gini impurity", "How mixed a group is (0 = all one class).", "Gini = 1 − Σ p_k². A split is good if it lowers the weighted Gini of the child groups (Units 08–09).", "tree"],
    ["Scaling (z-score, Min-Max)", "Put features on comparable scales.", "z = (x − mean)/SD; Min-Max = (x − min)/(max − min). Min-Max is hurt by outliers (heavy tails squeeze normal weeks together); z-score won for KNN (0.64 vs 0.53).", "Units 04 and 11; `make_models()`"],
  ]],
  ["Metrics", [
    ["Confusion matrix", "A 2 × 2 count of right and wrong predictions.", "TP = shock caught; FN = shock missed; FP = false alarm; TN = calm week left alone. All threshold metrics come from these four counts.", "Figure B5"],
    ["Accuracy", "Share of all predictions that were right.", "(TP + TN) / all. Misleading with rare events: never alerting scores 92.3% in the test.", "Table 19"],
    ["Precision", "Of the alarms, how many were right?", "TP / (TP + FP). Low when shocks are rare (base-rate effect): 0.10–0.14 in test.", ""],
    ["Recall (sensitivity)", "Of the real shocks, how many did we catch?", "TP / (TP + FN). KNN 0.57 in test.", ""],
    ["Specificity", "Of the calm weeks, how many did we correctly leave alone?", "TN / (TN + FP). Trade-off with recall as the threshold moves.", ""],
    ["F1 score", "One number balancing precision and recall.", "Harmonic mean 2PR/(P+R); low if either is low.", ""],
    ["ROC curve and ROC-AUC", "How well the model ranks shock weeks above calm weeks, over all thresholds.", "ROC plots recall against false-positive rate. AUC = probability a random shock row scores higher than a random calm row: 0.5 = chance, 1 = perfect. Threshold-free and insensitive to the shock rate.", "Figure B3"],
    ["PR curve and PR-AUC", "Precision against recall over all thresholds.", "Focuses on the rare class; no-skill level = shock rate (0.077). More informative than ROC under imbalance (the Unit 10 homework question).", "Figure B3"],
    ["Brier score", "Average squared error of the predicted probabilities.", "Mean of (p − y)²; lower is better. Measures calibration (does 20% mean 20%?). LR 0.238 is poor because its probabilities sit near 0.5. It is also the loss in the fairness hypothesis H5 (M2).", ""],
    ["Calibration", "Whether predicted probabilities match observed frequencies.", "Needed if officials read the probability itself. Class weights and heavy shrinkage break it; M4 will adjust the probabilities so they match observed shock rates.", ""],
  ]],
  ["Costs and thresholds", [
    ["Decision threshold", "The probability above which we raise an alarm.", "Default 0.5 is arbitrary. We pick the threshold that minimises expected cost on out-of-fold predictions.", "`best_threshold()`"],
    ["Asymmetric error costs", "Missing a shock hurts more than a false alarm.", "We weight a miss (FN) as 5 false alarms (FP). Expected cost = 1 × FP + 5 × FN.", "nb03 §7"],
    ["Trivial policies", "Never alert, or always alert.", "The cheaper of the two is the benchmark any model must beat on cost. In 2021–24 at 5:1 always-alert was cheaper (shock rate 19.5% > 1/6); in the test never-alert was.", "`trivial_policy_costs()`"],
    ["Base-rate change", "The share of shocks changes between periods.", "Shock rate 17% (train) → 8% (test). Ranking can stay similar but precision falls and fixed thresholds over-alert.", "nb03 §1, §7"],
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
    ["Block bootstrap", "Resample whole weeks many times to see how much a result could vary.", "2,000 resamples of test weeks (all five rows together) give 95% intervals for AUCs and AUC differences. Built from bootstrap sampling and cluster sampling (Unit 04) and confidence intervals (Unit 06). For H1 it replaces the DeLong test planned in M2, which assumes independent rows.", "`week_block_bootstrap()`"],
    ["HAC (Newey–West) SE", "Standard errors that allow weekly errors to be correlated over time.", "Without them, p-values would be too small. Lags = horizon + 2 for overlapping windows.", "nb04"],
    ["Difference regression", "Regress Q5's minus Q1's outcome on the shared driver.", "Its slope equals β_Q5 − β_Q1 directly, with one standard error that already handles the correlation between the groups.", "H2"],
  ]],
  ["Overfitting and tuning", [
    ["Overfitting", "The model memorises training data and does worse on new data.", "Seen as training AUC rising while validation AUC falls (KNN k = 5: 0.98 vs 0.56).", "Figure B2"],
    ["Underfitting", "The model is too simple to capture the pattern.", "Both training and validation scores low. Our baselines underfit a weak signal (CV AUC ≈ 0.64).", "nb03 §12"],
    ["Validation curve", "A plot of score against a hyperparameter.", "Shows where overfitting begins and where the best setting lies.", "Figure B2"],
    ["Grid search", "Try every combination of candidate settings and keep the best.", "Exhaustive and transparent; 48 (LR), 44 (KNN), 98 (tree) settings × 4 folds.", "`grid_search_time_cv()`"],
  ]],
];

// Methods used from beyond the lecture slides (Section 5.8)
const BEYOND = [
  ["Expanding-window cross-validation (new in M3)", "Shuffled K-fold (Week 7) lets the model learn from the future and from sister rows of the same week; nb03 §5 shows it inflates AUC by 0.05–0.14.", "Always train on the past and validate on the next year, like a real forecaster."],
  ["Permutation importance (new in M3)", "KNN has no coefficients and no Gini importance, but the rubric asks which features drive the models.", "Shuffle one feature in the validation year; the bigger the drop in AUC, the more the model relied on it."],
  ["Standard errors clustered by week (new in M3)", "The five quintile rows of a week share the same signals; treating them as independent overstates the H1 evidence about four-fold (χ² 94 against 22.4).", "Count each week as one block of evidence, not five rows."],
  ["Logit likelihood-ratio test (from the M2 plan)", "H1 compares a model with and without the six signals.", "Twice the gain in log-likelihood, compared with a chi-square distribution."],
  ["OLS with Newey–West (HAC) errors (from the M2 plan)", "H2 and H3 are regressions on weekly data, and errors in nearby weeks are correlated (overlapping 8-week windows).", "Regression is Week 10; HAC widens the standard errors so the p-values are not too optimistic."],
  ["Brier score (from the M2 plan)", "It is the loss in the fairness hypothesis H5; in M3 it shows that LR's probabilities are not calibrated.", "Mean squared error of the predicted probabilities."],
  ["Diebold–Mariano test (M4 plan only, from M2)", "It will test H5 (are Q1's forecast errors larger than Q5's?) in Milestone 4.", "A t-test on the weekly difference between two groups' losses, with standard errors that allow for autocorrelation."],
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
body.push(new Paragraph({ children: [new TextRun({ text: "Milestone 3 Reference", font: FONT, size: 52, bold: true, color: ACCENT })], spacing: { after: 200 } }));
body.push(P("Baseline models, evaluation and initial findings: files, concepts and decisions", { size: 28, color: MUTED, after: 120 }));
body.push(P("Early-warning system for essential-price shocks across income quintiles in Pakistan", { size: 24, color: MUTED, after: 120 }));
body.push(P("CS/SDP 312/314 Data Science for Social Good · Team: Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid", { size: 22, color: MUTED, after: 120 }));
body.push(P("Version: 26 October 2026 (Milestone 3 due 24 October 2026)", { size: 22, color: MUTED, after: 600 }));
body.push(P("This document is the companion to Milestone 3. It lists every file the milestone created or used, what each one does and the concepts behind it, and the limitations that lead into Milestone 4. The viva preparation for Milestones 2 and 3 together (every decision with the alternatives we checked, the key numbers and a question bank) is in `DS4SG_Viva_Guide_M2_M3.docx`. The project-wide script and data reference (`DS4SG_Script_and_Data_Reference.docx`) covers the data pipeline of Milestones 1–2.", { size: 22 }));
body.push(pageBreak());

// TOC
body.push(new Paragraph({ children: [new TextRun({ text: "Contents", font: FONT, size: 32, bold: true, color: ACCENT })], spacing: { after: 200 } }));
const TOC_AT = body.length;            // the contents list is inserted here once all headings exist
body.push(pageBreak());

// 1. How to use
body.push(H1("1. How to use this document"));
body.push(P("This is the reference for Milestone 3: what was built (Section 2), how to run it (Section 3), every file and function (Section 4), the concepts behind them in plain words and in detail (Section 5), and the limitations that lead into Milestone 4 (Section 6)."));
body.push(P("**For the viva**, use `DS4SG_Viva_Guide_M2_M3.docx`. It covers Milestones 2 and 3 together: every decision (D1–D5, P1–P7, F1–F4 and B1–B20, the IDs used in the rubric map below and in the code) with the reason, the other values or methods we checked and why we did not use them, plus the key numbers and a question bank.", { before: 80 }));
body.push(P("Suggested use alongside the viva guide:", { before: 80 }));
body.push(NUM("Run `notebooks/03_baseline_models.ipynb` top to bottom yourself and read each interpretation cell."));
body.push(NUM("Look up any unfamiliar term in Section 5."));
body.push(NUM("Change one thing and see what moves, e.g. set `COST_FN = 10` in `baseline.py`, or validate on 2022–2024 only."));
body.push(P("Paths are relative to the project folder. Code names appear in `monospace`.", { before: 80 }));

// 2. At a glance
body.push(pageBreak());
body.push(H1("2. Milestone 3 at a glance"));
body.push(H2("2.1 What we built, in one paragraph"));
body.push(P("We built and honestly evaluated the first versions of an early-warning classifier. Standing at the end of a week, it predicts whether next week will be a price-shock week (SPI up by at least 1%) for each income quintile. Three baseline models (logistic regression, KNN, a shallow decision tree) were compared with two naive benchmarks. They were tuned with cross-validation that respects time, judged with all standard metrics and with a cost analysis in which missing a shock is five times worse than a false alarm, and explained with three feature-importance measures. We also ran the three hypothesis tests promised in Milestone 2."));
body.push(H2("2.2 Headline results"));
body.push(BUL("In the 2021–24 validation years all three models beat both benchmarks on pooled AUC (0.64–0.65 vs 0.58 for persistence) and cut error costs by a third compared with never alerting. Much of the pooled score comes from telling crisis years from calm years, though: within years, KNN (0.67) and LR (0.65) beat persistence (0.57) and the tree (0.58) barely does."));
body.push(BUL("In the calm 2025–26 test period, KNN had the highest AUC (0.68; clearly above LR, not clearly above the tree), but at 5:1 no model beat 'never alert' on cost: the shock rate halved (17% → 8%), so thresholds learned in crisis years over-alert."));
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
body.push(P("Each concept is explained in plain words and then in more detail, with where it appears. Lecture slides: scaling, sampling and bootstrap sampling are Unit 04; resistant statistics and correlation Unit 05; confidence intervals Unit 06; hypothesis tests and p-values Unit 07; decision trees, Gini and entropy Units 08–09; the confusion matrix, precision, recall, F-measure, ROC and AUC Unit 10 (PR-AUC is its homework); KNN, distances, weighted voting and normalisation Unit 11. The syllabus adds hold-out and cross-validation (Week 7), logistic regression (Week 9) and regression analysis (Week 10); ensembles (Week 12) and fairness (Week 15) come later. Section 5.8 lists the few methods we used from beyond the course, and why."));
for (const [group, rows] of CONCEPTS) {
  body.push(H2(`5.${CONCEPTS.findIndex((c) => c[0] === group) + 1} ${group}`));
  body.push(grid(["Concept", "In simple words", "In more detail", "Where"], rows, [1700, 2600, 3500, 1226], { size: 17, firstBold: true }));
}
body.push(H2("5.8 Methods beyond the lecture slides"));
body.push(P("Almost everything in Milestone 3 comes from the lecture slides, the syllabus or the rubric. These are the exceptions. Each one is there because the course method alone would have given a wrong or incomplete answer, so be ready to say why in one sentence."));
body.push(grid(["Method", "Why we needed it", "One-line explanation"], BEYOND, [2300, 3600, 3126], { size: 17, firstBold: true }));
body.push(P("Dropped in this version: the DeLong test planned in M2 (replaced by the week-block bootstrap, which is built from bootstrap and cluster sampling in Unit 04).", { before: 80 }));

// 6. Limitations and roadmap
body.push(pageBreak());
body.push(H1("6. Limitations and the road to Milestone 4"));
body.push(BUL("**Underfitting and a weak signal:** no cross-validated AUC reaches 0.7; the best LR is shrunk almost to a constant."));
body.push(BUL("**Calibration and a changing shock rate:** class weights and shrinkage distort probabilities; thresholds do not transfer from crisis to calm years."));
body.push(BUL("**Selection criterion:** pooled AUC partly rewards telling crisis years from calm ones, which flattered the tree; M4 reports within-year AUC alongside it."));
body.push(BUL("**Small test set:** 35 shock rows in 13 weeks, so the confidence intervals are wide."));
body.push(BUL("**Missing lead information:** tariff decisions (NEPRA, OGRA, ECC) and perishable supply shocks."));
body.push(BUL("**Potential bias:** urban-only SPI (17 cities); 2015-16 quintile weights; LR and tree missed 6 of 7 Q1 shocks vs 4 of 6 for Q5."));
body.push(BUL("**M4 plan:** ensembles (random forest, gradient boosting) under the same protocol; quintile-specific models and the H4 interaction test; calibration of the probabilities; within-year AUC reported next to pooled AUC; a tariff-notification calendar, a first-month-of-the-fiscal-year window and a regime feature; fairness audit (H5: Brier scores and miss rates Q1 vs Q5 with the Diebold–Mariano test planned in M2, equal recall across quintiles, quintile-specific thresholds); ethics of public warnings."));

// ================================================================ DOCUMENT
const matrixHeading = H1("7. Cross-reference matrix: files × steps");
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
const header = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "DS4SG · Milestone 3 Reference", font: FONT, size: 16, color: MUTED })] })] });
const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED })] })] });

const doc = new Document({
  creator: "DS4SG team", title: "Milestone 3 Reference", styles: STYLES,
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
