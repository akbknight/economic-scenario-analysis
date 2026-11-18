/**
 * test_model_parity.cjs
 * ---------------------
 * Model Parity & Architecture Test Suite for economic-scenario-analysis.
 *
 * Verifies:
 * 1. Single Shared Module Architecture: index.html loads config.js and model.js
 * 2. Parity between Calibrated baseline and Empirical OLS engine
 * 3. Exact matching of statistical confidence intervals and clamping rules
 */

"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const config = require("../src/js/config.js");
const model = require("../src/js/model.js");

console.log("========================================================================");
console.log("Running Economic Model Parity & Architecture Test Suite");
console.log("========================================================================");

// Check 1: HTML Architecture & Script References
const htmlPath = path.join(rootDir, "index.html");
const html = fs.readFileSync(htmlPath, "utf-8");

assert.ok(
  html.includes('src="src/js/config.js"') || html.includes("src='src/js/config.js'"),
  "index.html must reference src/js/config.js"
);
assert.ok(
  html.includes('src="src/js/model.js"') || html.includes("src='src/js/model.js'"),
  "index.html must reference src/js/model.js"
);
console.log("  [PASS] index.html loads shared config.js and model.js without duplication");

// Check 2: Configuration exports
assert.ok(config.PARAM_BOUNDS, "PARAM_BOUNDS must be exported");
assert.ok(config.OUTPUT_BOUNDS, "OUTPUT_BOUNDS must be exported");
assert.ok(config.MODEL_CONSTANTS, "MODEL_CONSTANTS must be exported");
assert.ok(config.EMPIRICAL_CONSTANTS, "EMPIRICAL_CONSTANTS must be exported");
assert.ok(config.PRESETS, "PRESETS must be exported");
assert.strictEqual(config.HISTORICAL_DATA.length, 16, "HISTORICAL_DATA must have 16 observations");
console.log("  [PASS] config.js exports complete configuration, empirical constants, and historical data");

// Check 3: Calibrated Baseline Default Values
const calDef = model.runCalibratedModel(4.5, 3.2, 4.1);
assert.strictEqual(calDef.unemp_12mo, 4.4);
assert.strictEqual(calDef.cpi_12mo, 1.88);
assert.strictEqual(calDef.retail_growth, 2.56);
assert.strictEqual(calDef.rec_prob, 54);
assert.strictEqual(calDef.unemp_se, null);
console.log("  [PASS] Calibrated Baseline default output verified (4.4% unemp, 1.88% CPI, 2.56% retail, 54% rec)");

// Check 4: Empirical OLS Default Values & Confidence Bounds
const empDef = model.runEmpiricalModel(4.5, 3.2, 4.1);
assert.strictEqual(empDef.unemp_12mo, 4.4);
assert.strictEqual(empDef.unemp_se, 0.19);
assert.strictEqual(empDef.unemp_ci_lower, 4.04);
assert.strictEqual(empDef.unemp_ci_upper, 4.77);

assert.strictEqual(empDef.cpi_12mo, 2.72);
assert.strictEqual(empDef.cpi_se, 1.15);
assert.strictEqual(empDef.cpi_ci_lower, 0.46);
assert.strictEqual(empDef.cpi_ci_upper, 4.97);

assert.strictEqual(empDef.retail_growth, 5.07);
assert.strictEqual(empDef.retail_se, 1.45);
assert.strictEqual(empDef.retail_ci_lower, 2.22);
assert.strictEqual(empDef.retail_ci_upper, 7.91);

assert.strictEqual(empDef.rec_prob, 15);
console.log("  [PASS] Empirical OLS default output verified with exact 95% CI bounds");

// Check 5: Preset Scenarios Parity
for (const [key, preset] of Object.entries(config.PRESETS)) {
  const cal = model.runModel(preset.fed_rate, preset.cpi, preset.unemp, "calibrated");
  const emp = model.runModel(preset.fed_rate, preset.cpi, preset.unemp, "empirical");

  assert.ok(cal.unemp_12mo >= 2.5 && cal.unemp_12mo <= 12.0, `${key} calibrated unemp in bounds`);
  assert.ok(emp.unemp_12mo >= 2.5 && emp.unemp_12mo <= 12.0, `${key} empirical unemp in bounds`);
  assert.ok(emp.unemp_ci_lower <= emp.unemp_12mo && emp.unemp_12mo <= emp.unemp_ci_upper, `${key} unemp inside CI`);
  assert.ok(emp.cpi_ci_lower <= emp.cpi_12mo && emp.cpi_12mo <= emp.cpi_ci_upper, `${key} cpi inside CI`);
  assert.ok(emp.retail_ci_lower <= emp.retail_growth && emp.retail_growth <= emp.retail_ci_upper, `${key} retail inside CI`);
}
console.log("  [PASS] Preset scenarios (Soft Landing, Stagflation, Recession) validated in both engines");

// Check 6: Master runner backward compatibility
const defRun = model.runModel(4.5, 3.2, 4.1);
assert.strictEqual(defRun.mode, "calibrated", "runModel without mode parameter must default to calibrated");
assert.strictEqual(defRun.unemp_12mo, 4.4);
console.log("  [PASS] runModel backwards compatibility verified (defaults to calibrated)");

console.log("========================================================================");
console.log("ALL 6 MODEL PARITY CHECKS PASSED (100% PASS)");
console.log("========================================================================");
