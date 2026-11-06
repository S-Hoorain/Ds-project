"""Interpretation text for notebook.ipynb (slotted into the placeholder cells by build_notebook.py).
Every number here comes from the executed notebook outputs."""

TEXT = {}

TEXT["MISSING_MD"] = r"""
**What we found and what we do about it.**
- **weight** is missing for **97%** of stays, so there is almost nothing to learn from it, and whether it was recorded
  does not relate to the target (11.1% vs 11.0%). We **drop the column** (deleting a variable, Unit 03).
- **medical_specialty (49%)** and **payer_code (40%)** are missing too often to delete rows, and filling them with the
  most common value would invent a specialty for half of the patients. Their missingness is also not random: stays
  with an unknown payer or specialty are readmitted slightly more often (11.5% vs 10.9% and 10.8%). So **"Unknown"
  becomes its own category** (constant imputation), and the model can use the fact that the value is missing.
- **race (2%)** gets the same "Unknown" label, and the **diagnosis columns** (under 1.4% missing) get a "Missing" group.
- **max_glu_serum (95%)** and **A1Cresult (83%)** are blank when the test was **not done**. That is an answer, not a
  gap, so it becomes a **"Not tested"** category. Stays without an A1c test are readmitted a little more often
  (11.4% vs 9.9%). The paper that first described this dataset (Strack et al., 2014) studied exactly this link between
  A1c testing and readmission.

Deleting every row with a missing value (listwise deletion) was never an option, because weight alone is missing in
97% of rows.
"""

TEXT["REPEAT_MD"] = r"""
**13,376 patients** have more than one stay, and their stays make up **46%** of all rows. Patients seen only once are
readmitted early in **4%** of stays, while patients with five or more stays are readmitted early in **28%**. This has
two consequences.
1. **Splitting.** Stays of the same person are related, so they must stay on the same side of every split (Section 3).
2. **A feature we must not build.** "Number of rows this patient has in the file" would look very predictive, but it
   is built from `patient_nbr` (not allowed) and partly from the future, because an early readmission is itself
   another row of the same patient. It would leak the answer into the input, so we do not use it.
"""

TEXT["RATES_MD"] = r"""
- **Prior inpatient stays** show the clearest pattern. The early-readmission rate climbs steadily from **8.5%** for
  patients with no inpatient stay in the previous year to **39%** for patients with six or more. Patients who are often
  in hospital tend to come back. This variable is the basis of our one-feature baseline in Section 4.
- **Age** matters much less. The rate stays between 10% and 13% in every band from 20 to 100, and only children and
  teenagers (under 20, about 700 stays) are clearly lower. Age bands are ordered, so we turn each band into a number,
  the middle of the band in years (for example "[70-80)" becomes 75).
"""

TEXT["DISCHARGE_MD"] = r"""
Discharge disposition has 26 codes, and many have only a handful of stays. Two patterns stand out.
- **Expired** stays (codes 11, 19, 20 and 21, 1,311 stays) have **no** early readmissions, since a patient who died
  cannot return. We keep these rows, because the held-out set will contain such stays as well, and the model can learn
  to give them a probability close to zero. **Hospice** stays (codes 13 and 14) are also rarely readmitted (5.6%).
- Patients sent to a **rehab unit (code 22)** or a **psychiatric hospital (code 28)** come back far more often (28% and
  36%) than patients sent home (9%).

We group the codes **by meaning**, using the descriptions in IDS_mapping.csv (last column of the table). Codes with
very few stays, such as 9, 12 or 15, join a group of similar destinations instead of standing alone, so the model does
not learn from 2 to 50 stays per code. Section 4.2 checks that this grouping costs almost nothing.
"""

TEXT["DIAG_MD"] = r"""
Each diagnosis column holds about **700 different ICD-9 codes**, and **406** primary-diagnosis codes appear fewer than
20 times. One-hot encoding them directly would create about 2,000 columns, most of them too rare to learn from, and
the held-out patients will bring codes we have never seen. We therefore put every code into one of **9 disease
groups** using the standard ICD-9 chapter ranges, as in the paper that first described this dataset (Strack et al.,
2014):

| Group | ICD-9 codes |
|---|---|
| Circulatory | 390–459, 785 |
| Respiratory | 460–519, 786 |
| Digestive | 520–579, 787 |
| Diabetes | 250.xx |
| Injury | 800–999 |
| Musculoskeletal | 710–739 |
| Genitourinary | 580–629, 788 |
| Neoplasms | 140–239 |
| Other | all other codes, including V and E codes |

A missing code ("?") gets its own "Missing" group. A code we have never seen still falls into one of these ranges,
so the grouping also protects the prediction script against unseen diagnosis codes.
"""

TEXT["CLEANING_MD"] = r"""
All cleaning steps are in the function `clean()` in `predict.py`, which this notebook imports. It works row by row, so
it gives the same result for one row or for 20,000 rows, and it never reads `readmitted`, `encounter_id` or
`patient_nbr`.

| Raw column(s) | Problem | What we do | Why |
|---|---|---|---|
| weight | 97% "?" | dropped | almost no information |
| payer_code, medical_specialty | "?" in 40% and 49% | "Unknown" category | missingness carries information, too common to delete |
| max_glu_serum, A1Cresult | blank = test not done | "Not tested" category | an answer, not a gap |
| diag_1, diag_2, diag_3 | about 700 codes each, some "?" | 9 ICD-9 disease groups plus "Missing" | too many rare codes, unseen codes still fit |
| medical_specialty | 70 specialties | 17 groups (8 large ones kept, "Surgery-…" joined, rare ones "Other") | rare specialties |
| admission_type_id, discharge_disposition_id, admission_source_id | numbers that are really categories | grouped by meaning from IDS_mapping.csv into 5, 12 and 5 groups, unknown codes become "Unknown" | the numbers have no order |
| age | text bands "[70-80)" | middle of the band in years | ordered, so we keep the order (Unit 11 maps ordinal values to numbers) |
| number_outpatient, number_emergency, number_inpatient | strongly right-skewed counts | log(1 + x), plus the log of their total | pulls in the long right tail, as in Assignment 1 |
| 23 drug columns | 21 drugs are used in under 13% of stays | keep insulin and metformin, add the number of diabetes drugs and the number of dose changes | rare columns add noise |
| change, diabetesMed | "Ch"/"No", "Yes"/"No" | 0/1 | binary |
| gender | 2 "Unknown/Invalid" | "Unknown" | |
| race | 2% "?" | **not used as a model input** | see Section 4.2 and Section 9 |

**Race.** We decided not to use race as an input. It added almost no accuracy (Section 4.2), and we did not want the
decision about who gets extra follow-up to depend on a social category. We still use race to check how well the model
works for each group (Section 9).

The steps that must be **learned from data** (median of each numeric column, scaling, which categories are common)
are not in `clean()`. They are in the fitted pipeline (Section 3), so they are learned again inside every
cross-validation fold and never see the validation rows.
"""

TEXT["GROUPS_MD"] = r"""
After grouping, every category has enough stays to learn from, and the patterns of the raw codes survive. Psychiatric
hospital (36%) and rehab facility (28%) have the highest rates, home has 9% and expired 0%. The primary
diagnosis groups differ less (9% to 13%), with diabetes and injury the highest. Stays without an A1c test have a
slightly higher rate than any tested level.
"""
