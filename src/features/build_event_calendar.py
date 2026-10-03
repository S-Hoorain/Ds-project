"""Build the Ramadan / Eid calendar used for calendar-event features (H1).

No ready-made dataset of Pakistan's religious-festival dates exists, so we build one.

* date_umm_al_qura: computed from the Umm al-Qura calendar (the `hijridate` package).
  Fully reproducible, but it is the Saudi astronomical calendar.
* date_pakistan: Pakistan announces dates through local moon sighting (Ruet-e-Hilal
  Committee), often one day after Umm al-Qura. Where we know the Pakistani date it
  comes from data/external/islamic_events_pk_overrides.csv, with a `verified` flag;
  otherwise it falls back to the Umm al-Qura date.

For weekly features the one-day difference only matters when an event falls on the
day a SPI week ends. Even so, the dates should be verified before final modelling
(see the overrides file).

Run:  python src/features/build_event_calendar.py
Output: data/external/islamic_events.csv
"""

from pathlib import Path

import pandas as pd
from hijridate import Hijri

ROOT = Path(__file__).resolve().parents[2]
OVERRIDES = ROOT / "data" / "external" / "islamic_events_pk_overrides.csv"
OUT = ROOT / "data" / "external" / "islamic_events.csv"
HIJRI_YEARS = range(1439, 1449)  # covers May 2018 to 2027

# (event, Hijri month, Hijri day, length in days used for "in this week" features)
EVENTS = [
    ("ramadan_start", 9, 1, 30),  # whole fasting month
    ("eid_ul_fitr", 10, 1, 3),    # public holidays are typically 3 days
    ("eid_ul_adha", 12, 10, 3),
]


def main():
    rows = []
    for hy in HIJRI_YEARS:
        for event, month, day, length in EVENTS:
            g = Hijri(hy, month, day).to_gregorian()
            rows.append({"event": event, "hijri_year": hy,
                         "date_umm_al_qura": pd.Timestamp(g.year, g.month, g.day),
                         "duration_days": length})
    cal = pd.DataFrame(rows)

    ov = pd.read_csv(OVERRIDES, parse_dates=["date_pakistan"])
    cal = cal.merge(ov, on=["event", "hijri_year"], how="left")
    cal["date_source"] = cal["date_pakistan"].notna().map(
        {True: "pakistan_override", False: "umm_al_qura_fallback"})
    cal["date_pakistan"] = cal["date_pakistan"].fillna(cal["date_umm_al_qura"])
    cal["verified"] = cal["verified"].fillna(False).astype(bool)
    cal["offset_days"] = (cal["date_pakistan"] - cal["date_umm_al_qura"]).dt.days
    # Ramadan is 29 or 30 days; end it the day before Eid-ul-Fitr (Pakistan dates).
    fitr = cal[cal.event == "eid_ul_fitr"].set_index("hijri_year")["date_pakistan"]
    is_ram = cal.event == "ramadan_start"
    cal.loc[is_ram, "duration_days"] = (
        cal.loc[is_ram, "hijri_year"].map(fitr) - cal.loc[is_ram, "date_pakistan"]).dt.days
    cal["date_end"] = cal["date_pakistan"] + pd.to_timedelta(cal["duration_days"] - 1, "D")

    cols = ["event", "hijri_year", "date_pakistan", "date_end", "duration_days",
            "date_umm_al_qura", "offset_days", "date_source", "verified", "note"]
    cal = cal[cols].sort_values("date_pakistan")
    cal.to_csv(OUT, index=False, date_format="%Y-%m-%d")
    print(cal.drop(columns="note").to_string(index=False))


if __name__ == "__main__":
    main()
