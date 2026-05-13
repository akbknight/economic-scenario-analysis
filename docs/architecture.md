# Architecture: Economic Scenario Analysis Dashboard

## Overview

The dashboard is a single-file, client-side web application (`index.html`). There is no server, no API, no build pipeline, and no runtime dependencies beyond two CDN resources loaded at page load. All logic executes in the browser.

```
index.html
├── CSS (inline <style> block)
├── HTML structure
├── <script> block (embedded JavaScript)
│   ├── HISTORICAL_DATA constant (FRED annual averages, pre-computed)
│   ├── PRESETS constant (scenario definitions)
│   ├── runModel() — projection engine
│   ├── buildChart() — Chart.js initialization
│   ├── updateProjections() — DOM update orchestrator
│   └── Event listeners (slider inputs, Run button)
└── CDN dependencies
    ├── Chart.js 4.4.4 (charts)
    └── Google Fonts (Inter, IBM Plex Mono)
```

The source files in `src/js/` are documented, standalone extractions of the embedded logic for code review and portfolio presentation purposes. They are not loaded by `index.html`; the production code lives entirely within that single file.

---

## Data Flow

```
User interacts with slider
        │
        ▼
syncSliderLabels()
  └─ Updates display values in real-time (no model run on every tick)
        │
        ▼
updateProjections(animate)
  └─ Reads three slider values: fed_rate, cpi, unemp
        │
        ▼
runModel(fed_rate, cpi, unemp)     ← model.js equivalent
  ├─ projectUnemployment(fedRate, unempInput)
  │     Returns: unemp_12mo
  ├─ projectInflation(cpi, fedRate)
  │     Returns: cpi_12mo
  ├─ projectRetailGrowth(unemp_12mo)
  │     Returns: retail_growth
  └─ computeRecessionProbability(fedRate, unemp_12mo)
        Returns: rec_prob (integer %)
        │
        ▼
DOM update: projection cards
  ├─ projUnemp.textContent   ← unemp_12mo
  ├─ projCpi.textContent     ← cpi_12mo
  ├─ projRetail.textContent  ← retail_growth
  ├─ projRec.textContent     ← rec_prob
  ├─ Color class applied (good / warn / bad) per threshold rules
  └─ Progress bar widths updated
        │
        ▼
buildCompTable(currentRes)
  └─ Runs runModel() for each of 3 presets (Soft Landing, Stagflation, Recession)
  └─ Builds HTML table showing 4 columns: Soft | Stag | Rec | Current
```

---

## Component Map

### Slider Controls (Left Panel)

Three `<input type="range">` elements:
- `#slider-fed` — Fed Funds Rate, range [0, 8], step 0.25
- `#slider-cpi` — CPI YoY, range [1, 6], step 0.1
- `#slider-unemp` — Unemployment, range [3, 8], step 0.1

Each fires `input` events that trigger `syncSliderLabels()` (immediate display update) and `updateProjections(false)` (model run, no flash animation).

The "Run Scenario" button triggers `updateProjections(true)` with card flash animation.

### Projection Cards (Right Panel, Top)

Four cards (`.proj-card` elements):
- Projected Unemployment (12mo)
- Projected CPI YoY (12mo)
- Retail Sales Growth (12mo)
- Recession Probability

Each card has:
- Value display (`.proj-card-value`) — IBM Plex Mono font, color-coded
- Sub-label showing current input value for context
- Progress bar (`.proj-card-bar`) — scaled by output value, color-matched

Color thresholds per indicator:
| Indicator | Green (good) | Yellow (warn) | Red (bad) |
|---|---|---|---|
| Unemployment | < 4.5% | < 6.0% | ≥ 6.0% |
| CPI | 1.5% – 3.0% | 3.0% – 4.5% | < 1.5% or > 4.5% |
| Retail Growth | ≥ 2.0% | ≥ 0.0% | < 0.0% |
| Recession Prob | < 25% | < 50% | ≥ 50% |

### Historical Chart (Right Panel, Middle)

Chart.js 4.4.4 line chart displaying HISTORICAL_DATA:
- X-axis: years (2000-2024, selected snapshots)
- Y-axis: fixed [-1, 11]
- Series 1: Fed Funds Rate (amber)
- Series 2: Unemployment Rate (blue)

Chart is initialized once on page load (`buildChart()`) and is **static** — it does not update when sliders change. It provides context for the historical relationship between the two series.

### Scenario Comparison Table (Right Panel, Bottom)

A `<table>` built dynamically by `buildCompTable()` on every model run. Rows:
1. Fed Funds Rate (input)
2. Input CPI (input)
3. Initial Unemployment (input)
4. Projected Unemployment (output)
5. Projected CPI (output)
6. Retail Growth (output)
7. Recession Probability (output)

Columns: Soft Landing | Stagflation | Recession | Current (slider values)

Uses only `textContent` — no `innerHTML` with variable data — to avoid XSS risk.

---

## File Structure

```
economic-scenario-analysis/
├── index.html          — Single-file production dashboard (DO NOT MODIFY)
├── scenario_data.py    — Python script documenting FRED data pipeline
├── src/
│   └── js/
│       ├── config.js   — Scenario presets, historical data, parameter bounds
│       ├── model.js    — Documented projection formula functions
│       └── charts.js   — Chart.js initialization (extracted from index.html)
├── docs/
│   ├── methodology.md      — Mathematical basis of all projection formulas
│   ├── architecture.md     — This file: system design and data flow
│   ├── decision_log.md     — Key design decisions and rationale
│   └── data_dictionary.md  — Parameter and output field documentation
├── reports/
│   ├── research_notes.md   — Economic literature background
│   └── results.md          — Scenario output validation
├── PROJECT_PLAN.md
├── FINAL_REVIEW.md
├── README.md
└── .gitignore
```

---

## Deployment

GitHub Pages serves `index.html` directly from the repository root. There is no build step. The live URL is https://akbknight.github.io/economic-scenario-analysis/.

CDN dependencies are loaded via `<script src="">` tags with fully qualified CDN URLs. No local asset hosting is required.
