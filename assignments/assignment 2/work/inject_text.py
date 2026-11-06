"""Copy the markdown cells of a freshly built notebook into the executed notebook.

    python build_notebook.py built.ipynb
    python inject_text.py built.ipynb ../group_XX/notebook.ipynb

Only markdown cells change. Every code cell must be identical in both files (same code,
same order), otherwise nothing is written, so the outputs always belong to the code shown.
"""
import sys
import nbformat as nbf

built = nbf.read(sys.argv[1], as_version=4)
executed = nbf.read(sys.argv[2], as_version=4)
assert len(built.cells) == len(executed.cells), "different number of cells"
for i, (b, e) in enumerate(zip(built.cells, executed.cells)):
    assert b.cell_type == e.cell_type, f"cell {i}: type differs"
    if b.cell_type == "code":
        assert b.source == e.source, f"cell {i}: code differs, re-run the notebook instead"
changed = 0
for b, e in zip(built.cells, executed.cells):
    if b.cell_type == "markdown" and b.source != e.source:
        e.source = b.source
        changed += 1
left = [c.source for c in executed.cells if c.cell_type == "markdown" and c.source.strip().endswith("_MD")]
assert not left, f"placeholders left: {left}"
nbf.write(executed, sys.argv[2])
print(f"updated {changed} markdown cells, code and outputs untouched")
