# Project Plan — Economic Scenario Analysis Dashboard

## Objective

Build a browser-based macroeconomic scenario tool that lets business analysts explore how changes in Fed funds rate, inflation, and unemployment ripple through to equity returns, credit spreads, and GDP growth. The model is explicitly reduced-form and calibrated against FRED data — not a black-box engine, but a transparent educational tool.

---

## Scope

### In Scope
- Reduced-form projection formulas for 4 macro outputs (unemployment, GDP, equity return, credit spread)
- Interactive sliders for 3 policy inputs (fed rate, CPI, unemployment)
- Named scenario presets (Soft Landing, Stagflation, Recession, Recovery)
- Python scenario data generator (`scenario_data.py`) for pre-computing the scenario grid
- Static HTML dashboard — no backend

### Out of Scope
- VAR / DSGE structural modeling
- Real-time FRED API calls from the browser
- Confidence intervals or distributional forecasts

---

## Model Design

The projection formulas are derived from empirical macro literature and calibrated to FRED annual data (2000–2024). Simplicity is intentional: transparent closed-form expressions communicate directional intuition to a business audience without requiring interpretation of model internals. Each formula is documented with its FRED calibration source in `docs/methodology.md`.

---

## File Structure

```
economic-scenario-analysis/
├── index.html              ← Dashboard entry (GitHub Pages)
├── scenario_data.py        ← Scenario grid pre-computation
├── src/js/
│   ├── config.js           ← Scenario definitions, axis ranges
│   ├── model.js            ← Projection formula implementations
│   └── charts.js           ← Chart.js initialization
├── docs/
│   ├── methodology.md
│   ├── architecture.md
│   ├── decision_log.md
│   └── data_dictionary.md
└── reports/
    ├── research_notes.md
    └── results.md
```

---

## Execution Phases

### Phase 1 — Core Model (Complete)
- [x] Four projection formulas implemented
- [x] Scenario preset grid pre-computed via scenario_data.py
- [x] FRED calibration documented

### Phase 2 — Structure Upgrade (Complete)
- [x] Extract JS to src/js/ modules
- [x] Write full methodology with formula derivations
- [x] Write architecture, decision log, data dictionary
- [x] Write research notes and results report

---

## Success Criteria

- [x] Projection formulas grounded in published FRED series (FEDFUNDS, CPIAUCSL, UNRATE)
- [x] src/js/ modules separated by concern
- [x] All docs/ files contain real technical content
- [x] No AI-generated residue
- [x] Dashboard functional after restructuring
