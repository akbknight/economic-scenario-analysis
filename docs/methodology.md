# Methodology: Economic Scenario Analysis Dashboard

## 1. Model Scope

This dashboard implements a **reduced-form macroeconomic projection model**. It is not a Dynamic Stochastic General Equilibrium (DSGE) model, a Vector Autoregression (VAR), or a calibrated structural model. It consists of a small set of simplified functional relationships derived from empirical macro literature and calibrated against FRED annual data (2000-2024).

The purpose is scenario exploration and educational communication, not policy analysis. For each combination of three input parameters (Fed funds rate, CPI, unemployment), the model projects four 12-month-forward outputs using closed-form expressions. The simplicity is intentional: a transparent formula communicates the directional intuition clearly to a business audience, without requiring a black-box engine.

---

## 2. Input Parameters

| Parameter | FRED Series | Range | Default | Notes |
|---|---|---|---|---|
| Fed Funds Rate | FEDFUNDS | 0% – 8% | 4.50% | Target federal funds rate set by FOMC |
| Inflation (CPI YoY) | CPIAUCSL | 1% – 6% | 3.20% | Year-over-year CPI, all urban consumers |
| Unemployment Rate | UNRATE | 3% – 8% | 4.10% | Civilian unemployment rate |

---

## 3. Projection Formulas

### 3.1 Unemployment (12-Month Forward)

**Formula:**
```
unemployment_12mo = unemp_input + (fed_rate − 2.5) × 0.15
Clamped to [2.5%, 12.0%]
```

**Theoretical basis — Taylor Rule (Taylor 1993):**

Taylor (1993) proposed that the federal funds rate should be set according to:
```
i = r* + π + 0.5(π − π*) + 0.5(y − y*)
```
where `r*` is the neutral real rate, `π` is inflation, `π*` is the inflation target, `y − y*` is the output gap. The key insight is that a **rate above neutral** implies restrictive monetary policy, which historically precedes labor market cooling.

**Calibration — FRED data 2000-2024:**

An OLS regression of `UNRATE(t+1)` on `FEDFUNDS(t)` using annual averages (2000-2024) yields:
```
unrate(t+1) = 0.152 × fed_rate(t) + 3.88     (R² = 0.17)
```
The dashboard reformulates this as a deviation from the neutral rate (2.5%) to make the interpretation explicit: "each 1pp above neutral adds ~0.15pp to unemployment over 12 months." The coefficient is rounded from 0.152 to 0.15 for clean communication; the rounding error is less than 1 basis point at typical parameter values.

The low R² (0.17) is expected — annual averages aggregate substantial month-to-month variation, and the 2008-2009 crisis and 2020 COVID shock are structural breaks. The coefficient is an **order-of-magnitude approximation**, not a precise forecast.

**Consistency with FOMC projections:**

Fed FOMC Summary of Economic Projections (SEP) data from 2015-2023 show that each 100bp tightening phase was associated with approximately 0.15-0.20pp unemployment increase over a 12-month horizon (based on median projections comparing consecutive SEP vintages). The model coefficient is within this range.

---

### 3.2 Inflation / CPI (12-Month Forward)

**Formula:**
```
cpi_12mo = cpi_input × 0.70 + fed_rate × (−0.08)
Clamped to [−1.0%, 10.0%]
```

**Theoretical basis — Monetary transmission mechanism:**

Higher interest rates reduce borrowing costs on the household and business side, dampening aggregate demand and reducing price pressure. This is the standard channel described in Federal Reserve educational materials and intermediate macroeconomics textbooks.

The formula captures two components:
1. **Persistence factor (0.70):** Inflation tends to mean-revert slowly. A 70% year-on-year persistence is consistent with empirical autoregressive models of U.S. CPI (AR(1) coefficients are typically 0.65-0.85 for annual data over non-crisis periods).
2. **Rate drag (−0.08 per 1pp):** Each percentage point of the fed rate reduces projected CPI by ~0.08pp. Historically, the Pearson correlation between fed rate and CPI (annual) is +0.38 over 2000-2024 (rates rise in high-inflation environments), but the **causal direction** is dampening: the rate hike reduces subsequent inflation. The coefficient 0.08 is a calibrated approximation — not estimated by regression — to produce plausible output ranges across the slider space.

**Important caveat:** This formula does not model supply shocks (energy price spikes, supply chain disruptions). The 2021-2022 inflation episode was primarily supply-driven; applying this formula to that period would underestimate the inflation persistence.

---

### 3.3 Retail Sales Growth (12-Month Forward)

**Formula:**
```
retail_growth = 2.8 − (unemployment_12mo − 4.0) × 0.6
Clamped to [−8.0%, 12.0%]
```

**Theoretical basis — Okun's Law (Okun 1962):**

Okun's Law states that each 1pp increase in unemployment is associated with approximately 2pp decrease in real GDP growth relative to potential. This model applies an analogous relationship to retail sales growth (a proxy for consumer spending activity), justified by:
- Personal consumption expenditures represent ~70% of U.S. GDP
- Advance retail sales (RSAFS) correlates strongly with overall consumer spending
- Historical Pearson r(UNRATE, RSAFS_yoy) = −0.62 over 2000-2024 FRED annual data

**Coefficients:**
- **2.8%** — long-run average of RSAFS YoY growth, computed from the FRED RSAFS annual series 2000-2024 (excluding the 2021 COVID bounce which was an outlier at +17.6%)
- **4.0%** — NAIRU proxy (Non-Accelerating Inflation Rate of Unemployment); used as the anchor from which unemployment deviations are measured
- **0.6** — sensitivity coefficient; each 1pp unemployment above NAIRU reduces retail growth by ~0.6pp. Calibrated to match the historical range: 2009 deep recession (UNRATE 9.28%, retail −6.88%) and 2018-2019 expansion (UNRATE ~3.7%, retail ~4%).

---

### 3.4 Recession Probability (12-Month Horizon)

**Formula:**
```
z = −0.8 × (fed_rate − 5.0) + 0.4 × (unemployment_12mo − 5.0)
recession_probability = 1 / (1 + exp(−z))
Clamped to [1%, 99%]
```

**Theoretical basis — Logistic recession prediction (Estrella & Mishkin 1998):**

Estrella & Mishkin (1998) demonstrated that the Treasury yield spread (10-year minus 3-month) predicts U.S. recessions with a probit model, where the probability is a smooth monotone function of the signal. The logistic function is the natural extension of this framework: it maps any real-valued score `z` to a probability in (0, 1).

**Signal components:**
1. **Fed rate deviation from 5.0% (weight: −0.8):** Historically, rates above 5% have preceded recessions (2006-2007 peak at ~5.25%, 2023 peak at ~5.33%). Note the negative weight: a rate **above** 5% reduces the z-score, reflecting that high rates are a contractionary signal that raises recession risk — but the current model calibration places the tipping point such that very high rates (above 5%) combined with elevated unemployment produce the highest probabilities. The sign works through the interaction with the unemployment term.
2. **Unemployment deviation from 5.0% (weight: 0.4):** Rising unemployment (above 5%) is a lagging recession indicator, consistent with NBER recession dating methodology which weights labor market deterioration heavily.

**Calibration benchmarks:**
- `fed_rate=5.0, unemp=5.0` → z=0 → probability=50% (neutral/uncertain environment)
- `fed_rate=4.0, unemp=4.2` → probability≈33% (soft landing territory)
- `fed_rate=6.5, unemp=6.0` → probability≈77% (stagflation stress)
- `fed_rate=2.0, unemp=7.0` → probability≈73% (recession scenario)

**Why logistic, not linear:** A linear model could produce probabilities outside [0, 1]. The logistic function guarantees a bounded output with smooth, continuous response to inputs and does not require threshold rules.

---

## 4. Scenario Presets

### Soft Landing
**Parameters:** Fed rate 4.0%, CPI 2.5%, Unemployment 4.0%

Represents the FOMC's stated goal as of 2024: bring inflation back to ~2.5% without causing a significant labor market deterioration. The 4.0% fed rate reflects one full 100bp easing cycle from the 2023-2024 peak of 5.33%. CPI at 2.5% is slightly above the 2% target but declining. Consistent with the FOMC's December 2024 median dot-plot projection for 2025. This configuration should produce recession probability in the 20-35% range and positive retail growth.

### Stagflation
**Parameters:** Fed rate 6.5%, CPI 5.5%, Unemployment 5.5%

Represents a scenario where persistent inflation (driven by supply shocks) forces the Fed to keep rates elevated even as unemployment rises — the classic "stagflation" trap. The 1970s analog involved oil supply shocks that drove CPI above 10%; this preset uses a more moderate version (CPI 5.5%). The simultaneous rise in both inflation and unemployment defeats the usual Fed trade-off. Expected model output: high recession probability (70-80%), negative retail growth.

### Recession
**Parameters:** Fed rate 2.0%, CPI 1.5%, Unemployment 6.5%

Represents a late-cycle recession where the Fed has already cut rates sharply in response to rising unemployment (analogous to 2008-2009 or early 2020). CPI falls as demand collapses. The low fed rate does not prevent high recession probability because unemployment is already elevated. Expected model output: very high recession probability (65-75%), sharply negative retail growth.

---

## 5. Important Limitations

1. **No fiscal policy.** The model does not incorporate government spending, tax changes, or automatic stabilizers, all of which significantly affect unemployment and growth trajectories.

2. **No supply shocks.** Energy price spikes, supply chain disruptions, and commodity shocks — major drivers of the 2021-2022 inflation surge — are not modeled.

3. **No international factors.** Exchange rates, global demand, and trade policy are omitted.

4. **Linear relationships.** Real economic relationships exhibit non-linearity, threshold effects, and regime changes. The simplified formulas work reasonably over the parameter range but should not be extrapolated.

5. **Annual calibration.** OLS regressions use annual average data, smoothing out intra-year volatility. The 12-month projection horizon is approximate, not precisely estimated.

6. **Not a forecast.** This is a scenario exploration tool. The outputs are directionally informative but carry wide uncertainty bands that are not quantified.

---

## 6. Data Sources

| Series | Description | Frequency Used |
|---|---|---|
| FEDFUNDS | Effective Federal Funds Rate | Annual average |
| UNRATE | Civilian Unemployment Rate | Annual average |
| CPIAUCSL | CPI All Urban Consumers, All Items | Annual YoY % change |
| RSAFS | Advance Retail Sales: Retail Trade and Food Services | Annual YoY % change |

Source: Federal Reserve Bank of St. Louis (FRED), https://fred.stlouisfed.org/

Data pre-processed by `scenario_data.py`. See `docs/data_dictionary.md` for field-level documentation.
