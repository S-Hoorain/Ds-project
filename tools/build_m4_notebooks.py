"""Assembles notebooks/05_advanced_models.ipynb and notebooks/06_fairness_audit.ipynb from the code in
tools/nb05_code.py and tools/nb06_code.py and the text in tools/nb_text_m4.py.

    python tools/build_m4_notebooks.py            # write both notebooks (no outputs)
    jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=3600 notebooks/05_advanced_models.ipynb
    jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=3600 notebooks/06_fairness_audit.ipynb
    python tools/build_m4_notebooks.py text       # refresh only the text cells of the executed notebooks

The text cells quote numbers from the executed notebooks (run of 2026-11-10). The "text" mode checks that every
code cell is unchanged, so outputs always belong to the code shown above them.
"""

import sys
from pathlib import Path

import nbformat

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from nbtools import Notebook
import nb05_code as C5
import nb06_code as C6
from nb_text_m4 import T5, T6
import nb_text_m4_results  # noqa: F401  (fills the interpretation cells)

NB05 = ROOT / "notebooks" / "05_advanced_models.ipynb"
NB06 = ROOT / "notebooks" / "06_fairness_audit.ipynb"


def build05():
    nb = Notebook()
    nb.md(T5["intro"]); nb.code(C5.SETUP)
    nb.md(T5["data"]); nb.code(C5.DATA)
    nb.md(T5["new_features"]); nb.code(C5.NEW_FEATURE_EVIDENCE); nb.code(C5.FIG_A1); nb.md(T5["new_features_read"])
    nb.md(T5["validation"]); nb.code(C5.FOLDS); nb.md(T5["leakage"])
    nb.md(T5["models"]); nb.code(C5.GRIDS)
    nb.md(T5["tuning"]); nb.code(C5.TUNE); nb.code(C5.CV_SUMMARY); nb.code(C5.FIG_A2); nb.md(T5["tuning_read"])
    nb.md(T5["compare"]); nb.code(C5.M3_LOAD); nb.code(C5.COMPARE); nb.code(C5.BOOT); nb.code(C5.FIG_A3)
    nb.md(T5["compare_read"])
    nb.md(T5["ablation"]); nb.code(C5.ABLATION); nb.md(T5["ablation_read"])
    nb.md(T5["leak_check"]); nb.code(C5.LEAKAGE); nb.md(T5["leak_read"])
    nb.md(T5["thresholds"]); nb.code(C5.THRESHOLD_CURVES); nb.code(C5.COST_RATIOS); nb.md(T5["thresholds_read"])
    nb.md(T5["calibration"]); nb.code(C5.CALIBRATION); nb.md(T5["calibration_read"])
    nb.md(T5["h4"]); nb.code(C5.H4_TEST); nb.code(C5.H4_OOS); nb.md(T5["h4_read"])
    nb.md(T5["importance"]); nb.code(C5.IMPORTANCE); nb.code(C5.FIG_A6); nb.md(T5["importance_read"])
    nb.md(T5["save"]); nb.code(C5.SAVE)
    nb.md(T5["summary"])
    return nb


def build06():
    nb = Notebook()
    nb.md(T6["intro"]); nb.code(C6.SETUP); nb.code(C6.LOAD)
    nb.md(T6["attribute"]); nb.code(C6.BASE_RATES); nb.md(T6["attribute_read"])
    nb.md(T6["metrics"]); nb.code(C6.AUDIT_ALL)
    nb.md(T6["final_detail"]); nb.code(C6.AUDIT_FINAL); nb.code(C6.BOOT_FAIR); nb.code(C6.FIG_F1); nb.md(T6["audit_read"])
    nb.md(T6["h5"]); nb.code(C6.H5); nb.md(T6["h5_read"])
    nb.md(T6["drivers"]); nb.code(C6.DRIVERS); nb.md(T6["drivers_read"])
    nb.md(T6["mitigation"]); nb.code(C6.MITIGATION); nb.code(C6.POLICY_TABLE); nb.md(T6["mitigation_read"])
    nb.md(T6["pareto"]); nb.code(C6.FIG_F2); nb.md(T6["pareto_read"])
    nb.md(T6["asym"]); nb.code(C6.ASYM); nb.code(C6.FIG_F3); nb.md(T6["asym_read"])
    nb.md(T6["recommendation"]); nb.md(T6["faten"]); nb.md(T6["living_lab"]); nb.md(T6["summary"])
    return nb


def refresh_text(new, path):
    """Copy the text cells of a freshly built notebook into the executed one, keeping code and outputs."""
    old = nbformat.read(str(path), as_version=4)
    assert len(old.cells) == len(new.cells), f"{path.name}: cell count changed, re-execute instead"
    for o, n in zip(old.cells, new.cells):
        assert o.cell_type == n.cell_type, f"{path.name}: cell types changed, re-execute instead"
        if o.cell_type == "code":
            assert o.source == n.source, f"{path.name}: a code cell changed, re-execute instead"
        else:
            o.source = n.source
    nbformat.write(old, str(path))


if __name__ == "__main__":
    targets = [(build05, NB05), (build06, NB06)]
    if len(sys.argv) > 1 and sys.argv[1] == "text":
        for f, p in targets:
            if p.exists():
                refresh_text(f(), p)
                print("text refreshed:", p.name)
    else:
        only = sys.argv[1] if len(sys.argv) > 1 else None
        for f, p in targets:
            if only and only not in p.name:
                continue
            f().save(p)
            print("written:", p.name)
