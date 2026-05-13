# Decision Log: Economic Scenario Analysis Dashboard

This document records key design and implementation decisions, along with the rationale behind each choice. The goal is to make the project's intellectual choices transparent and reproducible.

---

## Decision 1: Reduced-Form Model, Not Econometric

**Decision:** Use simplified closed-form linear and logistic approximations, not a VAR, DSGE, or regression model estimated from data.

**Context:** The dashboard needs to show directional macroeconomic effects of Fed policy levers in real time, in a browser, without a server backend.

**Rationale:**
A full VAR (Vector Autoregression) model would require:
- A minimum of ~40 quarterly observations per variable for reliable estimation
- A full OLS or maximum likelihood estimation pipeline
- Proper handling of lag selection (AIC/BIC), cointegration testing, and impulse response functions
- A runtime backend to evaluate the model for arbitrary inputs

A DSGE model (Dynamic Stochastic General Equilibrium) adds:
- Structural parameter calibration against DSGE literature
- Steady-state and linearization computations
- Welfare analysis components irrelevant to scenario dashboards

Neither is appropriate for a portfolio dashboard where the goal is clear communication of cause-and-effect relationships to a non-specialist business audience.

The simplified reduced-form approximations communicate the **directional effects** clearly:
- Higher rates → more unemployment
- Higher rates → lower inflation
- Higher unemployment → lower retail growth
- High rates + high unemployment → higher recession probability

These directional relationships are correct and well-supported by empirical macro literature. The exact coefficients are calibrated approximations rather than precise statistical estimates, which is appropriate for a scenario exploration tool.

**Tradeoff acknowledged:** The model cannot produce confidence intervals, cannot handle structural breaks, and will produce unrealistic outputs in extreme parameter combinations (e.g., simultaneously very high fed rate and very low unemployment). The UI clamps all outputs to economically plausible ranges to mitigate the worst edge cases.

---

## Decision 2: Okun's Law Variant for Retail Growth

**Decision:** Link retail sales growth to projected unemployment via a linear Okun-style formula rather than using a direct regression on retail sales.

**Context:** The dashboard needed a formula for retail sales growth that responds to the model's other outputs (specifically projected unemployment).

**Rationale:**
Okun's Law (Okun 1962) is the most widely cited and empirically validated empirical relationship linking the labor market to economic output. It is taught in every introductory macroeconomics course, making it accessible and defensible to a business audience.

The extension from GDP to retail sales is justified empirically: FRED data shows a Pearson r of −0.62 between UNRATE and RSAFS YoY growth over 2000-2024, confirming that the labor-market-to-consumer-spending channel is real and measurable in the data.

Using retail sales (rather than GDP) as the output variable is a deliberate choice to make the model outputs more concrete and business-relevant. A portfolio manager, retail analyst, or business strategist can more directly use a retail growth projection than a GDP growth projection.

**Alternatives considered:**
- Direct OLS regression of RSAFS on lagged FEDFUNDS: would require more parameters and produce lower interpretability
- Using GDP growth: less immediately business-relevant; already covered implicitly by the recession probability output
- Using a consumption survey index: no reliable machine-readable series available at annual frequency

---

## Decision 3: Logistic Function for Recession Probability

**Decision:** Use a logistic function to map the rate-unemployment signal to a recession probability, rather than a piecewise rule or simple threshold.

**Context:** The dashboard needs a recession probability output bounded to [0, 1] that responds smoothly to both the fed rate and projected unemployment.

**Rationale:**
A piecewise rule (e.g., "if fed_rate > 5% AND unemp > 5%, return 70%") produces discontinuous jumps at thresholds, which creates poor user experience with the sliders: the probability would jump by 20-30pp when crossing a threshold, which is not how economic risk works.

The logistic function ensures:
1. Output is always in (0, 1) — no clamping needed except to avoid exactly 0% or 100%
2. Continuous, smooth response — slider movement produces smooth probability changes
3. Mathematical equivalence to a logit model — the most common specification in the academic recession prediction literature (Estrella & Mishkin 1998)

The logistic approach is also explainable: "the z-score is a weighted combination of how far above 5% the fed rate is and how far above 5% unemployment is, and the logistic function converts that score to a probability."

**Alternatives considered:**
- Probit function: similar results to logit; less commonly known outside academia
- Linear probability: would produce values outside [0, 1] at extreme inputs
- Lookup table keyed on parameter combinations: not generalizable, inflexible

---

## Decision 4: Single-File Deployment

**Decision:** Deploy as a single `index.html` file with all CSS, JS, and data embedded inline.

**Context:** The dashboard is hosted on GitHub Pages as a portfolio project.

**Rationale:**
- Zero configuration: GitHub Pages serves index.html with no build step, no CI/CD, no npm
- Zero CORS issues: all resources are either inline or loaded from trusted CDNs with no cross-origin data requests
- Portability: the file can be opened directly from a filesystem without a local server
- Simplicity: a single file is easier for portfolio reviewers to inspect and understand

The tradeoff is file size: at ~1,200 lines, the file is manageable. The embedded historical data (16 data points, 4 fields each) adds negligible size.

---

## Decision 5: Chart.js Over D3.js or Plotly

**Decision:** Use Chart.js for the historical data visualization rather than D3.js or Plotly.

**Context:** The dashboard needs one line chart showing two FRED series from 2000-2024.

**Rationale:**
- Chart.js is significantly lighter than Plotly (Chart.js CDN ~210KB vs. Plotly ~3MB)
- The visualization is a straightforward line chart with two series and tooltip — exactly the Chart.js sweet spot
- D3.js is lower-level and requires more boilerplate for a simple line chart
- The dark theme, amber color tokens, and custom tooltip are more easily controlled in Chart.js than in Plotly's layout system

The IRS 990 dashboard (a separate repo) uses Plotly due to its more complex visualization needs (choropleth map, stacked bars, donut charts). The division of charting libraries across the two repos reflects the appropriate tool for each use case.

---

## Decision 6: Preset Scenarios (Not User-Named Scenarios)

**Decision:** Provide three fixed preset scenarios (Soft Landing, Stagflation, Recession) rather than allowing users to name and save custom scenarios.

**Context:** The dashboard is a portfolio project, not a full product.

**Rationale:**
The three presets represent the most commonly discussed macro environments in the financial press (2022-2024) and provide a clear taxonomy of outcomes. They serve as benchmarks against which the user can compare their custom slider position.

Named/saved scenarios would require localStorage or a backend, adding complexity without significantly improving the educational value of the tool.

The preset labels also serve a teaching function: they name the economic archetypes so that users who are not professional economists can understand what each configuration represents.
