# Milestone 4: Advanced Model Deployment and Findings (6 marks)

Syllabus: Week 12 (Nov 2–6), "Final Model, Fairness and Ethics Modeling". Due 2026-11-10 (an extension was requested
by the class).

Having established baseline performance in Milestone 03, your team will now implement advanced machine learning
architectures (e.g., ensemble learning, regularized networks), perform rigorous hyperparameter optimization. This
milestone also requires you to conduct a thorough Algorithmic Bias and Fairness Audit to quantify algorithmic disparity
across sensitive attributes, evaluate accuracy-fairness trade-offs, and implement mitigation strategies
(pre-processing, in-processing, or post-processing) to ensure ethical deployment.

## 1. Required technical and analytical deliverables

### A. Baseline model implementation and architecture selection
- **Advanced algorithm implementation:** train at least two complex or ensemble architectures (e.g., Random Forests,
  Gradient Boosted Trees [XGBoost / LightGBM], Support Vector Machines, or Neural Networks) and benchmark them directly
  against your Milestone 03 baselines.
- **Systematic hyperparameter tuning:** execute a structured search (Grid Search, Random Search, or Bayesian
  Optimization) integrated with stratified K-Fold Cross-Validation to identify optimal model parameters without data
  leakage.
- **Comparative performance analysis:** evaluate improvement gains across primary metrics (Accuracy, Precision,
  Recall, F1-Score, ROC-AUC, and Precision-Recall AUC).

### B. Algorithmic bias and fairness audit
- **Sensitive attribute identification:** explicitly define the protected or sensitive attribute(s) in your dataset
  (e.g., gender, socio-economic class, geographic district, age bracket, or minority identity).
- **Quantitative disparity metrics:** compute key group fairness metrics across protected sub-populations:
  - Demographic Parity / Disparate Impact Ratio: ratio of positive prediction rates between unprivileged and privileged
    groups (evaluating compliance with the 80% rule).
  - Equalized Odds / Equal Opportunity: comparing True Positive Rates (TPR) and False Positive Rates (FPR) across
    groups to ensure equal error distribution.
  - Predictive Equality: comparing False Positive Rates to verify that non-failing / non-target cases are not
    disproportionately misclassified.
- **Fairness-accuracy trade-off analysis:** map the Pareto frontier illustrating how enforcing fairness constraints
  impacts overall predictive accuracy.

### C. Feature importance and initial research insights
- **FATEN principles alignment:** evaluate your finalized model against the FATEN framework: Fairness, Autonomy,
  Trust, Equity, and Non-maleficence.
- **Living lab and stakeholder impact:** document how your algorithm would perform in a real-world living lab
  environment, identifying potential failure modes and governance safeguards needed to prevent digital
  marginalization.

## 2. Submission requirements
- **Executable code notebook (.ipynb or .Rmd):** clean, fully documented, and reproducible code containing model
  training, cross-validation tuning grids, fairness metric calculations, bias mitigation steps, and threshold curves.
- **Manuscript enhancement:** submitted draft towards the end of Milestone 03 further enhanced, detailing model
  architectures, hyperparameter search spaces, quantitative fairness audits, Pareto trade-off plots, and ethical
  governance recommendations.

## 3. Grading rubric

| Criterion | Weight | Expectations |
|---|---|---|
| Advanced model architecture and optimization | 30 | Implementation of advanced/ensemble algorithms with systematic hyperparameter tuning via stratified CV. Clear comparative analysis against Milestone 03 baselines without data leakage. |
| Algorithmic bias and disparity audit | 35 | Identification of sensitive attributes and thorough quantitative evaluation of group fairness metrics (Demographic Parity, Equalized Odds, Disparate Impact Ratio). Clear analysis of fairness vs. accuracy trade-offs. |
| Bias mitigation and asymmetric threshold tuning | 20 | Successful implementation of pre-, in-, or post-processing bias mitigation. Optimization of decision thresholds accounting for asymmetric error costs across demographic groups. |
| Written report and code reproducibility | 15 | Fully executable, well-commented code notebook. High-quality PDF manuscript incorporating FATEN governance principles and living lab deployment considerations. |

## Where each item is answered (our submission)

| Item | Notebook | Manuscript |
|---|---|---|
| Two ensembles, benchmarked against M3 | `05_advanced_models.ipynb` §3–5 | VI-B, VI-D, Table 27 |
| Grid search with CV, no leakage (stratification discussed) | 05 §2, §4, §7 | VI-C |
| Accuracy, precision, recall, F1, ROC-AUC, PR-AUC | 05 §5 | Table 27, Fig. 15 |
| Sensitive attribute | `06_fairness_audit.ipynb` §1 | VII-A |
| Demographic parity, disparate impact (80% rule), equalized odds, equal opportunity, predictive equality | 06 §2–3 | VII-B, VII-C, Table 30, Fig. 18 |
| Pareto frontier | 06 §7 | VII-G, Fig. 19 |
| Pre-, in- and post-processing mitigation | 06 §6 | VII-F, Table 31 |
| Thresholds with asymmetric costs across groups | 05 §8, 06 §8 | VI-F, VII-H, Table 32 |
| FATEN and living lab | 06 §10–11 | VIII, Tables 33–34 |
