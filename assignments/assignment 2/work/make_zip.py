"""Zip the submission package with exactly the required layout.

    python make_zip.py ../group_XX ../group_XX.zip

Only the required files go in: notebook.ipynb, report.pdf, model/, predict.py,
threshold.json, requirements.txt, README.md. Working files (the data copy,
figures/, tables/, __pycache__/) stay out.
"""
import sys
import zipfile
from pathlib import Path

pkg, out = Path(sys.argv[1]), Path(sys.argv[2])
required = ["notebook.ipynb", "report.pdf", "predict.py", "threshold.json", "requirements.txt", "README.md"]
missing = [f for f in required if not (pkg / f).exists()] + ([] if (pkg / "model" / "pipeline.joblib").exists() else ["model/pipeline.joblib"])
if missing:
    sys.exit(f"missing: {missing}")

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in required:
        z.write(pkg / f, f"{pkg.name}/{f}")
    for f in sorted((pkg / "model").iterdir()):
        z.write(f, f"{pkg.name}/model/{f.name}")
with zipfile.ZipFile(out) as z:
    for i in z.infolist():
        print(f"{i.file_size:>10,}  {i.filename}")
print(f"wrote {out} ({out.stat().st_size / 1e6:.2f} MB)")
