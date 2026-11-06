# Early hospital readmission (diabetes), Assignment 2

- **Team members:** Syeda Hoorain Imran (08704), Munib Sattar (09239)
- **Language / version:** Python 3.13.3, packages pinned in `requirements.txt` (`pip install -r requirements.txt`)
- **How to run prediction:** `python predict.py --input holdout_features.csv --output preds.csv` (needs only `predict.py` and `model/`)
- **Model:** gradient boosting in a scikit-learn Pipeline (imputation, scaling, one-hot encoding). `clean()` in `predict.py` handles `"?"`, blanks, unseen codes and missing columns.
- **Validation:** grouped by patient, a 20% patient holdout plus `StratifiedGroupKFold` (5 folds, `patient_nbr`) on the rest.
- **Threshold:** `threshold.json`, chosen on out-of-fold predictions of the training patients only (see `report.pdf`).
- **Notebook:** put `diabetes_dev.csv` next to `notebook.ipynb` and run all cells (about 20 to 30 minutes).
