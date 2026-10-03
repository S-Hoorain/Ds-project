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
```

## Layout

See `CLAUDE.md` → *Repository layout*. Current status and next steps are in `HANDOFF.md`.
Raw data is not committed. Regenerate it with the scrapers in `src/scraping/`.
