# Data Collection Audit (draft for Manuscript §II.1 / M2 Section 2.1)

*Status: working draft, 2026-10-03. Numbers marked [TBC] are filled in once the full
download and parse have run. See `HANDOFF.md` for the current state.*

## 1. Primary source: PBS weekly Sensitive Price Indicator (SPI)

**What it is.** The Pakistan Bureau of Statistics (PBS) publishes the SPI every week.
It covers 51 essential items, priced in 50 markets across 17 cities. On the current base
(2015-16 = 100) PBS reports a separate index for five consumption quintiles (Q1, monthly
expenditure up to Rs 17,732; Q5, above Rs 44,175) plus a combined index. Each weekly
report contains:

- the **quintile table**: index levels for the current week, the previous week and the
  same week a year earlier, for Q1–Q5 and Combined, with week-on-week and year-on-year
  % changes;
- the **item table**: the national average price of each of the 51 items for the same
  three weeks, % changes, and two fixed expenditure weights per item (lowest quintile
  and combined);
- a city-level annex (min/avg/max prices per city). It was not collected for M2, but the
  downloader supports it (`--kinds annex`).

**Why scraping was necessary.** PBS publishes no consolidated historical file. Each week
is a separate report, and the publication format changed several times:

| Period | Where the files are | Format |
|---|---|---|
| Sep 2019 – early 2022 | old PBS site, folder `weekly_spi_nb/` ("new base") | PDF |
| 2022 – mid 2025 | old PBS site, folder `weekly_spi/` | PDF |
| Jul 2023 – Oct 2025 | current PBS site (`pbs.gov.pk/price-statistics/`) | PDF |
| Oct 2025 – present | current PBS site | PDF + Excel |

The old PBS website has been taken down. Its files survive only in the Internet
Archive's Wayback Machine.

**Collection pipeline** (`src/scraping/`):

1. `spi_catalogue.py` builds a catalogue of every available weekly file from two sources:
   - *Current PBS site.* The price-statistics page embeds its full download table as a
     JavaScript array. We parse this array directly rather than clicking through the
     paginated table.
   - *Wayback Machine.* We query the CDX index API for every archived file under the old
     site's SPI folders (status 200 captures, one per distinct URL).

   Week dates come from the catalogue (current site) or from the filename (archive).
   Filenames use at least six date formats, and some contain typos (e.g.
   `spi_report_0204202` = 2 Apr 2020, `SPI_report_170920200` = 17 Sep 2020); the parser
   handles both. The file type (summary report vs. city annex) is inferred from the
   filename, because the current site's own labels are swapped for its 2023 entries.
   Result: 2,204 catalogued files.
2. `spi_download.py` picks one summary report per week, by priority: current-site Excel,
   then current-site PDF, then archived "new base" folder, then archived general folder.
   The downloader is:
   - **polite**: 1 s between requests to PBS, 4 s to the Wayback Machine, with
     exponential back-off on throttling, and it stops automatically if three weeks in a
     row fail (a sign of being rate-limited);
   - **resumable**: weeks already downloaded are skipped;
   - **validated**: the file signature is checked (a real PDF or XLSX, not an HTML
     error page), and every PDF is checked for the text "2015-16=100". Files on the old
     2007-08 base are rejected and the next candidate is tried.
3. Every attempt is logged to `data/raw/spi_weekly/manifest.csv`: source URL, archive
   timestamp, local path, size, SHA-256 checksum, base-year check, time of download.
   This file is committed to git, so the collection is fully auditable.

**Coverage.** 370 Thursdays fall between 5 Sep 2019 (the first published week on the
2015-16 base) and 1 Oct 2026. A summary report was found for 359 of them (97%). Several of
the 11 missing weeks are Eid weeks, when PBS did not publish (e.g. 13 May 2021,
22 Jul 2021, 29 Jun 2023, 11 Apr 2024). Because every report also states the *previous*
week's values, the quintile index for most missing weeks can be recovered from the
following week's report. [TBC: final count of downloaded / recovered weeks]

**Scope change vs. the Milestone 1 proposal.** The proposal assumed weekly 2015-16-base
data from 2016 (about 540 weeks). In fact PBS began publishing the 2015-16-base weekly SPI
in September 2019. Before that, the weekly SPI used base 2007-08, with 53 items and
different income-quintile cut-offs, so it is not comparable without splicing, which the
proposal ruled out of scope. Our sample is therefore **Sep 2019 – Oct 2026, about 370
weeks**: roughly 2,200 quintile-week rows and 18,900 item-week rows. The year-ago column
in each report could in principle extend the quintile series back to Sep 2018; this is
noted as an option, not yet used.

## 2. Parsing (`src/cleaning/parse_spi.py`)

- **Excel reports (Oct 2025 onward):** read cell values directly.
- **PDF reports:** two techniques, because the two tables are stored differently.
  - *Quintile table:* PBS stores row labels and each number column as separate text
    blocks, and rows are sometimes vertically misaligned. We collect decimal numbers
    in the table region by position, group them into columns by their right edge, and
    read each column top to bottom as Q1–Q5, Combined.
  - *Item table:* each row is one text run. Reading words in the PDF's internal text
    order keeps long item names intact. Ordinary layout extraction lets names overlap
    the next column.
- Raw item names vary slightly over time. They are mapped to 51 canonical items
  (`data/external/spi_items.csv`) by exact normalised match, then by fuzzy match with
  the score recorded. Two items were renamed by PBS: "Electricity Charges upto 50 Units"
  became "Electricity Charges for Q1", and "Gas Charges upto 3.3719 MMBTU" became
  "Gas Charges for Q1". These may also be definitional changes, so both series are
  checked for level breaks in cleaning.
- Validation: every parsed file is checked for the 2015-16 base, a complete 6-row
  quintile table, and 51 uniquely matched items; results go to
  `data/interim/spi_parse_log.csv`. On the first 69 files: 69/69 complete. [TBC: full run]

## 3. Supporting sources

| Data | Source | How collected | Notes / limitations |
|---|---|---|---|
| Ramadan / Eid dates | Umm al-Qura calendar via `hijridate`; Pakistan-specific overrides | `src/features/build_event_calendar.py` | Pakistan moon-sighting is often +1 day; overrides are **unverified** and must be checked |
| SBP policy rate decisions | SBP Monetary Policy Statements (archived PDFs, 2018 – Apr 2026) | `src/scraping/sbp_mps.py` parses date + decision | SBP site redesign removed the archive; recent decisions to be added from SBP press releases |
| PKR/USD exchange rate | Yahoo Finance `PKR=X`, daily | `src/scraping/fx_rates.py` | Market quote, not official SBP interbank rate; 2 bad-tick episodes found (1–2 Aug 2022, 19–20 Sep 2022) |
| Fuel price revisions | Derived from SPI items *Petrol Super* and *Hi-Speed Diesel* | (cleaning step) | Weekly resolution only; OGRA notifications remain a planned extension |

## 4. Item basket and weights

The 51 items were grouped into four team-defined categories (`category` in
`data/external/spi_items.csv`). Shares of the fixed 2015-16 expenditure weights:

| Category | Items | Weight, lowest quintile (%) | Weight, combined (%) |
|---|---|---|---|
| Food | 32 | 68.95 | 62.34 |
| Energy (electricity, gas, LPG, firewood, petrol, diesel) | 6 | 17.60 | 25.42 |
| Clothing & footwear | 7 | 9.19 | 8.80 |
| Household & other | 6 | 4.25 | 3.44 |

The lowest quintile's basket is more food-heavy but *less* energy-heavy than the combined
basket, mainly because petrol carries little weight for Q1. This refines the M1 claim that
Q1 is more exposed to "food and fuel": the exposure difference is in food, not fuel.
