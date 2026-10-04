# Feature dictionary: master_features.csv (columns added to master_model_ready.csv)

Built by `src/features/build_features.py`. Momentum items chosen on weeks up to 2024-12-31: {'bananas': np.float64(10.1), 'chilies_powder': np.float64(15.4), 'onions': np.float64(12.3), 'potatoes': np.float64(16.3), 'pulse_gram': np.float64(10.8), 'pulse_moong': np.float64(5.7), 'tea_packet': np.float64(12.0)} (median % rise over 8 weeks after a spike).

| Column | % missing | Description |
|---|---|---|
| `fuel_review_next_week` | 0.0 | 1 if next SPI week contains the 1st or 16th (scheduled fortnightly fuel-price review) |
| `fy_start_next_week` | 0.0 | 1 if next SPI week contains 1 July (fiscal-year start: budget, taxes, fuel levy) |
| `pre_eid_adha_4w` | 0.0 | 1 if Eid ul-Adha falls within the next 4 weeks |
| `ramadan_next_week` | 0.0 | 1 if next SPI week includes Ramadan days |
| `fx_chg_4w` | 1.1 | % change (log) in weekly average PKR/USD over the past 4 weeks |
| `fx_chg_8w` | 2.2 | % change (log) in weekly average PKR/USD over the past 8 weeks |
| `fx_chg_13w` | 3.5 | % change (log) in weekly average PKR/USD over the past 13 weeks |
| `infl_market_energy_wow` | 0.0 | Combined-weighted average weekly % price change of market_energy items this week |
| `infl_motor_fuel_wow` | 0.0 | Combined-weighted average weekly % price change of motor_fuel items this week |
| `infl_nonfood_wow` | 0.0 | Combined-weighted average weekly % price change of nonfood items this week |
| `infl_perishables_wow` | 0.0 | Combined-weighted average weekly % price change of perishables items this week |
| `infl_staples_wow` | 0.0 | Combined-weighted average weekly % price change of staples items this week |
| `infl_utilities_wow` | 0.0 | Combined-weighted average weekly % price change of utilities items this week |
| `infl_food_wow` | 0.0 | Combined-weighted average weekly % price change of food items this week |
| `infl_energy_wow` | 0.0 | Combined-weighted average weekly % price change of energy items this week |
| `infl_market_energy_4w` | 0.8 | Sum of the last 4 weekly values of infl_market_energy_wow |
| `infl_motor_fuel_4w` | 0.8 | Sum of the last 4 weekly values of infl_motor_fuel_wow |
| `infl_nonfood_4w` | 0.8 | Sum of the last 4 weekly values of infl_nonfood_wow |
| `infl_perishables_4w` | 0.8 | Sum of the last 4 weekly values of infl_perishables_wow |
| `infl_staples_4w` | 0.8 | Sum of the last 4 weekly values of infl_staples_wow |
| `infl_utilities_4w` | 0.8 | Sum of the last 4 weekly values of infl_utilities_wow |
| `infl_food_4w` | 0.8 | Sum of the last 4 weekly values of infl_food_wow |
| `infl_energy_4w` | 0.8 | Sum of the last 4 weekly values of infl_energy_wow |
| `momentum_spikes_4w` | 0.8 | Number of >5% weekly spikes in momentum items over the past 4 weeks (bananas, chilies_powder, onions, potatoes, pulse_gram, pulse_moong, tea_packet) |
| `momentum_basket_chg_4w` | 1.1 | Combined-weighted % price change of the momentum items over the past 4 weeks |
| `gap_q1_q5_wow` | 0.3 | Q1 weekly % change minus Q5 weekly % change (same for all rows of a week) |
| `shock_now` | 0.3 | 1 if this week's SPI rose by >= 1% (shock week) |
| `target_shock_next` | 0.3 | TARGET (classification): 1 if NEXT week's SPI rises by >= 1% for this group |
| `shocks_last_4w` | 1.1 | Number of shock weeks for this group in the past 4 weeks |
| `spi_chg_4w` | 1.1 | % change (log) in this group's SPI over the past 4 weeks |
| `spi_chg_13w` | 3.5 | % change (log) in this group's SPI over the past 13 weeks |
| `target_spi_chg_next4w` | 1.1 | TARGET (pass-through): % change (log) in SPI over the next 4 weeks |
| `target_spi_chg_next8w` | 2.2 | TARGET (pass-through): % change (log) in SPI over the next 8 weeks |
| `target_spi_chg_next13w` | 3.5 | TARGET (pass-through): % change (log) in SPI over the next 13 weeks |
| `policy_rate_chg_13w` | 3.5 | Change in the SBP policy rate over the past 13 weeks (percentage points) |
