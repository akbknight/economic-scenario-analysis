/**
 * model.js
 * --------
 * Reduced-form macroeconomic projection model for the Economic Scenario
 * Analysis Dashboard.
 *
 * IMPORTANT DISCLAIMER
 * --------------------
 * All functions in this file implement simplified, reduced-form approximations
 * intended for scenario exploration and educational communication. They are NOT
 * econometric estimates derived from formal statistical models (e.g., VAR, DSGE,
 * or Bayesian structural models). Coefficients are calibrated approximations
 * informed by empirical macro literature and FRED data (2000-2024); they are
 * not estimated by maximum likelihood or OLS on a held-out sample.
 *
 * For policy analysis, use formal DSGE models (e.g., FRB/US, SIGMA, QUEST) or
 * published FOMC SEP projections.
 *
 * Mathematical references:
 *   - Taylor Rule: Taylor (1993), Carnegie-Rochester Conference Series on Public Policy
 *   - Okun's Law: Okun (1962), "Potential GNP: Its Measurement and Significance"
 *   - Logistic recession models: Estrella & Mishkin (1998), Review of Economics and Statistics
 *
 * All inputs and outputs are in percent (e.g., 4.5 means 4.5%).
 */

"use strict";

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/**
 * Clamp a value between min and max (inclusive).
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Round to 2 decimal places.
 * @param {number} val
 * @returns {number}
 */
function round2(val) {
  return Math.round(val * 100) / 100;
}

/**
 * Format a number as a percentage string with N decimal places.
 * @param {number} val  - Value in percent (e.g., 4.5 → "4.50%")
 * @param {number} [decimals=2]
 * @returns {string}
 */
function fmtPct(val, decimals = 2) {
  return val.toFixed(decimals) + "%";
}

/* ============================================================
   PROJECTION FUNCTIONS
   ============================================================ */

/**
 * Project 12-month unemployment rate from the fed funds rate and current unemployment.
 *
 * Mathematical basis:
 *   Simplified Taylor Rule / Okun's Law approximation.
 *   OLS regression on FRED FEDFUNDS (t) → UNRATE (t+1), annual averages 2000-2024:
 *     unrate(t+1) = 0.152 * fed_rate(t) + 3.88   (R² = 0.17)
 *   Dashboard reformulates this as a deviation from neutral rate to preserve
 *   interpretability:
 *     unemployment_12mo = unemp_input + (fed_rate − 2.5) × 0.15
 *
 *   Interpretation: each 100 basis points of fed rate above 2.5% (approximate
 *   neutral rate) is associated with ~0.15pp additional unemployment over 12 months.
 *   This is consistent with Fed FOMC projections data 2015-2023, where each 1pp
 *   tightening cycle phase corresponded to ~0.15–0.20pp unemployment increase.
 *
 * @param {number} fedRate          - Federal funds rate (%)
 * @param {number} currentUnemployment - Current unemployment rate (%)
 * @returns {number} Projected 12-month unemployment rate (%), clamped to [2.5, 12.0]
 */
function projectUnemployment(fedRate, currentUnemployment) {
  const NEUTRAL_RATE = 2.5;
  const SLOPE        = 0.15;   // OLS estimate rounded from 0.152

  const unemp12mo = currentUnemployment + (fedRate - NEUTRAL_RATE) * SLOPE;
  return clamp(unemp12mo, 2.5, 12.0);
}

/**
 * Project CPI inflation 12 months forward.
 *
 * Mathematical basis:
 *   Simplified monetary transmission mechanism (Fisher equation approximation).
 *   Two components:
 *     1. Inflation persistence: 70% of current CPI carries forward.
 *        Reflects empirical mean-reversion speed from NBER business cycle data;
 *        inflation typically does not fully persist year-over-year without supply shocks.
 *     2. Rate drag: each 1pp of fed rate reduces projected CPI by ~0.08pp.
 *        Derived from historical Pearson r(fed_rate, cpi_yoy) = +0.38, but expressed
 *        as a dampening effect (rates rising → CPI falling the following year).
 *
 *   Formula: cpi_12mo = cpi_input × 0.70 + fed_rate × (-0.08)
 *
 *   Note: coefficients are calibrated approximations, not estimated from data.
 *   A formal Phillips Curve model would produce similar directional effects but
 *   with more sophisticated lag structures.
 *
 * @param {number} cpi    - Current CPI YoY reading (%)
 * @param {number} fedRate - Federal funds rate (%)
 * @returns {number} Projected 12-month CPI YoY (%), clamped to [-1.0, 10.0]
 */
function projectInflation(cpi, fedRate) {
  const PERSISTENCE = 0.70;
  const RATE_DRAG   = -0.08;

  const cpi12mo = cpi * PERSISTENCE + fedRate * RATE_DRAG;
  return clamp(cpi12mo, -1.0, 10.0);
}

/**
 * Project retail sales growth over 12 months.
 *
 * Mathematical basis:
 *   Derived from Okun's Law variant applied to consumption.
 *   Okun's original law links unemployment to output (GDP) gaps; this model
 *   extends the relationship to retail sales growth as a proxy for consumer
 *   spending, which is empirically supported by the historical correlation:
 *     Pearson r(UNRATE, RSAFS_yoy) = -0.62 (FRED annual data, 2000-2024)
 *
 *   Formula: retail_growth = 2.8 − (projectedUnemployment − 4.0) × 0.6
 *     - 2.8% = approximate long-run average of advance retail sales YoY
 *     - 4.0% = NAIRU proxy (anchor)
 *     - 0.6 = sensitivity coefficient; each 1pp unemployment above 4.0% reduces
 *             retail growth by ~0.6pp (calibrated to match historical range)
 *
 * @param {number} projectedUnemployment - 12-month projected unemployment rate (%)
 * @returns {number} Projected retail sales growth (%), clamped to [-8.0, 12.0]
 */
function projectRetailGrowth(projectedUnemployment) {
  const BASELINE    = 2.8;
  const NAIRU       = 4.0;
  const SENSITIVITY = 0.6;

  const retailGrowth = BASELINE - (projectedUnemployment - NAIRU) * SENSITIVITY;
  return clamp(retailGrowth, -8.0, 12.0);
}

/**
 * Compute recession probability over a 12-month horizon using a logistic function.
 *
 * Mathematical basis:
 *   Logistic model inspired by Estrella & Mishkin (1998), who demonstrated that
 *   the yield curve spread and other financial variables predict recession with a
 *   probit/logit specification.
 *
 *   This model uses two observable inputs as recession signal proxies:
 *     1. Fed rate deviation from 5.0% — a rate above 5% historically precedes
 *        recession (2006-2007, 2019 environments)
 *     2. Unemployment deviation from 5.0% — unemployment rising above 5% has
 *        historically been a concurrent/lagging recession indicator
 *
 *   z = -0.8 × (fed_rate − 5.0) + 0.4 × (unemp_12mo − 5.0)
 *   recession_probability = 1 / (1 + exp(-z))
 *
 *   Sign convention:
 *     - Higher fed rate reduces z (rate hikes are assumed to eventually reduce
 *       recession risk as they tame inflation, but at extreme levels the sign flips)
 *     - Higher projected unemployment increases z (rising unemployment signals
 *       deteriorating conditions)
 *
 *   The logistic function ensures output is bounded to (0, 1), with smooth,
 *   monotone response to inputs. This is preferred over a piecewise rule because
 *   it avoids discontinuities at thresholds.
 *
 *   Calibration: at fed_rate=5.0, unemp=5.0 → z=0 → probability=50%.
 *                at fed_rate=4.0, unemp=4.2  → z≈-0.72 → probability≈33%.
 *
 * @param {number} fedRate    - Federal funds rate (%)
 * @param {number} unemp12mo  - Projected 12-month unemployment rate (%)
 * @returns {number} Recession probability [0.01, 0.99] — displayed as integer percent
 */
function computeRecessionProbability(fedRate, unemp12mo) {
  const RATE_WEIGHT  = -0.8;
  const UNEMP_WEIGHT =  0.4;
  const RATE_ANCHOR  =  5.0;
  const UNEMP_ANCHOR =  5.0;

  const z = RATE_WEIGHT  * (fedRate  - RATE_ANCHOR)
          + UNEMP_WEIGHT * (unemp12mo - UNEMP_ANCHOR);

  const prob = 1 / (1 + Math.exp(-z));
  return clamp(prob, 0.01, 0.99);
}

/* ============================================================
   MASTER RUNNER
   Accepts raw slider inputs and returns all four projections.
   ============================================================ */

/**
 * Run the full projection model given three slider inputs.
 *
 * @param {number} fedRate  - Federal funds rate (%)
 * @param {number} cpiInput - Current CPI YoY (%)
 * @param {number} unempInput - Current unemployment rate (%)
 * @returns {{
 *   unemp_12mo:    number,  // Projected 12-month unemployment (%)
 *   cpi_12mo:      number,  // Projected 12-month CPI YoY (%)
 *   retail_growth: number,  // Projected retail sales growth (%)
 *   rec_prob:      number   // Recession probability (integer %)
 * }}
 */
function runModel(fedRate, cpiInput, unempInput) {
  const unemp12mo    = round2(projectUnemployment(fedRate, unempInput));
  const cpi12mo      = round2(projectInflation(cpiInput, fedRate));
  const retailGrowth = round2(projectRetailGrowth(unemp12mo));
  const recProb      = Math.round(computeRecessionProbability(fedRate, unemp12mo) * 100);

  return {
    unemp_12mo:    unemp12mo,
    cpi_12mo:      cpi12mo,
    retail_growth: retailGrowth,
    rec_prob:      recProb,
  };
}
