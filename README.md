# Economic Scenario Analysis Dashboard

An interactive, browser-based tool that lets analysts and students adjust Federal Reserve policy levers and observe projected macroeconomic outcomes across four key indicators. Built as a single-file GitHub Pages project with zero runtime dependencies beyond a Chart.js CDN.

---

## Business Problem

Fed policy decisions ripple through the economy over months and years, but the cause-effect relationships are non-obvious to non-specialists. This dashboard makes three core lever effects tangible and explorable in real time:

1. How do rate changes historically precede unemployment shifts?
2. What does a rate-plus-inflation combination imply for retail activity?
3. At what threshold does recession probability become non-trivial?

The tool is designed for educational presentations, economic briefings, and policy scenario planning exercises where a live, interactive model is more persuasive than a static slide.

---

## Projection Formulas

All projections are 12-month forward estimates.

### Inputs

| Lever | Variable | Range | Default |
|---|---|---|---|
| Fed Funds Rate | `fed_rate` | 0% to 8% | 4.50% |
| Inflation (CPI YoY) | `cpi_input` | 1% to 6% | 3.20% |
| Unemployment Rate | `unemp_input` | 3% to 8% | 4.10% |

### Unemployment Projection

Uses an Okun-style linear approximation derived from OLS regression on FRED FEDFUNDS and UNRATE (2000-2024 annual averages, one-year lag). The OLS slope was 0.152; the dashboard rounds to 0.15.

```
unemployment_12mo = unemp_input + (fed_rate - 2.5) * 0.15
```

Clamped to [2.5%, 12.0%].

Interpretation: each 100 basis points of fed rate above 2.5% is associated with approximately 0.15 percentage points of additional unemployment over the following 12 months.

### CPI Projection

Combines a 70% persistence factor (inflation tends to mean-revert slowly) and an 8bp rate-drag per 100bp of fed rate (historically, tightening reduces inflation with a multi-month lag).

```
cpi_12mo = cpi_input * 0.70 + fed_rate * (-0.08)
```

Clamped to [-1.0%, 10.0%].

### Retail Sales Growth Projection

Retail activity is negatively correlated with unemployment (Pearson r = -0.62 in the 2000-2024 sample). Baseline growth is 2.8% (approximate long-run average), adjusted downward for each percentage point of unemployment above the 4.0% anchor.

```
retail_growth = 2.8 - (unemployment_12mo - 4.0) * 0.6
```

Clamped to [-8.0%, 12.0%].

### Recession Probability

A logistic function calibrated so that a fed rate around 5% with unemployment above 5% produces roughly 40-60% probability, consistent with historical pre-recession configurations (2006-2007, 2019).

```
z = -0.8 * (fed_rate - 5.0) + 0.4 * (unemployment_12mo - 5.0)
recession_probability = 1 / (1 + exp(-z))
```

Clamped to [1%, 99%].

---

## Preset Scenarios

| Scenario | Fed Rate | CPI Input | Unemployment |
|---|---|---|---|
| Soft Landing | 4.0% | 2.5% | 4.0% |
| Stagflation | 6.5% | 5.5% | 5.5% |
| Recession | 2.0% | 1.5% | 6.5% |

---

## Historical Data

Embedded as a JavaScript constant in `index.html`. Annual averages from FRED series:

- `FEDFUNDS` - Effective Federal Funds Rate
- `UNRATE` - Civilian Unemployment Rate
- `CPIAUCSL` - CPI All Urban Consumers, All Items (converted to YoY change)
- `RSAFS` - Advance Retail Sales (converted to YoY change)

Key years: 2000, 2001, 2003, 2006, 2007, 2008, 2009, 2010, 2015, 2018, 2019, 2020, 2021, 2022, 2023, 2024.

The Python script `scenario_data.py` documents exactly how this data would be regenerated from the FRED API.

---

## Running Locally

No server or build step required.

1. Download or clone this repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. That is all.

The only external resource is the Chart.js 4.4.4 script tag, loaded from jsDelivr CDN. An internet connection is required for the chart to render; all other functionality is self-contained.

---

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. Go to Settings > Pages.
3. Set Source to the branch containing `index.html` (root of the repository).
4. The site will be live at `https://<username>.github.io/<repo-name>/`.

---

## Tech Stack

| Component | Technology |
|---|---|
| Markup | HTML5 (single file) |
| Styling | CSS custom properties, no framework |
| Interactivity | Vanilla JavaScript (ES2020) |
| Charting | Chart.js 4.4.4 (CDN) |
| Fonts | Inter + IBM Plex Mono (Google Fonts CDN) |
| Data pipeline (doc) | Python, fredapi, pandas, numpy |

---

## Security Notes

All dynamic values written to the DOM use `textContent`, not `innerHTML`. There is no string interpolation into HTML markup anywhere in the JavaScript. The tool accepts no user-provided URLs or markup, making XSS a non-issue in normal usage.

---

## Limitations

- The projection formulas are simplified linear and logistic approximations, not structural economic models.
- Correlations are computed on annual averages, which smooth out business-cycle volatility.
- The model does not account for fiscal policy, supply shocks, global factors, or non-linear threshold effects.
- Historical correlations from 2000-2024 may not hold in future structural regimes.

---

Built by Akshay Kumar - [akbknight.github.io](https://akbknight.github.io)
