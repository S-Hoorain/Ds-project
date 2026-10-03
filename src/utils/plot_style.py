"""Shared figure style for all notebooks, so every figure in the manuscript looks consistent.

Colours come from a colour-blind-validated categorical palette, used in a FIXED order so a
group keeps its colour in every figure. Grid and axes are deliberately quiet so the data
stands out. Text is always dark ink, never the series colour.

Usage:
    from utils.plot_style import apply_style, GROUP_COLORS, SERIES, INK
    apply_style()
"""

import matplotlib as mpl

SURFACE = "#fcfcfb"
INK = "#0b0b0b"          # titles, values
INK_SECONDARY = "#52514e"  # axis labels, captions, ticks
GRID = "#e4e3df"

# Categorical slots in fixed order (validated for colour-vision deficiency on adjacent pairs).
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]

# Each quintile group always gets the same colour. Q1 (the poorest) and Q5 (the richest)
# take the two most distinct slots, because most figures compare them.
GROUP_COLORS = {
    "Q1": SERIES[1],        # orange
    "Q2": SERIES[3],        # yellow
    "Q3": SERIES[2],        # aqua
    "Q4": SERIES[4],        # magenta
    "Q5": SERIES[0],        # blue
    "Combined": "#52514e",  # neutral grey: the national average, not a quintile
}

CATEGORY_COLORS = {
    "food": SERIES[0],
    "energy": SERIES[1],
    "clothing_footwear": SERIES[2],
    "household": SERIES[3],
}


def apply_style():
    mpl.rcParams.update({
        "figure.facecolor": SURFACE,
        "axes.facecolor": SURFACE,
        "savefig.facecolor": SURFACE,
        "figure.dpi": 110,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
        "font.size": 10,
        "axes.titlesize": 12,
        "axes.titleweight": "semibold",
        "axes.titlecolor": INK,
        "axes.titlelocation": "left",
        "axes.labelcolor": INK_SECONDARY,
        "axes.labelsize": 10,
        "axes.edgecolor": GRID,
        "axes.linewidth": 0.8,
        "axes.spines.top": False,
        "axes.spines.right": False,
        "axes.grid": True,
        "axes.axisbelow": True,
        "grid.color": GRID,
        "grid.linewidth": 0.6,
        "xtick.color": INK_SECONDARY,
        "ytick.color": INK_SECONDARY,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.frameon": False,
        "legend.fontsize": 9,
        "lines.linewidth": 2.0,
        "patch.linewidth": 0,
    })
