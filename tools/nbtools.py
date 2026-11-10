"""Small helpers to assemble notebooks from text and code cells (used by the notebook builders)."""

import nbformat as nbf

KERNEL = {"display_name": "DS4SG (.venv)", "language": "python", "name": "ds4sg"}


class Notebook:
    def __init__(self):
        self.cells = []

    def md(self, text):
        self.cells.append(nbf.v4.new_markdown_cell(text.strip("\n")))

    def code(self, src):
        self.cells.append(nbf.v4.new_code_cell(src.strip("\n")))

    def save(self, path):
        nb = nbf.v4.new_notebook()
        nb["cells"] = self.cells
        nb["metadata"] = {"kernelspec": KERNEL,
                          "language_info": {"name": "python", "version": "3.13.3"}}
        nbf.write(nb, str(path))
