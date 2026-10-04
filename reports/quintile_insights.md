# Quintile insights: evidence for choosing the project narrative

*2026-10-04. All numbers come from `src/analysis/quintile_insights.py`; the tables are in `reports/tables/insights_*.csv`.
Sample: 370 weeks, 5 Sep 2019 – 1 Oct 2026, SPI base 2015-16. Q1 = poorest consumption quintile, Q5 = richest.*

**Two data limits apply throughout.**
- PBS publishes item weights and item impacts (contributions) only for the **lowest quintile (Q1) and Combined**. Statements
  about Q2–Q5 baskets therefore come from regression estimates (§3).
- The "Electricity for Q1" and "Gas for Q1" items are the tariffs of the **lowest consumption slabs**. The tariffs used
  for Q2–Q5 are not published.

---

## 1. The poorest did not face the most inflation overall, but the burden rotates

| Sep 2019 → Oct 2026 | Q1 | Q2 | Q3 | Q4 | Q5 | Combined |
|---|---|---|---|---|---|---|
| Cumulative inflation | **179%** | 192% | **202%** | 198% | 193% | 198% |
| Peak y/y inflation | 44.5% | 47.9% | 48.4% | 48.2% | 49.7% | 48.4% |

| Period (cumulative) | Q1 | Q5 | Who was hit harder |
|---|---|---|---|
| 2019–21 (food, COVID) | **38.8%** | 33.9% | **Q1** |
| 2022–23 (energy, fuel, rupee crash) | 74.0% | **83.1%** | Q5 (and Q3, at 91.5%) |
| 2024–26 (slowdown) | 15.0% | **18.2%** | Q5 |

- There are two long regimes in the y/y gap:
  - **Mar 2020 – Nov 2021 (86 weeks), Q1 > Q5.** Q1's prices rose about 7% *relative to* Q5's.
  - **Feb 2022 – Dec 2024, Q5 > Q1**, almost continuously.
- By fiscal year, Q1 had the highest inflation in FY21 (13.8% vs Q5 10.0%) and the lowest from FY23 to FY26.
- The **middle quintile (Q3)** ends with the highest cumulative inflation (202%).

## 2. Two kinds of inflation: tariff and food *shocks* vs the staple-food *grind*

Item impacts (PBS's own contribution of each item to the weekly change), Q1 vs Combined:

| Component | Q1 basket weight | Q1 cumulative contribution | Q1 share of **weekly variance** | Combined share of weekly variance |
|---|---|---|---|---|
| Utility tariffs (electricity, gas) | 10% | 21.6 pp | **61%** | 65% |
| Motor fuel (petrol, diesel) | 1.5% | 2.2 pp | 1% | 9% |
| Market energy (LPG, firewood) | 5.7% | 4.1 pp | 1% | 2% |
| Perishable food | 11.9% | 9.7 pp | **28%** | 17% |
| Staple and processed food | **57%** | **53.0 pp** | 8% | 6% |
| Non-food | 13.4% | 12.7 pp | 2% | 2% |

- **Staple food** (flour, ghee, rice, sugar, pulses, milk) delivers about **half of all inflation** but almost none of the
  week-to-week movement. It is a slow, persistent grind.
- **Weekly shocks** come from government-set **utility tariffs** and **perishables**. In the 19 biggest-move weeks, utilities
  dominated 11 of them, for Q1 and for Combined alike.
- The single largest contributor to Q1's inflation is the **gas tariff for Q1** (13.5 pp). It stayed flat at Rs 141.6 until
  2023, then rose to Rs 295, Rs 1,976.5 (late 2023) and Rs 2,566.5 (2025).
- The **electricity tariff for Q1** cut both ways:
  - FY20–21: +5.7 pp for Q1 vs +1.9 pp for Combined, as the lowest-slab tariff rose from Rs 3.7 to Rs 6.3 per unit.
  - FY23–24: +0.8 pp for Q1 vs +6.4 pp for Combined.
  - It dropped to Rs 3.5 in Sep 2022, consistent with relief for low-consumption users.
- **Petrol** added 2.2 pp to Q1 but 10.7 pp to Combined.
- Items that weigh more on Q1 over the whole period: cooking fat (ghee), wheat flour, firewood, rice, onions.

## 3. A clear exposure gradient across all five quintiles

This regression of each quintile's weekly change on component price changes explains about 80% of the weekly movement.
Each value is the % of a 1% component price rise that shows up in that group's index.

| | Utilities | Motor fuel | Market energy | Perishables | Staples | Non-food | R² |
|---|---|---|---|---|---|---|---|
| Q1 | 10.2 | **2.7** | 2.4 | **12.4** | 45.1 | 11.1 | 0.80 |
| Q2 | **13.2** | 4.2 | 2.8 | 12.3 | 41.0 | 8.5 | 0.81 |
| Q3 | 11.3 | 5.0 | 3.2 | 11.2 | **47.7** | 6.0 | 0.79 |
| Q4 | 9.0 | 6.7 | 3.6 | 11.2 | 46.1 | 8.2 | 0.78 |
| Q5 | **6.9** | **10.7** | 6.4 | 9.5 | **33.3** | 16.5 | 0.76 |

Exposure to motor fuel rises steadily with income. Exposure to perishables falls with income. Exposure to utility tariffs peaks
at Q2. Staples are heavy for Q1–Q4 but much lighter for Q5. Q3's combination of high staples and high utilities fits its highest
cumulative inflation.

## 4. Volatility and predictability

| | Q1 | Q2 | Q3 | Q4 | Q5 | Combined |
|---|---|---|---|---|---|---|
| SD of weekly change (pp) | 1.08 | **1.28** | 1.15 | 1.02 | **0.96** | 1.09 |
| Lag-1 autocorrelation | 0.15 | 0.11 | 0.13 | 0.16 | **0.19** | 0.15 |
| AR(1) error, train ≤ 2024 (MAE, pp) | 0.71 | **0.77** | 0.70 | 0.66 | **0.64** | 0.69 |
| AR(1) error, test 2025–26 | 0.57 | 0.61 | 0.53 | 0.52 | 0.55 | 0.56 |
| "No change" forecast error, test | 0.54 | 0.56 | 0.49 | 0.49 | 0.53 | 0.53 |

- Weekly changes **barely predict themselves**. An AR(1) model, which predicts this week from last week's change, does no
  better than forecasting "no change". A useful model needs **outside information**.
- In the training years, **Q1 is about 12% harder to forecast than Q5**, but **Q2 is the most volatile and hardest group**,
  so the pattern isn't monotonic. Volatility was highest for Q1 in 2019–21 and for Q2–Q3 in 2022–23.

## 5. Calendar effects are item-specific, not index-wide

- **Ramadan:** no index-wide run-up. In the 4 weeks before Ramadan, weekly change is *lower* than usual (Q1 0.14% vs 0.30%,
  Mann-Whitney p = 0.21). The effect shows up in specific items: bananas (+5.4 pp per week vs other weeks) and potatoes.
- **Eid ul-Adha:** a clear run-up in the 4 weeks before (about 0.65–0.72% per week vs about 0.25%), led by tomatoes
  (+7 pp per week) and onions (+3 pp). In the 4 weeks after, Q1 still rises faster than Q5 (0.42% vs 0.28%).
  **Confound:** in 2022–25, Eid ul-Adha fell in June or July, at the start of the fiscal year, when new budget, tax and
  fuel-levy changes take effect. Petrol and diesel also jump in those weeks.
- There are only about 7 events of each type in the sample, so the statistical power is low.

## 6. Exchange-rate pass-through is larger and faster for the rich

Cumulative SPI change per 1% weekly rupee depreciation:

| Horizon | Q1 | Q3 | Q5 | Combined |
|---|---|---|---|---|
| 4 weeks | 0.10 | 0.17 | **0.34** | 0.22 |
| 13 weeks | 0.51 | 0.52 | **0.68** | 0.57 |

## 7. Price spikes: transitory for tomatoes, early warnings for onions, potatoes and pulses

Median price change in the 8 weeks **after** a >5% weekly spike:
- **Reverses:** tomatoes (−4.5% after a typical +15.7% spike).
- **Permanent step:** wheat flour, sugar, electricity, footwear (about 0%).
- **Keeps rising** (momentum): onions +14.7%, potatoes +16.3%, chilies +12.6%, tea +12.0%, pulse gram +10.8%,
  bananas +9.7%.

So a spike in these staples and perishables usually **starts** a sustained rise; it isn't a one-week blip.

---

## Candidate narratives

### A. "Who pays depends on what drives it": the rotating burden of inflation
*Distributional, explanatory.* The inflation gap between rich and poor is not fixed; it depends on the **source** of the shock.
- Food-driven episodes (2020–21) hit Q1 hardest.
- Energy, fuel and currency episodes (2022–24) hit upper quintiles harder, because of their fuel exposure and larger
  exchange-rate pass-through.
- Tariff design (protected low slabs) shielded Q1 at some times (FY23–24) but not others (FY21 electricity, 2023–25 gas).

**Policy message:** relief should be shock-specific. BISP top-ups respond to food shocks; tariff protection matters for
energy shocks.

Possible hypotheses:
- (H1) the Q1–Q5 gap is explained by food vs energy contributions;
- (H2) exchange-rate pass-through is larger for Q5;
- (H3) the gradient of fuel and food exposure is monotonic in income;
- (H4) forecastability differs across quintiles.

**Strength:** the clearest, most surprising finding (Q1 had the *lowest* cumulative inflation). It is very SDG-10.
**Weakness:** mostly explanatory. The ML forecasting part has to be added on (as H4).

### B. "Shocks vs the grind": two inflations facing the poor
*Structural.* Most of Q1's inflation is a steady **staple-food grind** (57% of the basket, about half of all inflation),
while its weekly **shocks** come from government-set **utility tariffs** (61% of weekly variance) and perishables.
- The shocks are largely **policy decisions**, with known timing.
- The grind erodes purchasing power quietly.

**Policy message:** two instruments for two problems.
- Index cash transfers to the staple-food grind.
- Schedule or pre-announce relief around tariff decisions.

Possible hypotheses:
- (H1) administered-price events explain most large weekly moves;
- (H2) staple inflation is persistent (high long-horizon autocorrelation) while shocks are not;
- (H3) Q1's variance share from perishables exceeds Combined's.

**Strength:** novel framing, and strong numbers. **Weakness:** relies on Q1-vs-Combined impacts, because Q5's breakdown is
not published.

### C. "An early-warning system for the poor": predicting price shocks by quintile
*Predictive, ML-centred.* Weekly inflation can't be forecast from its own past. But **shock weeks** can be anticipated
from outside signals:
- the administered-price calendar (fortnightly fuel reviews, the fiscal-year start, tariff notifications);
- **momentum** after onion, potato and pulse spikes (+10–16% within 8 weeks);
- exchange-rate moves, which pass through over 8–13 weeks;
- the Eid ul-Adha run-up.

The target could be "shock next week/month" (classification) or the 4-week-ahead change, for each quintile. Then ask: **is
the model as accurate for the poor as for the rich?** That question is the fairness analysis.

**Policy message:** time BISP top-ups and utility-store interventions *before* shocks hit.

Possible hypotheses:
- (H1) outside signals beat the "no change" and AR baselines;
- (H2) perishable-spike momentum predicts 8-week staple inflation;
- (H3) exchange-rate depreciation predicts inflation 8–13 weeks ahead, more strongly for Q5;
- (H4) forecast error for Q1 exceeds Q5 (fairness).

**Strength:** fits the remaining milestones best: M3 baseline model, **M4 fairness** (error disparity across quintiles),
M5 new data and re-training. **Weakness:** predictive performance is uncertain until M3, so a modest result must be
framed honestly.

### Recommended: C as the spine, with A as the distributional lens
Make the paper **predictive** (C), because the course is built around models, fairness and re-training. Use A's findings
to motivate *why* forecasting must be quintile-specific: the burden rotates, exposures differ, and pass-through differs.
B's shock-vs-grind decomposition becomes a key EDA result that shapes the features (administered-price calendar,
perishable momentum).
