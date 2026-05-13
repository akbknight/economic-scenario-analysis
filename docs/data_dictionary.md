# Data Dictionary: Economic Scenario Analysis Dashboard

This document defines all inputs, outputs, and data structures used in the dashboard.

---

## 1. Slider Inputs (User-Controlled Parameters)

| Field | HTML ID | Type | Range | Step | Default | Description |
|---|---|---|---|---|---|---|
| Fed Funds Rate | `slider-fed` | `float` | 0.00 – 8.00 | 0.25 | 4.50 | Target federal funds rate set by FOMC (%). Represents the interest rate at which depository institutions trade federal funds overnight. FRED: FEDFUNDS. |
| Inflation (CPI YoY) | `slider-cpi` | `float` | 1.00 – 6.00 | 0.10 | 3.20 | Year-over-year percent change in the Consumer Price Index for All Urban Consumers (%). Seasonally adjusted. FRED: CPIAUCSL. |
| Unemployment Rate | `slider-unemp` | `float` | 3.00 – 8.00 | 0.10 | 4.10 | Civilian unemployment rate (%). Persons 16+ who are jobless, available for work, and actively seeking employment. FRED: UNRATE. |

---

## 2. Model Outputs (Projected 12-Month Forward)

| Field | Variable Name | Type | Range | Formula | Description |
|---|---|---|---|---|---|
| Projected Unemployment | `unemp_12mo` | `float` | [2.5, 12.0] | `unemp_input + (fed_rate − 2.5) × 0.15` | Projected 12-month civilian unemployment rate (%). Clamped to economically plausible range. |
| Projected CPI | `cpi_12mo` | `float` | [−1.0, 10.0] | `cpi_input × 0.70 + fed_rate × (−0.08)` | Projected 12-month CPI YoY percent change (%). Negative values indicate mild deflation. |
| Retail Sales Growth | `retail_growth` | `float` | [−8.0, 12.0] | `2.8 − (unemp_12mo − 4.0) × 0.6` | Projected advance retail sales YoY growth (%). FRED: RSAFS. |
| Recession Probability | `rec_prob` | `integer` | [1, 99] | `round(1 / (1 + exp(−z)) × 100)` where `z = −0.8×(fed_rate−5.0) + 0.4×(unemp_12mo−5.0)` | 12-month recession probability (%). Integer percent for display; underlying value is continuous [0.01, 0.99]. |

---

## 3. UI Color Thresholds

Color classes (`good` / `warn` / `bad`) are applied to projection card values to signal economic health:

| Output | Good (green) | Warn (yellow) | Bad (red) |
|---|---|---|---|
| Projected Unemployment | < 4.5% | 4.5% to < 6.0% | ≥ 6.0% |
| Projected CPI | 1.5% to ≤ 3.0% | 3.0% to ≤ 4.5% | < 1.5% or > 4.5% |
| Retail Sales Growth | ≥ 2.0% | 0.0% to < 2.0% | < 0.0% |
| Recession Probability | < 25% | 25% to < 50% | ≥ 50% |

Progress bar widths (normalized to 0-100%):
- Unemployment: `(unemp_12mo / 12) × 100`
- CPI: `(cpi_12mo / 10) × 100`
- Retail Growth: `((retail_growth + 8) / 20) × 100` (shifted to handle negative values)
- Recession Probability: `rec_prob` (already 0-100)

---

## 4. Scenario Presets

| Preset Key | Label | fed_rate (%) | cpi (%) | unemp (%) |
|---|---|---|---|---|
| `soft` | Soft Landing | 4.00 | 2.50 | 4.00 |
| `stag` | Stagflation | 6.50 | 5.50 | 5.50 |
| `rec` | Recession | 2.00 | 1.50 | 6.50 |

These parameters are passed through `runModel()` to generate the corresponding projected outputs for the comparison table. See `docs/methodology.md` for economic rationale behind each preset.

---

## 5. Historical FRED Data Array

Structure: `Array<HistoricalDataPoint>`

```
HistoricalDataPoint {
  year:        integer  — Calendar year (e.g., 2023)
  fed_rate:    float    — FEDFUNDS annual average (%)
  unrate:      float    — UNRATE annual average (%)
  cpi_yoy:     float    — CPIAUCSL YoY change annual average (%)
  retail_yoy:  float    — RSAFS YoY change annual average (%)
}
```

**Years included (selected snapshots, not every year):**
2000, 2001, 2003, 2006, 2007, 2008, 2009, 2010, 2015, 2018, 2019, 2020, 2021, 2022, 2023, 2024

Selected years represent: dot-com/9-11 cycle (2000-2001), post-recession low (2003), housing bubble peak (2006-2007), financial crisis (2008-2009), recovery (2010), rate liftoff (2015), expansion peak (2018-2019), COVID (2020), reopening surge (2021), inflation spike (2022), tightening (2023), peak rates (2024).

**Source:** Federal Reserve Bank of St. Louis (FRED), https://fred.stlouisfed.org/

**Pre-processing:** Annual averages of monthly series. CPI and RSAFS converted from index/level to year-over-year percent change before averaging. Computed by `scenario_data.py`.

---

## 6. Model Constants

| Constant | Value | Description |
|---|---|---|
| Neutral Rate | 2.5% | Approximate neutral federal funds rate proxy (r-star) |
| Unemployment OLS Slope | 0.15 | Coefficient from OLS: unrate(t+1) ~ fed_rate(t), annual 2000-2024. Raw estimate: 0.152. |
| CPI Persistence | 0.70 | Fraction of current inflation carried forward to next year |
| CPI Rate Drag | −0.08 | Reduction in projected CPI per 1pp of fed rate |
| Retail Baseline | 2.8% | Long-run average RSAFS YoY growth (excluding 2021 outlier) |
| NAIRU Proxy | 4.0% | Non-Accelerating Inflation Rate of Unemployment anchor |
| Retail Sensitivity | 0.6 | Retail growth reduction per 1pp unemployment above NAIRU |
| Recession Rate Weight | −0.8 | Logistic z-score weight on (fed_rate − 5.0) |
| Recession Unemp Weight | 0.4 | Logistic z-score weight on (unemp_12mo − 5.0) |
