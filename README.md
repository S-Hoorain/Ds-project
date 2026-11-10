# Predicting Essential-Price Shocks Across Income Quintiles in Pakistan

CS/SDP 312/314: Data Science for Social Good, team project.
Team: Syeda Hoorain Imran, Muhammad Munib Sattar, Sarah Khalid.

We use the Pakistan Bureau of Statistics' weekly Sensitive Price Indicator (SPI, base 2015-16)
to test whether next week's price movements in essential items can be forecast, and whether
low-income households (Q1) face both higher inflation and less predictable price shocks than
high-income households (Q5). The project addresses SDGs 1, 2, and 10.

## Setup

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python -m ipykernel install --user --name ds4sg --display-name "DS4SG (.venv)"   # notebook kernel
```

## Reference

See DS4SG_Script_and_Data_Reference.docx for explanations for each script and data file.
DS4SG_M3_Reference.docx and DS4SG_M4_Reference.docx describe the Milestone 3 and 4 files and concepts, and
DS4SG_Viva_Guide_M2_M4.docx prepares the viva for Milestones 2 to 4 (every decision, the alternatives checked, key
numbers and likely questions).

Milestone 4 (advanced models, fairness audit and ethics): run notebooks/05_advanced_models.ipynb (about 20 minutes)
and then notebooks/06_fairness_audit.ipynb (about 3 minutes); both use src/models/advanced.py.
