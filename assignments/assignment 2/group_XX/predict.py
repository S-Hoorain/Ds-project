"""Early-readmission prediction for the diabetes dataset (Assignment 2).

Run as:   python predict.py --input holdout_features.csv --output preds.csv

The input has the same raw columns as diabetes_dev.csv, without "readmitted".
The output has two columns, encounter_id and prob_early_readmit, with one row per
input row in the same order.

How it works
  1. clean(df) turns the raw rows into the model's input table. It replaces "?" and
     blanks, groups the ID codes, diagnosis codes and specialties into broader
     categories, and builds a few count features. The notebook imports this same
     function, so training and prediction use identical cleaning.
  2. model/pipeline.joblib is the fitted scikit-learn Pipeline. It does the
     imputation, scaling, one-hot encoding and the classifier itself.
  3. predict_proba(df) = pipeline probability of class 1 for clean(df).

Nothing is retrained here, no internet or training data is needed, and
encounter_id / patient_nbr are never used as features.
"""
import os
import argparse

import numpy as np
import pandas as pd
import joblib

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, "model", "pipeline.joblib")

# ---------------------------------------------------------------------------
# 1. Column lists
# ---------------------------------------------------------------------------
# Raw numeric columns that are used as they are
RAW_NUMERIC = ["time_in_hospital", "num_lab_procedures", "num_procedures",
               "num_medications", "number_diagnoses"]

# Prior-visit counts are very right-skewed (most are 0, a few go up to 76),
# so we use log(1 + x), the same transform we used in Assignment 1.
VISIT_COUNTS = ["number_outpatient", "number_emergency", "number_inpatient"]

# The 23 diabetes-drug columns (values No / Steady / Up / Down)
DRUG_COLUMNS = ["metformin", "repaglinide", "nateglinide", "chlorpropamide",
                "glimepiride", "acetohexamide", "glipizide", "glyburide",
                "tolbutamide", "pioglitazone", "rosiglitazone", "acarbose",
                "miglitol", "troglitazone", "tolazamide", "examide",
                "citoglipton", "insulin", "glyburide-metformin",
                "glipizide-metformin", "glimepiride-pioglitazone",
                "metformin-rosiglitazone", "metformin-pioglitazone"]

# Drugs kept as their own feature. The other 21 drugs are used by fewer than
# 13% of stays (several by fewer than 10), so they only enter through the counts.
DRUGS_KEPT = ["insulin", "metformin"]

# Final model input: numeric and categorical feature names
NUMERIC_FEATURES = (["age_years"] + RAW_NUMERIC
                    + ["log_" + c for c in VISIT_COUNTS]
                    + ["log_total_visits", "n_diabetes_drugs", "n_dose_changes",
                       "med_change", "on_diabetes_med"])

# Race is deliberately NOT a model input. It added almost nothing to accuracy in our
# tests, and we did not want a follow-up decision to depend on a social category.
# It is still used in the notebook to check performance for each race group.
CATEGORICAL_FEATURES = (["gender", "admission_type", "discharge_group",
                         "admission_source", "payer_code", "specialty",
                         "diag_1_group", "diag_2_group", "diag_3_group",
                         "max_glu_serum", "A1Cresult"] + DRUGS_KEPT)

# Every raw column clean() reads. Missing columns are added as empty (NaN).
RAW_COLUMNS_USED = (["gender", "age", "admission_type_id",
                     "discharge_disposition_id", "admission_source_id",
                     "payer_code", "medical_specialty", "diag_1", "diag_2",
                     "diag_3", "max_glu_serum", "A1Cresult", "change",
                     "diabetesMed"] + RAW_NUMERIC + VISIT_COUNTS + DRUG_COLUMNS)

# ---------------------------------------------------------------------------
# 2. Groupings of the ID codes (descriptions from IDS_mapping.csv)
# ---------------------------------------------------------------------------
ADMISSION_TYPE = {1: "Emergency", 2: "Urgent", 3: "Elective",
                  4: "Other", 7: "Other",                # newborn, trauma centre
                  5: "Unknown", 6: "Unknown", 8: "Unknown"}  # not available / NULL / not mapped

DISCHARGE_GROUP = {
    1: "Home",
    6: "Home with care", 8: "Home with care",            # home health service, home IV
    3: "Care facility", 4: "Care facility", 5: "Care facility",   # SNF, ICF, other inpatient care
    15: "Care facility", 24: "Care facility", 27: "Care facility",
    29: "Care facility", 30: "Care facility",
    22: "Rehab facility",                                # rehab unit (28% early readmission)
    23: "Long-term care hospital",                       # long stays, so few return within 30 days (7%)
    2: "Hospital transfer", 9: "Hospital transfer", 10: "Hospital transfer",
    28: "Psychiatric hospital",
    7: "Left against advice",
    12: "Outpatient referral", 16: "Outpatient referral", 17: "Outpatient referral",
    13: "Hospice", 14: "Hospice",
    11: "Expired", 19: "Expired", 20: "Expired", 21: "Expired",
    18: "Unknown", 25: "Unknown", 26: "Unknown",
}

ADMISSION_SOURCE = {
    1: "Referral", 2: "Referral", 3: "Referral",          # physician, clinic, HMO
    7: "Emergency room",
    4: "Transfer", 5: "Transfer", 6: "Transfer", 10: "Transfer",
    18: "Transfer", 22: "Transfer", 25: "Transfer", 26: "Transfer",
    9: "Unknown", 15: "Unknown", 17: "Unknown", 20: "Unknown", 21: "Unknown",
    8: "Other", 11: "Other", 12: "Other", 13: "Other", 14: "Other",
    19: "Other", 23: "Other", 24: "Other",
}

# Specialties seen at least ~500 times keep their own name; the rest are grouped
SPECIALTY_KEEP = {"InternalMedicine", "Family/GeneralPractice", "Emergency/Trauma",
                  "Cardiology", "Nephrology", "Pulmonology", "Urology",
                  "Gastroenterology"}
SPECIALTY_PREFIX = [("Surgery", "Surgery"), ("Surgeon", "Surgery"),
                    ("SurgicalSpecialty", "Surgery"), ("Orthopedics", "Orthopedics"),
                    ("Pediatrics", "Pediatrics"), ("Oncology", "Oncology/Hematology"),
                    ("Hematology", "Oncology/Hematology"), ("Psych", "Psychiatry"),
                    ("Radiolog", "Radiology"), ("Obstetric", "Obstetrics/Gynecology"),
                    ("Obsteric", "Obstetrics/Gynecology"), ("Gynecology", "Obstetrics/Gynecology")]


def _is_missing(s: pd.Series) -> pd.Series:
    """True where a raw value means 'not recorded': NaN, '?', blank, 'None', 'NULL'."""
    txt = s.astype(str).str.strip()
    return s.isna() | txt.isin(["?", "", "None", "nan", "NaN", "NULL"])


def _clean_text(s: pd.Series, missing_label: str = "Unknown") -> pd.Series:
    """Strip spaces and replace every kind of missing value by one label."""
    out = s.astype(str).str.strip()
    return out.where(~_is_missing(s), missing_label)


def _map_codes(s: pd.Series, mapping: dict) -> pd.Series:
    """Map numeric ID codes to group names. Unknown or unseen codes -> 'Unknown'."""
    codes = pd.to_numeric(s, errors="coerce")
    return codes.map(mapping).fillna("Unknown")


def icd9_group(code) -> str:
    """Group one ICD-9 diagnosis code into a broad disease chapter.

    The groups follow the ICD-9 chapter ranges, as used in the paper that first
    described this dataset (Strack et al., 2014). 250.xx is diabetes itself.
    V and E codes (visit reasons, external causes) and anything we cannot read
    go to 'Other', and missing codes get their own 'Missing' group.
    """
    if code is None or (isinstance(code, float) and np.isnan(code)):
        return "Missing"
    code = str(code).strip()
    if code in ("", "?", "nan", "None"):
        return "Missing"
    if code[0] in "VvEe":
        return "Other"
    try:
        x = float(code)
    except ValueError:
        return "Other"
    if 250 <= x < 251:
        return "Diabetes"
    if 390 <= x < 460 or int(x) == 785:
        return "Circulatory"
    if 460 <= x < 520 or int(x) == 786:
        return "Respiratory"
    if 520 <= x < 580 or int(x) == 787:
        return "Digestive"
    if 580 <= x < 630 or int(x) == 788:
        return "Genitourinary"
    if 710 <= x < 740:
        return "Musculoskeletal"
    if 800 <= x < 1000:
        return "Injury"
    if 140 <= x < 240:
        return "Neoplasms"
    return "Other"


def specialty_group(name: str) -> str:
    """Group the 70 admitting-physician specialties into 17 broader groups."""
    if name == "Unknown" or name == "PhysicianNotFound":
        return "Unknown"
    if name in SPECIALTY_KEEP:
        return name
    for prefix, group in SPECIALTY_PREFIX:
        if name.startswith(prefix):
            return group
    return "Other"


def age_to_years(s: pd.Series) -> pd.Series:
    """'[70-80)' -> 75 (middle of the 10-year band). Unreadable values -> NaN."""
    lower = pd.to_numeric(s.astype(str).str.extract(r"(\d+)")[0], errors="coerce")
    return lower + 5


# ---------------------------------------------------------------------------
# 3. The cleaning function (raw rows -> model input table)
# ---------------------------------------------------------------------------
def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Turn raw rows (same format as diabetes_dev.csv) into the model's input.

    Works row by row, so the output has the same number of rows and the same
    order as the input. It never looks at encounter_id, patient_nbr or readmitted.
    """
    raw = df.copy()
    raw.index = range(len(raw))           # keep the input order, whatever the index was
    for col in RAW_COLUMNS_USED:          # a missing column becomes an empty one
        if col not in raw.columns:
            raw[col] = np.nan

    out = pd.DataFrame(index=raw.index)

    # --- numeric features -------------------------------------------------
    out["age_years"] = age_to_years(raw["age"])
    for col in RAW_NUMERIC:
        out[col] = pd.to_numeric(raw[col], errors="coerce")   # '?' -> NaN, imputed later

    visits = pd.DataFrame({c: pd.to_numeric(raw[c], errors="coerce").clip(lower=0)
                           for c in VISIT_COUNTS})
    for col in VISIT_COUNTS:
        out["log_" + col] = np.log1p(visits[col])
    out["log_total_visits"] = np.log1p(visits.sum(axis=1, min_count=1))

    # Diabetes drugs: how many are prescribed, and how many had the dose changed
    drugs = raw[DRUG_COLUMNS].astype(str).apply(lambda s: s.str.strip())
    out["n_diabetes_drugs"] = drugs.isin(["Steady", "Up", "Down"]).sum(axis=1)
    out["n_dose_changes"] = drugs.isin(["Up", "Down"]).sum(axis=1)
    out["med_change"] = (raw["change"].astype(str).str.strip() == "Ch").astype(int)
    out["on_diabetes_med"] = (raw["diabetesMed"].astype(str).str.strip() == "Yes").astype(int)

    # --- categorical features ---------------------------------------------
    gender = _clean_text(raw["gender"])
    out["gender"] = gender.where(gender.isin(["Female", "Male"]), "Unknown")

    out["admission_type"] = _map_codes(raw["admission_type_id"], ADMISSION_TYPE)
    out["discharge_group"] = _map_codes(raw["discharge_disposition_id"], DISCHARGE_GROUP)
    out["admission_source"] = _map_codes(raw["admission_source_id"], ADMISSION_SOURCE)

    out["payer_code"] = _clean_text(raw["payer_code"])       # rare codes are pooled by the encoder
    out["specialty"] = _clean_text(raw["medical_specialty"]).map(specialty_group)

    for col in ["diag_1", "diag_2", "diag_3"]:
        out[col + "_group"] = raw[col].map(icd9_group)

    # A blank glucose or A1c result means the test was not done, which is
    # information in itself, so it becomes its own category.
    for col in ["max_glu_serum", "A1Cresult"]:
        out[col] = _clean_text(raw[col], missing_label="Not tested")

    for col in DRUGS_KEPT:
        out[col] = _clean_text(raw[col], missing_label="No")

    return out[NUMERIC_FEATURES + CATEGORICAL_FEATURES]


# ---------------------------------------------------------------------------
# 4. Prediction
# ---------------------------------------------------------------------------
_PIPELINE = None


def _load_pipeline():
    """Load the fitted pipeline once (relative path, next to this file)."""
    global _PIPELINE
    if _PIPELINE is None:
        _PIPELINE = joblib.load(MODEL_PATH)
    return _PIPELINE


def predict_proba(df: pd.DataFrame) -> np.ndarray:
    """df: raw rows (same columns as diabetes_dev.csv, no "readmitted").
    Returns a 1-D array, same length and order as df, of probabilities
    in [0, 1] that the stay is followed by readmission within 30 days."""
    if len(df) == 0:
        return np.array([], dtype=float)
    pipe = _load_pipeline()
    prob = pipe.predict_proba(clean(df))[:, 1]
    prob = np.nan_to_num(prob, nan=0.0)   # safety net, the pipeline imputes all gaps
    return np.clip(prob, 0.0, 1.0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    a = ap.parse_args()
    df = pd.read_csv(a.input)
    out = pd.DataFrame({"encounter_id": df["encounter_id"],
                        "prob_early_readmit": predict_proba(df)})
    os.makedirs(os.path.dirname(a.output) or ".", exist_ok=True)
    out.to_csv(a.output, index=False)
