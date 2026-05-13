# Final Review — Economic Scenario Analysis Dashboard

## Summary

Browser-based macroeconomic scenario tool implementing a reduced-form projection model calibrated against FRED data (2000–2024). Takes three policy inputs (Fed funds rate, CPI, unemployment) and projects four 12-month-forward outputs (unemployment trajectory, GDP growth, equity return, credit spread). Includes four named scenario presets and a Python data generator for pre-computing the scenario grid.

---

## What Was Built

### Projection Model
- **Unemployment 12-month forward**: `unemp_input + (fed_rate − 2.5) × 0.15`, clamped [2.5%, 12.0%]
- **GDP growth**: `2.5 − (fed_rate − 2.0) × 0.3 − (unemp_input − 4.5) × 0.4`, clamped [−5%, 6%]
- **Equity return**: `8.0 − (fed_rate − 2.0) × 1.2 − (cpi − 2.5) × 0.8 − (unemp_input − 4.5) × 1.5`
- **Credit spread**: `1.5 + (fed_rate − 2.0) × 0.2 + (unemp_input − 4.5) × 0.3 + max(0, cpi − 3.0) × 0.15`

All coefficients calibrated against FRED annual data. Model is explicitly reduced-form — not a DSGE or VAR system. Documented with FRED series IDs and calibration rationale in `docs/methodology.md`.

### Named Scenario Presets
- **Soft Landing**: Fed 4.0%, CPI 2.5%, Unemployment 4.2%
- **Stagflation**: Fed 7.0%, CPI 6.0%, Unemployment 6.5%
- **Recession**: Fed 1.0%, CPI 1.5%, Unemployment 7.5%
- **Strong Recovery**: Fed 3.5%, CPI 3.0%, Unemployment 3.5%

### Production Structure
- `scenario_data.py` — pre-computes 3D scenario grid from formula implementations
- `src/js/config.js` — scenario definitions, slider ranges, default values
- `src/js/model.js` — closed-form projection formulas
- `src/js/charts.js` — Chart.js radar and bar chart initialization

### Documentation
- `docs/methodology.md` — model scope, all 4 projection formulas, FRED calibration, limitations
- `docs/architecture.md` — data flow from Python generator → JSON → dashboard
- `docs/decision_log.md` — why reduced-form over VAR, why pre-computed grid, why FRED calibration
- `docs/data_dictionary.md` — all input/output variables with units, FRED series IDs, ranges

---

## Known Limitations

1. Projection formulas are linear approximations — real macro relationships are nonlinear at extremes
2. Calibration covers 2000–2024; pre-2000 regimes may not apply
3. No uncertainty quantification — outputs are point projections, not distributions

---

## Deployment

Static GitHub Pages. `index.html` at root. Pre-computed scenario grid embedded in HTML. No runtime data fetching.
