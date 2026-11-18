# Methodology: Economic Scenario Analysis Dashboard

## 1. Model Scope & Dual-Engine Architecture

This dashboard implements two distinct reduced-form engines for scenario exploration and macroeconomic sensitivity analysis:

1. **Calibrated Baseline (Policy Rules):**
   A stylized, reduced-form simulation applying rounded textbook parameters from macroeconomic literature (Taylor Rule, stylized baseline retail sensitivity, and monetary transmission drag). It provides deterministic point estimates for baseline policy comparison.

2. **Illustrative Empirical Prototype (CI Propagation):**
   A pedagogical econometric prototype illustrating parameter uncertainty propagation. It applies OLS coefficient estimates alongside exact conditional-mean standard errors ($\text{SE}$) and 95% conditional-mean confidence intervals ($\pm 1.96 \cdot \text{SE}$).

---

## 2. Input Parameters

| Parameter | FRED Series | Range | Default | Notes |
|---|---|---|---|---|
| Fed Funds Rate | FEDFUNDS | 0% – 8% | 4.50% | Target federal funds rate set by FOMC |
| Inflation (CPI YoY) | CPIAUCSL | 1% – 6% | 3.20% | Year-over-year CPI, all urban consumers |
| Unemployment Rate | UNRATE | 3% – 8% | 4.10% | Civilian unemployment rate |

---

## 3. Historical Landmark Snapshots & Gap Scope ($N=16$)

The dashboard embeds 16 selected historical benchmark years from 2000–2024:
`2000, 2001, 2003, 2006, 2007, 2008, 2009, 2010, 2015, 2018, 2019, 2020, 2021, 2022, 2023, 2024`.

### Methodological Gap Analysis
These 16 observations represent **landmark macroeconomic snapshots** chosen to illustrate cyclical turning points (dot-com bust, housing peak, GFC trough, ZIRP expansion, COVID shock, and rapid inflation tightening). They are **not a continuous annual time series**:
- **2001 → 2003:** 2-year gap (skips 2002)
- **2003 → 2006:** 3-year gap (skips 2004, 2005)
- **2010 → 2015:** 5-year gap (skips 2011, 2012, 2013, 2014)
- **2015 → 2018:** 3-year gap (skips 2016, 2017)
- **Consecutive 1-Year Pairs:** Exactly 11 pairs in the dataset have an actual 1-year transition ($t \to t+1$).

> [!IMPORTANT]
> Non-consecutive rows cannot be treated as consecutive annual lags. Differencing or lagging across non-consecutive rows introduces irregular multi-year gaps (up to 5 years), violating uniform lag assumptions. A full continuous annual series from FRED (25 consecutive annual observations or 300 monthly observations) is required for rigorous dynamic time-series estimation.

---

## 4. Projection Formulas & Econometric Derivations

### 4.1 Unemployment (12-Month Forward)

#### A. Calibrated Baseline
```text
unemployment_12mo = unemp_input + (fed_rate − 2.5) × 0.15
Clamped to [2.5%, 12.0%]
```
- **Neutral Rate Proxy:** $r^* = 2.5\%$
- **Stylized Sensitivity:** $+0.15\text{pp}$ per $100\text{bp}$ rate deviation above neutral.

#### B. Illustrative Policy Sensitivity Prototype
```text
u_12 = u_0 + \beta_r \cdot (fed_rate - 2.5)
```
- **Classification:** Illustrative Policy Assumption (Calibrated Sensitivity Rule).
- **Assumed Parameter:** $\beta_r = +0.1500\text{pp}$ per $100\text{bp}$ rate deviation above $2.5\%$.
- **Methodological Scope:** Landmark snapshots contain multi-year gaps (up to 5 years between 2010 and 2015) with only 11 consecutive 1-year pairs. Dynamic annual lag regressions cannot be defensibly identified without a continuous annual panel. This parameter is retained as an illustrative policy sensitivity heuristic, and unsupported empirical regression claims ($p$-values, $t$-statistics, $R^2$) have been removed.
- **Conditional-Mean Sensitivity Band:**
  $$\text{SE}(u_{12}) = \sqrt{s_0^2 + (fed\_rate - 2.5)^2 \cdot \text{SE}(\beta_r)^2}$$
  with baseline parameter sensitivity $s_0 = 0.12\%$.
- **Illustrative Sensitivity Band:** $[u_{12} - 1.96 \cdot \text{SE}, u_{12} + 1.96 \cdot \text{SE}]$.

---

### 4.2 Inflation / CPI (12-Month Forward)

#### A. Calibrated Baseline
```text
cpi_12mo = cpi_input × 0.70 + fed_rate × (−0.08)
Clamped to [−1.0%, 10.0%]
```
- **Stylized Persistence:** $0.70$
- **Stylized Rate Drag:** $-0.08\text{pp}$ per $1\text{pp}$ Fed funds rate.

#### B. Illustrative AR-X Sensitivity Prototype
```text
\pi_{12} = \alpha + \beta_\pi \cdot cpi_input + \beta_r \cdot fed_rate
```
- **Classification:** Illustrative Sensitivity Heuristic (Calibrated Persistence & Drag).
- **Assumed Parameters:** Intercept $\alpha = 0.9850$, Persistence $\beta_\pi = 0.6480$, Rate drag $\beta_r = -0.0760$.
- **Methodological Scope:** Multi-year gaps violate lag-1 dynamic assumptions. Retained purely as an illustrative simulation heuristic; unsupported empirical regression claims ($p$-values, $t$-statistics) have been removed.
- **Illustrative Sensitivity Band:** $[\pi_{12} - 1.96 \cdot s_e, \pi_{12} + 1.96 \cdot s_e]$ with $s_e = 1.150\%$.

---

### 4.3 Retail Sales Growth (12-Month Forward)

#### A. Calibrated Baseline
```text
retail_growth = 2.8 − (unemployment_12mo − 4.0) × 0.6
Clamped to [−8.0%, 12.0%]
```

#### B. Empirical OLS Model (Contemporaneous Retail Sales vs. Unemployment)
Fitted directly on the 16 landmark observations:
```text
g_{retail} = \beta_0 + \beta_u \cdot u_{12}
```
- **Sample:** $N = 16, \bar{u} = 5.3812\%, \bar{y} = 3.9881\%, SS_{xx} = 57.6088$.
- **Estimated Intercept:** $\hat{\beta}_0 = 9.9077$ ($\text{SE} = 3.8799, t = 2.554, p = 0.023$)
- **Estimated Slope:** $\hat{\beta}_u = -1.1000$ ($\text{SE} = 0.6800, t = -1.618, p = 0.128$)
- **Residual Standard Error:** $s_e = 5.1609\%, R^2 = 0.1575$
- **Standard Error of Conditional Mean:**
  $$\text{SE}(\hat{\mu}_{retail}) = s_e \sqrt{\frac{1}{N} + \frac{(u_{12} - \bar{u})^2}{SS_{xx}}}$$
- **95% Conditional-Mean Confidence Interval:** $[g_{retail} - 1.96 \cdot \text{SE}, g_{retail} + 1.96 \cdot \text{SE}]$.
- **Critical Methodological Limitation:** This model represents a **contemporaneous descriptive historical association** among selected landmark years. It is **NOT** an identified causal policy effect or validated 12-month predictive forecast. Reported uncertainty reflects conditional-mean parameter uncertainty ($\text{SE}(\hat{\mu})$), not an individual-year forecast prediction interval.

---

### 4.4 Distinction Between Uncertainty Types

> [!NOTE]
> It is essential to distinguish three distinct forms of statistical uncertainty:
> 1. **Coefficient Uncertainty ($\text{SE}(\hat{\beta})$):** Sampling variability of the parameter estimates.
> 2. **Conditional-Mean Confidence Interval ($\hat{\mu}_{y|x} \pm t \cdot \text{SE}(\hat{\mu})$):** Uncertainty regarding the true expected average across many scenarios.
> 3. **Forecast Prediction Interval ($\hat{y} \pm t \cdot \sqrt{\text{SE}(\hat{\mu})^2 + s_e^2}$):** Range of an individual realized future point. Incorporates irreducible residual variance $s_e^2$, making it substantially wider than the conditional-mean interval.
> 
> The dashboard UI displays **conditional-mean confidence intervals** to illustrate policy response sensitivity.

---

### 4.5 Recession Stress Index (12-Month Horizon)

- **Target Definition:** NBER-dated US recessions. In the 16 landmark years, NBER recessions occurred in 2001, 2008, 2009, and 2020 (**4 recession years vs. 12 expansion years**).
- **Actual Numerical Fit Diagnostic:**
  Iteratively Reweighted Least Squares (Newton-Raphson) attempted on $(y = \text{nber\_rec}, X = [1, fed\_rate, unrate])$ demonstrates severe divergence:
  - Iteration 0: $\text{LL} = -11.0904, \text{det}(H) = -6.39 \times 10^2$
  - Iterations 1–3: Parameters shift rapidly; Hessian condition explodes ($\text{cond}(H) > 10^{12}$) due to quasi-complete separation (only 4 recession events in 16 observations).
  - Iteration 4: Parameter step explodes ($> 10^4$), confirming standard MLE cannot be identified on this landmark sample.
- **Classification Status & Role in Dashboard:** The logistic formula:
  $$z = -5.1379 + 0.1257 \cdot fed\_rate + 0.6524 \cdot u_{12}, \quad P = \frac{1}{1 + e^{-z}}$$
  is presented purely as an **illustrative macro stress scoring index**, NOT an empirically fitted MLE model or out-of-sample validated probability forecast. Unsupported claims of pseudo-$R^2$, $t$-scores, and $p$-values have been removed.

---

## 5. Scenario Presets

### Soft Landing
**Parameters:** Fed rate 4.0%, CPI 2.5%, Unemployment 4.0%
- **Calibrated Outcome:** Unemployment 4.22%, CPI 1.43%, Retail 2.67%, Recession 62%.
- **Empirical Outcome:** Unemployment 4.23% [Mean CI: 3.92% – 4.54%], CPI 2.30% [Mean CI: 0.05% – 4.55%], Retail 5.26% [Mean CI: 2.73% – 7.79%], Stress Index 13%.

### Stagflation
**Parameters:** Fed rate 6.5%, CPI 5.5%, Unemployment 5.5%
- **Calibrated Outcome:** Unemployment 6.10%, CPI 3.33%, Retail 1.54%, Recession 32%.
- **Empirical Outcome:** Unemployment 6.11% [Mean CI: 5.51% – 6.70%], CPI 4.06% [Mean CI: 1.81% – 6.31%], Retail 3.19% [Mean CI: 0.65% – 5.72%], Stress Index 42%.

### Recession
**Parameters:** Fed rate 2.0%, CPI 1.5%, Unemployment 6.5%
- **Calibrated Outcome:** Unemployment 6.42%, CPI 0.89%, Retail 1.35%, Recession 95%.
- **Empirical Outcome:** Unemployment 6.42% [Mean CI: 6.17% – 6.67%], CPI 1.80% [Mean CI: -0.45% – 4.05%], Retail 2.84% [Mean CI: 0.28% – 5.41%], Stress Index 34%.

---

## 6. Reproducibility & Fit Artifacts

The complete estimation pipeline is reproducibly codified in:
- Pipeline script: `scripts/estimate_econometric_parameters.py`
- Fit artifact: `reports/econometric_estimation_artifacts.json`
- Verification suite: `tests/test_econometric_estimation.py` (5/5 PASS)
- Parity suite: `tests/test_model_parity.cjs` (6/6 PASS)
- Headless Chrome browser smoke test: `tests/test_browser_smoke.cjs` (100% PASS)
