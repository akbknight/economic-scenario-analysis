/**
 * config.js
 * ---------
 * Central configuration for the Economic Scenario Analysis Dashboard.
 * Contains scenario presets, historical FRED data arrays, calibrated model parameters,
 * and empirical econometric estimation constants derived from FRED time series.
 *
 * All rate values are expressed as percentages (e.g., 4.5 means 4.5%).
 */

"use strict";

/* ============================================================
   PARAMETER BOUNDS
   These define the slider ranges in the UI.
   ============================================================ */

const PARAM_BOUNDS = {
  fed_rate: { min: 0,   max: 8,   step: 0.25, default: 4.5  },
  cpi:      { min: 1,   max: 6,   step: 0.1,  default: 3.2  },
  unemp:    { min: 3,   max: 8,   step: 0.1,  default: 4.1  },
};

/* ============================================================
   PROJECTION OUTPUT CLAMP BOUNDS
   ============================================================ */

const OUTPUT_BOUNDS = {
  unemp_12mo:    { min: 2.5,  max: 12.0 },
  cpi_12mo:      { min: -1.0, max: 10.0 },
  retail_growth: { min: -8.0, max: 12.0 },
  rec_prob:      { min: 0.01, max: 0.99  },
};

/* ============================================================
   CALIBRATED MODEL CONSTANTS (POLICY HEURISTIC BASELINE)
   Calibrated approximations from FRED annual literature (2000-2024).
   See docs/methodology.md for derivation rationale.
   ============================================================ */

const MODEL_CONSTANTS = {
  /** Neutral real federal funds rate proxy (%) */
  NEUTRAL_RATE: 2.5,

  /** OLS slope: unemp(t+1) = UNEMP_SLOPE * fed_rate(t) + intercept
   *  Estimated from FRED FEDFUNDS → UNRATE with 1-year lag (2000-2024).
   *  Raw OLS = 0.152; rounded to 0.15 for stylized policy rule. */
  UNEMP_SLOPE: 0.15,

  /** CPI persistence factor — fraction of current inflation carried forward */
  CPI_PERSISTENCE: 0.70,

  /** CPI rate drag — reduction in projected CPI per 1pp of fed rate */
  CPI_RATE_DRAG: -0.08,

  /** Retail baseline growth (%) — long-run average advance retail YoY */
  RETAIL_BASELINE: 2.8,

  /** Retail-unemployment sensitivity from Okun's Law variant
   *  Each 1pp rise in unemployment above 4.0% → -0.6pp retail growth. */
  RETAIL_UNEMP_SENSITIVITY: 0.6,

  /** NAIRU proxy (Non-Accelerating Inflation Rate of Unemployment) used
   *  as the anchor for both retail and recession probability formulas. */
  NAIRU_PROXY: 4.0,

  /** Logistic z-score weights for recession probability calculation */
  REC_RATE_WEIGHT:  -0.8,
  REC_UNEMP_WEIGHT:  0.4,
  REC_RATE_ANCHOR:   5.0,
  REC_UNEMP_ANCHOR:  5.0,
};

/* ============================================================
   EMPIRICAL ECONOMETRIC ESTIMATION CONSTANTS (DATA-ESTIMATED)
   Formally estimated via OLS and Maximum Likelihood Logit on the
   historical FRED macroeconomic dataset (2000-2024, N=16 benchmark regimes).
   ============================================================ */

const EMPIRICAL_CONSTANTS = {
  unemployment: {
    name: "Labor Market Policy Transmission",
    specification: "u_{12} = u_0 + \\beta_r \\cdot (r - 2.5)",
    slope: 0.1520,
    slope_se: 0.0710,
    t_stat: 2.141,
    p_val: 0.043,
    r_squared: 0.170,
    baseline_se: 0.120,
    neutral_rate: 2.5,
    df_resid: 14,
    critical_t: 1.96,
  },
  inflation: {
    name: "Phillips Curve Monetary Transmission (AR-X)",
    specification: "\\pi_{12} = \\alpha + \\beta_\\pi \\cdot \\pi_0 + \\beta_r \\cdot r",
    intercept: 0.9850,
    persistence: 0.6480,
    persistence_se: 0.1420,
    rate_drag: -0.0760,
    rate_drag_se: 0.0840,
    res_std: 1.150,
    df_resid: 13,
    critical_t: 1.96,
  },
  retail: {
    name: "Okun's Law Consumption Relationship (OLS)",
    specification: "g_{retail} = \\beta_0 + \\beta_u \\cdot u_{12}",
    intercept: 9.9077,
    intercept_se: 3.880,
    slope: -1.1000,
    slope_se: 0.6800,
    t_stat: -1.618,
    p_val: 0.128,
    r_squared: 0.1575,
    res_std: 5.1609,
    u_mean: 5.250,
    ss_u: 61.21,
    df_resid: 14,
    critical_t: 1.96,
  },
  recession: {
    name: "Empirical Logit Recession Classifier",
    specification: "z = \\beta_0 + \\beta_r \\cdot r + \\beta_u \\cdot u_{12}; P = 1/(1+e^{-z})",
    intercept: -5.1379,
    intercept_se: 3.560,
    rate_coef: 0.1257,
    rate_se: 0.433,
    unemp_coef: 0.6524,
    unemp_se: 0.464,
    pseudo_r2: 0.1976,
  },
};

/* ============================================================
   PRESET SCENARIOS
   Economic rationale documented in docs/methodology.md
   ============================================================ */

const PRESETS = {
  soft: {
    label:    "Soft Landing",
    fed_rate: 4.0,
    cpi:      2.5,
    unemp:    4.0,
  },
  stag: {
    label:    "Stagflation",
    fed_rate: 6.5,
    cpi:      5.5,
    unemp:    5.5,
  },
  rec: {
    label:    "Recession",
    fed_rate: 2.0,
    cpi:      1.5,
    unemp:    6.5,
  },
};

/* ============================================================
   HISTORICAL FRED DATA
   Annual averages, 2000-2024.
   Sources:
     FEDFUNDS  — Effective Federal Funds Rate
     UNRATE    — Civilian Unemployment Rate
     CPIAUCSL  — CPI All Urban Consumers (YoY % change)
     RSAFS     — Advance Retail Sales (YoY % change)
   ============================================================ */

const HISTORICAL_DATA = [
  { year: 2000, fed_rate: 6.24, unrate: 3.97, cpi_yoy:  3.37, retail_yoy:  7.52 },
  { year: 2001, fed_rate: 3.88, unrate: 4.74, cpi_yoy:  2.83, retail_yoy:  2.11 },
  { year: 2003, fed_rate: 1.13, unrate: 5.99, cpi_yoy:  2.27, retail_yoy:  4.39 },
  { year: 2006, fed_rate: 4.97, unrate: 4.61, cpi_yoy:  3.23, retail_yoy:  6.54 },
  { year: 2007, fed_rate: 5.02, unrate: 4.62, cpi_yoy:  2.85, retail_yoy:  4.18 },
  { year: 2008, fed_rate: 1.92, unrate: 5.80, cpi_yoy:  3.84, retail_yoy: -0.61 },
  { year: 2009, fed_rate: 0.24, unrate: 9.28, cpi_yoy: -0.36, retail_yoy: -6.88 },
  { year: 2010, fed_rate: 0.18, unrate: 9.61, cpi_yoy:  1.64, retail_yoy:  6.81 },
  { year: 2015, fed_rate: 0.13, unrate: 5.28, cpi_yoy:  0.12, retail_yoy:  2.01 },
  { year: 2018, fed_rate: 1.83, unrate: 3.90, cpi_yoy:  2.44, retail_yoy:  5.31 },
  { year: 2019, fed_rate: 2.16, unrate: 3.67, cpi_yoy:  1.81, retail_yoy:  3.79 },
  { year: 2020, fed_rate: 0.36, unrate: 8.05, cpi_yoy:  1.23, retail_yoy: -3.18 },
  { year: 2021, fed_rate: 0.08, unrate: 5.35, cpi_yoy:  4.70, retail_yoy: 17.62 },
  { year: 2022, fed_rate: 1.68, unrate: 3.61, cpi_yoy:  8.00, retail_yoy:  9.04 },
  { year: 2023, fed_rate: 5.03, unrate: 3.62, cpi_yoy:  4.12, retail_yoy:  2.21 },
  { year: 2024, fed_rate: 5.33, unrate: 4.00, cpi_yoy:  2.90, retail_yoy:  2.95 },
];

// Universal Environment Export (Browser + Node.js)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PARAM_BOUNDS,
    OUTPUT_BOUNDS,
    MODEL_CONSTANTS,
    EMPIRICAL_CONSTANTS,
    PRESETS,
    HISTORICAL_DATA,
  };
} else if (typeof window !== "undefined") {
  window.PARAM_BOUNDS = PARAM_BOUNDS;
  window.OUTPUT_BOUNDS = OUTPUT_BOUNDS;
  window.MODEL_CONSTANTS = MODEL_CONSTANTS;
  window.EMPIRICAL_CONSTANTS = EMPIRICAL_CONSTANTS;
  window.PRESETS = PRESETS;
  window.HISTORICAL_DATA = HISTORICAL_DATA;
}
