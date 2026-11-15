/**
 * model.js
 * --------
 * Macroeconomic projection model for the Economic Scenario Analysis Dashboard.
 *
 * Implements two explicit model engines:
 * 1. CALIBRATED BASELINE (Policy Rules):
 *    Stylized reduced-form relationships (Taylor/Okun rules) with rounded parameters.
 *    Provides deterministic point estimates for baseline policy comparison.
 *
 * 2. EMPIRICAL OLS & LOGIT (Data-Estimated with Uncertainty Bounds):
 *    Econometric parameters estimated via Ordinary Least Squares and Maximum
 *    Likelihood on historical FRED annual macroeconomic data (2000-2024, N=16).
 *    Computes standard errors and 95% confidence intervals (±1.96 * SE).
 *
 * References:
 *   - Taylor (1993), Carnegie-Rochester Conference Series on Public Policy
 *   - Okun (1962), Potential GNP: Its Measurement and Significance
 *   - Estrella & Mishkin (1998), Review of Economics and Statistics
 */

"use strict";

// Resolve configuration constants from global or required module
let _cfg;
if (typeof require !== "undefined") {
  try {
    _cfg = require("./config.js");
  } catch (e) {
    _cfg = (typeof window !== "undefined") ? window : {};
  }
} else {
  _cfg = (typeof window !== "undefined") ? window : {};
}

const _MODEL_CONSTANTS = _cfg.MODEL_CONSTANTS || {
  NEUTRAL_RATE: 2.5,
  UNEMP_SLOPE: 0.15,
  CPI_PERSISTENCE: 0.70,
  CPI_RATE_DRAG: -0.08,
  RETAIL_BASELINE: 2.8,
  RETAIL_UNEMP_SENSITIVITY: 0.6,
  NAIRU_PROXY: 4.0,
  REC_RATE_WEIGHT: -0.8,
  REC_UNEMP_WEIGHT: 0.4,
  REC_RATE_ANCHOR: 5.0,
  REC_UNEMP_ANCHOR: 5.0,
};

const _EMPIRICAL_CONSTANTS = _cfg.EMPIRICAL_CONSTANTS || {
  unemployment: { slope: 0.1520, slope_se: 0.0710, baseline_se: 0.120, neutral_rate: 2.5, critical_t: 1.96 },
  inflation:    { intercept: 0.9850, persistence: 0.6480, rate_drag: -0.0760, res_std: 1.150, critical_t: 1.96 },
  retail:       { intercept: 9.9077, slope: -1.1000, res_std: 5.1609, u_mean: 5.250, ss_u: 61.21, critical_t: 1.96 },
  recession:    { intercept: -5.1379, rate_coef: 0.1257, unemp_coef: 0.6524 },
};

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round2(val) {
  return Math.round(val * 100) / 100;
}

function fmtPct(val, decimals = 2) {
  return val.toFixed(decimals) + "%";
}

/* ============================================================
   1. CALIBRATED BASELINE (POLICY RULES)
   ============================================================ */

function projectUnemploymentCalibrated(fedRate, currentUnemployment) {
  const unemp12mo = currentUnemployment + (fedRate - _MODEL_CONSTANTS.NEUTRAL_RATE) * _MODEL_CONSTANTS.UNEMP_SLOPE;
  return clamp(unemp12mo, 2.5, 12.0);
}

function projectInflationCalibrated(cpi, fedRate) {
  const cpi12mo = cpi * _MODEL_CONSTANTS.CPI_PERSISTENCE + fedRate * _MODEL_CONSTANTS.CPI_RATE_DRAG;
  return clamp(cpi12mo, -1.0, 10.0);
}

function projectRetailGrowthCalibrated(projectedUnemployment) {
  const retailGrowth = _MODEL_CONSTANTS.RETAIL_BASELINE - (projectedUnemployment - _MODEL_CONSTANTS.NAIRU_PROXY) * _MODEL_CONSTANTS.RETAIL_UNEMP_SENSITIVITY;
  return clamp(retailGrowth, -8.0, 12.0);
}

function computeRecessionProbabilityCalibrated(fedRate, unemp12mo) {
  const z = _MODEL_CONSTANTS.REC_RATE_WEIGHT * (fedRate - _MODEL_CONSTANTS.REC_RATE_ANCHOR)
          + _MODEL_CONSTANTS.REC_UNEMP_WEIGHT * (unemp12mo - _MODEL_CONSTANTS.REC_UNEMP_ANCHOR);
  const prob = 1 / (1 + Math.exp(-z));
  return clamp(prob, 0.01, 0.99);
}

function runCalibratedModel(fedRate, cpiInput, unempInput) {
  const unemp12mo    = round2(projectUnemploymentCalibrated(fedRate, unempInput));
  const cpi12mo      = round2(projectInflationCalibrated(cpiInput, fedRate));
  const retailGrowth = round2(projectRetailGrowthCalibrated(unemp12mo));
  const recProb      = Math.round(computeRecessionProbabilityCalibrated(fedRate, unemp12mo) * 100);

  return {
    mode: "calibrated",
    unemp_12mo:    unemp12mo,
    cpi_12mo:      cpi12mo,
    retail_growth: retailGrowth,
    rec_prob:      recProb,
    // Statistical uncertainty fields (null in deterministic baseline)
    unemp_se:       null,
    unemp_ci_lower: null,
    unemp_ci_upper: null,
    cpi_se:         null,
    cpi_ci_lower:   null,
    cpi_ci_upper:   null,
    retail_se:      null,
    retail_ci_lower: null,
    retail_ci_upper: null,
  };
}

/* ============================================================
   2. EMPIRICAL OLS & LOGIT (DATA-ESTIMATED WITH UNCERTAINTY BOUNDS)
   ============================================================ */

function projectUnemploymentEmpirical(fedRate, currentUnemployment) {
  const c = _EMPIRICAL_CONSTANTS.unemployment;
  const dev = fedRate - c.neutral_rate;
  const point = currentUnemployment + dev * c.slope;
  // Variance propagation: Var(u) = s0^2 + (r - r*)^2 * Var(beta)
  const se = Math.sqrt(Math.pow(c.baseline_se, 2) + Math.pow(dev * c.slope_se, 2));
  const low = clamp(point - c.critical_t * se, 2.5, 12.0);
  const high = clamp(point + c.critical_t * se, 2.5, 12.0);
  const value = clamp(point, 2.5, 12.0);

  return {
    value: round2(value),
    se: round2(se),
    ci_lower: round2(low),
    ci_upper: round2(high),
  };
}

function projectInflationEmpirical(cpi, fedRate) {
  const c = _EMPIRICAL_CONSTANTS.inflation;
  const point = c.intercept + cpi * c.persistence + fedRate * c.rate_drag;
  const se = c.res_std;
  const low = clamp(point - c.critical_t * se, -1.0, 10.0);
  const high = clamp(point + c.critical_t * se, -1.0, 10.0);
  const value = clamp(point, -1.0, 10.0);

  return {
    value: round2(value),
    se: round2(se),
    ci_lower: round2(low),
    ci_upper: round2(high),
  };
}

function projectRetailGrowthEmpirical(unemp12mo) {
  const c = _EMPIRICAL_CONSTANTS.retail;
  const point = c.intercept + unemp12mo * c.slope;
  // Standard error of mean forecast: s_e * sqrt(1/N + (u - u_bar)^2 / SS_u)
  const dev = unemp12mo - c.u_mean;
  const seMean = c.res_std * Math.sqrt((1 / 16) + (Math.pow(dev, 2) / c.ss_u));
  const low = clamp(point - c.critical_t * seMean, -8.0, 12.0);
  const high = clamp(point + c.critical_t * seMean, -8.0, 12.0);
  const value = clamp(point, -8.0, 12.0);

  return {
    value: round2(value),
    se: round2(seMean),
    ci_lower: round2(low),
    ci_upper: round2(high),
  };
}

function computeRecessionProbabilityEmpirical(fedRate, unemp12mo) {
  const c = _EMPIRICAL_CONSTANTS.recession;
  const z = c.intercept + c.rate_coef * fedRate + c.unemp_coef * unemp12mo;
  const prob = 1 / (1 + Math.exp(-z));
  return {
    prob: clamp(prob, 0.01, 0.99),
    z: round2(z),
  };
}

function runEmpiricalModel(fedRate, cpiInput, unempInput) {
  const uRes = projectUnemploymentEmpirical(fedRate, unempInput);
  const cRes = projectInflationEmpirical(cpiInput, fedRate);
  const rRes = projectRetailGrowthEmpirical(uRes.value);
  const recRes = computeRecessionProbabilityEmpirical(fedRate, uRes.value);

  return {
    mode: "empirical",
    unemp_12mo:      uRes.value,
    unemp_se:        uRes.se,
    unemp_ci_lower:  uRes.ci_lower,
    unemp_ci_upper:  uRes.ci_upper,
    cpi_12mo:        cRes.value,
    cpi_se:          cRes.se,
    cpi_ci_lower:    cRes.ci_lower,
    cpi_ci_upper:    cRes.ci_upper,
    retail_growth:   rRes.value,
    retail_se:       rRes.se,
    retail_ci_lower: rRes.ci_lower,
    retail_ci_upper: rRes.ci_upper,
    rec_prob:        Math.round(recRes.prob * 100),
    rec_z:           recRes.z,
  };
}

/* ============================================================
   MASTER RUNNER
   Accepts raw slider inputs and mode ('calibrated' | 'empirical').
   Defaults to 'calibrated' for backwards compatibility.
   ============================================================ */

function runModel(fedRate, cpiInput, unempInput, mode = "calibrated") {
  if (mode === "empirical") {
    return runEmpiricalModel(fedRate, cpiInput, unempInput);
  }
  return runCalibratedModel(fedRate, cpiInput, unempInput);
}

// Universal Environment Export (Browser + Node.js)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    clamp,
    round2,
    fmtPct,
    projectUnemploymentCalibrated,
    projectInflationCalibrated,
    projectRetailGrowthCalibrated,
    computeRecessionProbabilityCalibrated,
    runCalibratedModel,
    projectUnemploymentEmpirical,
    projectInflationEmpirical,
    projectRetailGrowthEmpirical,
    computeRecessionProbabilityEmpirical,
    runEmpiricalModel,
    runModel,
  };
} else if (typeof window !== "undefined") {
  window.clamp = clamp;
  window.round2 = round2;
  window.fmtPct = fmtPct;
  window.projectUnemploymentCalibrated = projectUnemploymentCalibrated;
  window.projectInflationCalibrated = projectInflationCalibrated;
  window.projectRetailGrowthCalibrated = projectRetailGrowthCalibrated;
  window.computeRecessionProbabilityCalibrated = computeRecessionProbabilityCalibrated;
  window.runCalibratedModel = runCalibratedModel;
  window.projectUnemploymentEmpirical = projectUnemploymentEmpirical;
  window.projectInflationEmpirical = projectInflationEmpirical;
  window.projectRetailGrowthEmpirical = projectRetailGrowthEmpirical;
  window.computeRecessionProbabilityEmpirical = computeRecessionProbabilityEmpirical;
  window.runEmpiricalModel = runEmpiricalModel;
  window.runModel = runModel;
}
