"""Collect the executed notebook's exported tables and printed numbers into one JSON file,
used by the notebook text, the report and the viva guide.

    python collect_numbers.py ../group_XX numbers.json
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd

pkg, out = Path(sys.argv[1]), Path(sys.argv[2])
data = {}
for f in sorted((pkg / "tables").glob("*.csv")):
    if f.stem == "t07_leakage_check":            # saved from a pivot table: two header rows
        t = pd.read_csv(f, header=[0, 1], index_col=0)
        t.columns = [f"{a} | {b}" for a, b in t.columns]
        t = t.reset_index().rename(columns={t.index.name or "index": "Model"})
    else:
        t = pd.read_csv(f)
        if f.stem == "t14_final_holdout_metrics":   # saved from a Series: value column is called "0"
            t = t.rename(columns={"0": "Holdout value"})
    data[f.stem] = json.loads(t.to_json(orient="records"))
data["threshold"] = json.loads((pkg / "threshold.json").read_text())["threshold"]

# Lines the notebook prints (not saved as tables)
nb = json.loads((pkg / "notebook.ipynb").read_text(encoding="utf-8"))
text = "\n".join("".join(o.get("text", "")) for c in nb["cells"] if c["cell_type"] == "code"
                 for o in c.get("outputs", []) if o["output_type"] == "stream")
num = r"([0-9.]+)"
pr = {}
m = re.search(rf"balanced weights: AP {num} \| AUC {num} \| Brier {num} \| mean predicted {num} vs real rate {num}", text)
pr["bal_ap"], pr["bal_auc"], pr["bal_brier"], pr["bal_mean"], pr["real_rate"] = map(float, m.groups())
for name, key in [("Logistic regression", "lr"), ("Gradient boosting", "gb")]:
    m = re.search(rf"{name}\s+out-of-fold AP {num} \| AUC {num} \| Brier {num}", text)
    pr[f"{key}_oof_ap"], pr[f"{key}_oof_auc"], pr[f"{key}_oof_brier"] = map(float, m.groups())
pr["f1_best_threshold"] = float(re.search(rf"Highest F1: threshold {num}", text).group(1))
for r in [3, 5, 7, 10]:
    pr[f"cost{r}_threshold"] = float(re.search(rf"Miss = {r} x alarm: lowest cost at threshold {num}", text).group(1))
m = re.search(rf"Holdout AP without race {num} \| with race {num}", text)
pr["hold_ap_norace"], pr["hold_ap_race"] = map(float, m.groups())
pr["onehot_columns"] = int(re.search(r"Columns after one-hot encoding: (\d+)", text).group(1))
pr["n_features"] = int(re.search(r"Model input: \d+ rows x (\d+) features", text).group(1))
data["printed"] = pr
out.write_text(json.dumps(data, indent=1), encoding="utf-8")
print("tables:", ", ".join(k for k in data if k.startswith("t")))
print("printed:", pr)
