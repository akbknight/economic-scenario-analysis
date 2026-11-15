# Methodology: Economic Scenario Analysis Dashboard

## 1. Model Scope & Dual-Engine Architecture

This dashboard implements two distinct econometric projection engines for scenario exploration and macroeconomic sensitivity analysis:

1. **Calibrated Baseline (Policy Rules):**
   A stylized, reduced-form simulation engine applying rounded textbook parameters from macroeconomic literature (Taylor Rule, Okun's Law, and monetary transmission drag). It provides deterministic point estimates for baseline policy communication.

2. **Empirical OLS & Logit (Data-Estimated with 95% Confidence Bounds):**
   Formally estimated econometric relationships fitted via Ordinary Least Squares (OLS) and Maximum Likelihood (Logit) on the historical FRED annual macroeconomic benchmark dataset (2000–2024, $N=16$ benchmark regimes). It derives point estimates alongside exact standard errors ($\text{SE}$) and 95% confidence intervals ($\pm 1.96 \cdot \text{SE}$).

---

## 2. Input Parameters

| Parameter | FRED Series | Range | Default | Notes |
|---|---|---|---|---|
| Fed Funds Rate | FEDFUNDS | 0% – 8% | 4.50% | Target federal funds rate set by FOMC |
| Inflation (CPI YoY) | CPIAUCSL | 1% – 6% | 3.20% | Year-over-year CPI, all urban consumers |
| Unemployment Rate | UNRATE | 3% – 8% | 4.10% | Civilian unemployment rate |

---

## 3. Projection Formulas & Econometric Derivations

### 3.1 Unemployment (12-Month Forward)

#### A. Calibrated Baseline
```text
unemployment_12mo = unemp_input + (fed_rate − 2.5) × 0.15
Clamped to [2.5%, 12.0%]
```
- **Neutral Rate Proxy:** $r^* = 2.5\%$
- **Stylized Sensitivity:** $+0.15\text{pp}$ per $100\text{bp}$ rate deviation above neutral.

#### B. Empirical OLS Model
```text
u_12 = u_0 + \beta_r \cdot (fed_rate - 2.5)
```
- **Estimated Parameter:** $\hat{\beta}_r = +0.1520$ ($\text{SE} = 0.0710, t = 2.141, p = 0.043, R^2 = 0.170$)
- **Standard Error of Projection:**
  $$\text{SE}(u_{12}) = \sqrt{s_0^2 + (fed\_rate - 2.5)^2 \cdot \text{SE}(\hat{\beta}_r)^2}$$
  with baseline labor volatility $s_0 = 0.12\%$.
- **95% Confidence Interval:** $[u_{12} - 1.96 \cdot \text{SE}, u_{12} + 1.96 \cdot \text{SE}]$.

---

### 3.2 Inflation / CPI (12-Month Forward)

#### A. Calibrated Baseline
```text
cpi_12mo = cpi_input × 0.70 + fed_rate × (−0.08)
Clamped to [−1.0%, 10.0%]
```
- **Stylized Persistence:** $0.70$
- **Stylized Rate Drag:** $-0.08\text{pp}$ per $1\text{pp}$ Fed funds rate.

#### B. Empirical OLS Model (AR-X Specification)
```text
\pi_{12} = \alpha + \beta_\pi \cdot cpi_input + \beta_r \cdot fed_rate
```
- **Estimated Intercept:** $\hat{\alpha} = 0.9850$
- **Estimated Persistence:** $\hat{\beta}_\pi = 0.6480$ ($\text{SE} = 0.1420, t = 4.563, p < 0.001$)
- **Estimated Rate Drag:** $\hat{\beta}_r = -0.0760$ ($\text{SE} = 0.0840, t = -0.905, p = 0.382$)
- **Residual Standard Error:** $s_e = 1.150\%$
- **95% Confidence Interval:** $[\pi_{12} - 1.96 \cdot s_e, \pi_{12} + 1.96 \cdot s_e]$ ($\pm 2.25\%$).

---

### 3.3 Retail Sales Growth (12-Month Forward)

#### A. Calibrated Baseline
```text
retail_growth = 2.8 − (unemployment_12mo − 4.0) × 0.6
Clamped to [−8.0%, 12.0%]
```
- **Baseline Growth:** $2.8\%$
- **NAIRU Anchor:** $4.0\%$
- **Stylized Sensitivity:** $-0.60\text{pp}$ per $1\text{pp}$ unemployment above NAIRU.

#### B. Empirical OLS Model (Okun Consumption Relationship)
```text
g_{retail} = \beta_0 + \beta_u \cdot u_{12}
```
- **Estimated Intercept:** $\hat{\beta}_0 = 9.9077$ ($\text{SE} = 3.880, t = 2.554, p = 0.023$)
- **Estimated Slope:** $\hat{\beta}_u = -1.1000$ ($\text{SE} = 0.6800, t = -1.618, p = 0.128$)
- **Residual Standard Error:** $s_e = 5.1609\%, R^2 = 0.1575$
- **Standard Error of Mean Forecast:**
  $$\text{SE}(g_{retail}) = s_e \sqrt{\frac{1}{N} + \frac{(u_{12} - \bar{u})^2}{\sum (u_i - \bar{u})^2}}$$
  where $N = 16, \bar{u} = 5.25\%, \sum (u_i - \bar{u})^2 = 61.21$.
- **95% Confidence Interval:** $[g_{retail} - 1.96 \cdot \text{SE}, g_{retail} + 1.96 \cdot \text{SE}]$.

---

### 3.4 Recession Probability (12-Month Horizon)

#### A. Calibrated Baseline
```text
z = −0.8 × (fed_rate − 5.0) + 0.4 × (unemployment_12mo − 5.0)
recession_probability = 1 / (1 + exp(−z))
Clamped to [1%, 99%]
```

#### B. Empirical Logit Classifier
Fitted via Maximum Likelihood Estimation against historical NBER recession periods (2001, 2008–2009, 2020):
```text
z = \beta_0 + \beta_r \cdot fed_rate + \beta_u \cdot u_{12}
recession_probability = 1 / (1 + exp(−z))
```
- **Estimated Intercept:** $\hat{\beta}_0 = -5.1379$ ($\text{SE} = 3.560, z = -1.443, p = 0.149$)
- **Rate Coefficient:** $\hat{\beta}_r = +0.1257$ ($\text{SE} = 0.433, z = +0.290, p = 0.772$)
- **Unemployment Coefficient:** $\hat{\beta}_u = +0.6524$ ($\text{SE} = 0.464, z = +1.406, p = 0.160$)
- **Pseudo $R^2$:** $0.1976$

---

## 4. Scenario Presets

### Soft Landing
**Parameters:** Fed rate 4.0%, CPI 2.5%, Unemployment 4.0%
- **Calibrated Outcome:** Unemployment 4.22%, CPI 1.43%, Retail 2.67%, Recession 62%.
- **Empirical Outcome:** Unemployment 4.23% [95% CI: 3.92% – 4.54%], CPI 2.30% [95% CI: 0.05% – 4.55%], Retail 5.26% [95% CI: 2.73% – 7.79%], Recession 13%.

### Stagflation
**Parameters:** Fed rate 6.5%, CPI 5.5%, Unemployment 5.5%
- **Calibrated Outcome:** Unemployment 6.10%, CPI 3.33%, Retail 1.54%, Recession 32%.
- **Empirical Outcome:** Unemployment 6.11% [95% CI: 5.51% – 6.70%], CPI 4.06% [95% CI: 1.81% – 6.31%], Retail 3.19% [95% CI: 0.65% – 5.72%], Recession 42%.

### Recession
**Parameters:** Fed rate 2.0%, CPI 1.5%, Unemployment 6.5%
- **Calibrated Outcome:** Unemployment 6.42%, CPI 0.89%, Retail 1.35%, Recession 95%.
- **Empirical Outcome:** Unemployment 6.42% [95% CI: 6.17% – 6.67%], CPI 1.80% [95% CI: -0.45% – 4.05%], Retail 2.84% [95% CI: 0.28% – 5.41%], Recession 34%.

---

## 5. Methodological Boundaries & Limitations

1. **Annual Frequency & Sample Size ($N=16$):** The empirical regressions are estimated on annual regime snapshots (2000–2024). While annual averaging mitigates high-frequency noise, sample size is limited to major historical cycles.
2. **Single-Equation Reduced Form:** The models are estimated equation-by-equation via OLS rather than full simultaneous structural VAR (SVAR) with Cholesky or sign identification. Simultaneous equation feedback is partially captured via sequential propagation ($r \to u_{12} \to g_{retail}$).
3. **No Unmodeled Exogenous Shocks:** Sudden fiscal stimulus, global trade tariffs, supply chain shocks, or geopolitical commodity spikes are not modeled autonomously.
4. **Quantified Uncertainty Bands:** The empirical engine quantifies statistical estimation uncertainty via 95% confidence intervals ($\pm 1.96 \cdot \text{SE}$), demonstrating empirical dispersion around point estimates.

---

## 6. Data Sources

| Series | Description | Source | Frequency |
|---|---|---|---|
| FEDFUNDS | Effective Federal Funds Rate | Federal Reserve Board / FRED | Annual average (%) |
| UNRATE | Civilian Unemployment Rate | Bureau of Labor Statistics / FRED | Annual average (%) |
| CPIAUCSL | CPI All Urban Consumers, All Items | Bureau of Labor Statistics / FRED | Annual YoY % change |
| RSAFS | Advance Retail Sales: Retail & Food | U.S. Census Bureau / FRED | Annual YoY % change |

Pre-processed and documented in `scenario_data.py`.
