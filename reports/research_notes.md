# Research Notes: Economic Scenario Analysis Dashboard

Background literature informing the model design and coefficient calibration.

---

## 1. Taylor Rule (Taylor 1993)

**Reference:** Taylor, J.B. (1993). "Discretion versus policy rules in practice." *Carnegie-Rochester Conference Series on Public Policy*, 39, 195-214.

**Summary:**
Taylor proposed a simple rule for setting the federal funds rate:
```
i = r* + π + 0.5(π − π*) + 0.5(y − y*)
```
where:
- `i` = federal funds rate target
- `r*` = neutral real interest rate (~2% in Taylor's original formulation; often estimated at 0.5-2.5% post-2008)
- `π` = current inflation
- `π*` = inflation target (2% for the Fed)
- `y − y*` = output gap (actual vs. potential GDP)

**Implications for this model:**
The Taylor Rule establishes that rates above neutral constitute restrictive monetary policy. The dashboard uses 2.5% as the neutral rate proxy (consistent with the Fed's post-2008 consensus estimate of r-star). The unemployment projection formula uses the deviation from this neutral rate as the key input.

**Limitations:**
The Taylor Rule is a policy rule, not a forecasting model. It describes how rates *should* be set, not how the economy responds to rate changes. The dashboard's unemployment projection is the latter — a reduced-form approximation of the economy's response — not an implementation of the Taylor Rule itself.

---

## 2. Okun's Law (Okun 1962)

**Reference:** Okun, A.M. (1962). "Potential GNP: Its Measurement and Significance." *Proceedings of the Business and Economics Statistics Section of the American Statistical Association*, 98-104.

**The relationship:**
Okun observed that for every 1 percentage point increase in the unemployment rate above the natural rate, real GDP falls by approximately 2-3 percentage points below potential. In modern formulations:
```
(Y − Y*) / Y* ≈ −c × (U − U*)
```
where `c` is approximately 2.0-3.0 for the U.S. (varies by era and estimation method).

**Variants used:**
The "difference version" of Okun's Law, often used for short-run forecasting:
```
ΔU ≈ −0.5 × ΔY_gap
```
One percentage point decline in the growth rate of real GDP is associated with roughly 0.5pp increase in unemployment.

**Application in this dashboard:**
Okun's Law is applied in two ways:
1. **Directly (implicit):** The unemployment projection formula links the fed rate to unemployment changes — the rate-unemployment nexus is the mechanism through which monetary policy affects the real economy.
2. **Extended to retail sales:** The retail growth formula uses the unemployment-consumption link. Consumer spending (retail) is a major component of GDP, and Okun's employment-output relationship implies an employment-consumption relationship. Historical FRED data confirms this: Pearson r(UNRATE, RSAFS_yoy) = −0.62.

**Modern estimates of Okun's coefficient:**
Post-2008, several researchers found that the standard Okun coefficient declined (labor hoarding, part-time employment growth). For U.S. annual data 2000-2024, a coefficient of ~0.5 (unemployment sensitivity to output) maps roughly to the retail sensitivity of 0.6 used here when applied to retail specifically rather than GDP.

---

## 3. Recession Prediction Literature

**Primary reference:** Estrella, A., & Mishkin, F.S. (1998). "Predicting U.S. Recessions: Financial Variables as Leading Indicators." *Review of Economics and Statistics*, 80(1), 45-61.

**Key findings:**
- The slope of the yield curve (10-year minus 3-month Treasury spread) is among the best single predictors of recession 4-6 quarters ahead
- A probit model with the yield spread alone achieves substantial out-of-sample accuracy
- The relationship is robust across different recession definitions and time periods
- The logit/probit specification naturally bounds recession probability to (0, 1)

**Methodology:**
```
Pr(recession in quarter t+k | information at t) = Φ(α + β × spread_t)
```
where Φ is the normal CDF (probit) or logistic function (logit), and `spread_t` is the yield curve slope.

**Application to this dashboard:**
The dashboard does not have direct access to the yield curve spread. Instead, it uses:
1. Fed rate deviation from 5.0% as a proxy for restrictive monetary stance (inversely related to the long-short spread)
2. Projected unemployment as a concurrent recession signal

The logistic specification follows Estrella & Mishkin directly. The coefficients are not estimated from recession data but are calibrated to produce plausible probability ranges across the dashboard's parameter space.

**Caveat:** The yield curve has been less reliable as a recession predictor post-2020 due to QE/QT distortions, the unusual COVID shock, and the post-2022 inverted curve that preceded a non-recession period. The dashboard's approach is a simplification that avoids over-relying on yield curve data.

---

## 4. Limitations of Reduced-Form Macro Models

**Sims (1980) critique:** Christopher Sims's foundational VAR paper argued that structural macro models impose implausible "incredible" restrictions. Reduced-form models avoid this but sacrifice structural interpretation.

**Lucas Critique (Lucas 1976):** Economic agents' expectations adjust to policy changes, so historical coefficients may not hold in new policy regimes. A model calibrated on 2000-2024 data may not accurately capture the transmission mechanisms during unprecedented events (COVID, post-COVID supply chain disruptions).

**Omitted variable bias:** The dashboard's formulas omit fiscal policy, supply shocks, global demand, confidence effects, and financial conditions (credit spreads, equity prices). These are significant drivers of the business cycle that a three-variable model cannot capture.

**Heteroskedasticity:** Economic relationships often change in magnitude across business cycle phases. A single linear coefficient applies poorly across both booms (2018-2019) and deep recessions (2008-2009).

**What the model is good for:**
Despite these limitations, the dashboard achieves its goal: demonstrating the directional effects of Fed policy levers in a transparent, interactive format. For presentations, executive briefings, or classroom exercises, the simplified model provides enough fidelity to make the key relationships vivid and explorable.

---

## 5. FRED Data Quality Notes

- **FEDFUNDS:** Monthly average of daily effective federal funds rate. Well-measured, no major revisions. The most reliable series in the model.
- **UNRATE:** Household survey (Current Population Survey). Subject to sampling variability; annual averages substantially reduce noise. Definition of "unemployed" follows BLS U-3 standard.
- **CPIAUCSL:** Urban consumers only (~93% of U.S. population). Seasonally adjusted. Subject to methodological revisions (basket weights, hedonic adjustments). The YoY transformation used in this model is less sensitive to base period effects than month-over-month.
- **RSAFS:** Survey-based estimate with significant revisions; preliminary estimates can differ from final by 1-2pp in volatile periods (2020-2021). Annual averages smooth most of this volatility.

All series are sourced from FRED at https://fred.stlouisfed.org/. Pre-computed annual averages are embedded in `index.html` and documented in `scenario_data.py`.
