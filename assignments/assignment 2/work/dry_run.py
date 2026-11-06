"""Dry-run self-check (assignment Section 5.5).

Copies ONLY the submission package into a fresh empty folder, makes a 500-row
sample_features.csv without "readmitted", runs predict.py from the command line
in a new process, and checks the output file.

    python dry_run.py <package folder> <diabetes_dev.csv> <empty work folder>
"""
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

pkg, data, work = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
if work.exists():
    shutil.rmtree(work)
work.mkdir(parents=True)
target = work / pkg.name
keep = ["predict.py", "model", "threshold.json", "requirements.txt", "README.md", "notebook.ipynb", "report.pdf"]
target.mkdir()
for item in keep:
    src = pkg / item
    if src.is_dir():
        shutil.copytree(src, target / item)
    elif src.exists():
        shutil.copy2(src, target / item)

dev = pd.read_csv(data)
for n, name in [(500, "sample_features.csv"), (20000, "big_features.csv")]:
    rows = dev.sample(n, random_state=7, replace=n > len(dev)).drop(columns=["readmitted"])
    rows.to_csv(work / name, index=False)

for name in ["sample_features.csv", "big_features.csv"]:
    t = time.time()
    r = subprocess.run([sys.executable, "-I", "predict.py", "--input", str(work / name),
                        "--output", str(work / ("preds_" + name))],
                       cwd=target, capture_output=True, text=True)
    took = time.time() - t
    print(name, "exit code", r.returncode, f"{took:.1f}s")
    if r.returncode:
        print(r.stderr)
        sys.exit(1)
    inp = pd.read_csv(work / name)
    out = pd.read_csv(work / ("preds_" + name))
    assert list(out.columns) == ["encounter_id", "prob_early_readmit"], out.columns
    assert len(out) == len(inp) and (out["encounter_id"].values == inp["encounter_id"].values).all()
    p = out["prob_early_readmit"].to_numpy()
    assert np.isfinite(p).all() and (p >= 0).all() and (p <= 1).all()
    print(f"  {len(out)} rows, same order, probabilities in [{p.min():.3f}, {p.max():.3f}], no NaN")

# Run from a different working directory too (relative model path must still work)
other = work / "other_cwd"
other.mkdir()
r = subprocess.run([sys.executable, "-I", str(target / "predict.py"), "--input", str(work / "sample_features.csv"),
                    "--output", str(other / "preds.csv")], cwd=other, capture_output=True, text=True)
print("run from another folder: exit code", r.returncode, r.stderr[-300:])
a = pd.read_csv(work / "preds_sample_features.csv")["prob_early_readmit"]
b = pd.read_csv(other / "preds.csv")["prob_early_readmit"]
print("deterministic (same numbers twice):", np.array_equal(a.values, b.values))
