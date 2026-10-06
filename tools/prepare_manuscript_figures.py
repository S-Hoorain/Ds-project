"""Make manuscript copies of the EDA figures: crop the caption printed under each plot and whiten the background.

The figures in reports/figures/ carry their caption inside the image (useful in the notebooks and on the poster).
In the Word manuscript the caption is set as text under the figure instead, so the printed one would appear
twice. The originals are left untouched.

Run:    python tools/prepare_manuscript_figures.py
Output: manuscript/figures/<same file name>.png
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "reports" / "figures"
OUT = ROOT / "manuscript" / "figures"
FIGURES = ["figP1_log_transform", "figE3_weekly_change_distribution", "figE1_rotating_burden",
           "figE2_shocks_vs_grind", "figE4_early_warning_signals", "figE5_fx_passthrough"]
MIN_GAP = 25  # blank pixel rows that separate the caption block from the plot


def crop_caption(im):
    bg = im[2, 2].copy()                                   # figure background colour (top-left corner)
    ink = (np.abs(im - bg).sum(axis=2) > 60).any(axis=1)  # rows that contain any text or lines
    # Walk up from the last inked row (the caption's last line) until a blank band of MIN_GAP rows:
    # that band separates the caption from the axes.
    r, gap = np.where(ink)[0][-1], 0
    while r > 0:
        gap = 0 if ink[r] else gap + 1
        if gap >= MIN_GAP:
            break
        r -= 1
    out = im[: r + gap // 2] if r > 0 else im.copy()
    out[np.abs(out - bg).sum(axis=2) <= 6] = 255           # off-white background -> white page
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name in FIGURES:
        im = np.array(Image.open(SRC / f"{name}.png").convert("RGB")).astype(int)
        out = crop_caption(im)
        Image.fromarray(out.astype("uint8")).save(OUT / f"{name}.png", dpi=(300, 300))
        print(f"{name}: {im.shape[0]} -> {out.shape[0]} px high")


if __name__ == "__main__":
    main()
