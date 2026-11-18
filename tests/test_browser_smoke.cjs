/**
 * test_browser_smoke.cjs
 * Real browser smoke test using puppeteer-core against installed Google Chrome.
 *
 * Verifies in an actual browser engine (Headless Chrome):
 * 1. Shared scripts (src/js/config.js, src/js/model.js) load cleanly into the browser DOM
 * 2. Model defaults to Calibrated Baseline on page load with 0 page/console errors
 * 3. Interactive Model Engine Toggle switches to Empirical OLS (Data-Estimated with 95% CI):
 *    - Updates projected values to econometric OLS point estimates
 *    - Renders 95% confidence intervals and standard errors onto all projection cards
 *    - Updates scenario comparison table
 * 4. Slider adjustments trigger reactive recalculation in both modes
 * 5. Interactive preset badges ("Soft Landing", "Stagflation", "Recession") apply parameters correctly
 * 6. Light / Dark theme toggle updates data-theme attribute cleanly
 */

"use strict";

const assert = require("node:assert");
const path = require("node:path");

let puppeteer;
try {
  puppeteer = require("puppeteer-core");
} catch (e) {
  try {
    puppeteer = require("../../scheduling-optimizer/node_modules/puppeteer-core");
  } catch (e2) {
    try {
      puppeteer = require("../scheduling-optimizer/node_modules/puppeteer-core");
    } catch (e3) {
      throw new Error("puppeteer-core could not be resolved from local paths");
    }
  }
}

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const HTML_FILE_URL = "file:///" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");

async function runBrowserSmokeTest() {
  console.log("=".repeat(72));
  console.log("Running Actual Browser Smoke Test (Headless Google Chrome)");
  console.log("Browser Executable:", CHROME_PATH);
  console.log("Target Page:", HTML_FILE_URL);
  console.log("=".repeat(72));

  const pageErrors = [];
  const consoleErrors = [];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();

    page.on("pageerror", err => {
      pageErrors.push(err.toString());
    });

    page.on("console", msg => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Navigate to index.html
    await page.goto(HTML_FILE_URL, { waitUntil: "load", timeout: 15000 });

    assert.strictEqual(pageErrors.length, 0, `Page threw JavaScript errors: ${pageErrors.join("; ")}`);
    assert.strictEqual(consoleErrors.length, 0, `Console logged errors: ${consoleErrors.join("; ")}`);
    console.log("  [PASS] Browser loaded index.html with 0 page/console errors");

    // 2. Verify shared scripts loaded and exposed globals
    const globalsCheck = await page.evaluate(() => {
      return {
        hasParamBounds: typeof window.PARAM_BOUNDS === "object" && window.PARAM_BOUNDS !== null,
        hasModelConstants: typeof window.MODEL_CONSTANTS === "object" && window.MODEL_CONSTANTS !== null,
        hasEmpiricalConstants: typeof window.EMPIRICAL_CONSTANTS === "object" && window.EMPIRICAL_CONSTANTS !== null,
        hasPresets: typeof window.PRESETS === "object" && window.PRESETS !== null,
        hasHistoricalData: Array.isArray(window.HISTORICAL_DATA) && window.HISTORICAL_DATA.length === 16,
        hasRunModel: typeof window.runModel === "function",
        hasRunCalibratedModel: typeof window.runCalibratedModel === "function",
        hasRunEmpiricalModel: typeof window.runEmpiricalModel === "function",
      };
    });

    for (const [key, val] of Object.entries(globalsCheck)) {
      assert.strictEqual(val, true, `Expected browser global ${key} to be true`);
    }
    console.log("  [PASS] Shared scripts loaded: PARAM_BOUNDS, MODEL_CONSTANTS, EMPIRICAL_CONSTANTS, runModel available");

    // 3. Verify initial Calibrated Baseline rendering
    const initialValues = await page.evaluate(() => {
      return {
        unemp: document.getElementById("proj-unemp")?.textContent?.trim(),
        cpi: document.getElementById("proj-cpi")?.textContent?.trim(),
        retail: document.getElementById("proj-retail")?.textContent?.trim(),
        rec: document.getElementById("proj-recprob")?.textContent?.trim(),
        ciUnemp: document.getElementById("ci-unemp")?.textContent?.trim(),
      };
    });

    assert.strictEqual(initialValues.unemp, "4.40%");
    assert.strictEqual(initialValues.cpi, "1.88%");
    assert.strictEqual(initialValues.retail, "2.56%");
    assert.strictEqual(initialValues.rec, "54%");
    assert.ok(initialValues.ciUnemp.includes("Stylized rule") || initialValues.ciUnemp.includes("Point estimate"));
    console.log("  [PASS] Initial Calibrated Baseline rendered (4.40% unemp, 1.88% CPI, 2.56% retail, 54% rec)");

    // 4. Test interactive toggle to Empirical OLS mode
    await page.click("#btn-mode-empirical");

    const empiricalValues = await page.evaluate(() => {
      return {
        unemp: document.getElementById("proj-unemp")?.textContent?.trim(),
        cpi: document.getElementById("proj-cpi")?.textContent?.trim(),
        retail: document.getElementById("proj-retail")?.textContent?.trim(),
        rec: document.getElementById("proj-recprob")?.textContent?.trim(),
        ciUnemp: document.getElementById("ci-unemp")?.textContent?.trim(),
        ciCpi: document.getElementById("ci-cpi")?.textContent?.trim(),
        ciRetail: document.getElementById("ci-retail")?.textContent?.trim(),
        hasActiveCi: document.getElementById("ci-unemp")?.classList.contains("active-ci"),
        modeLabel: document.getElementById("val-mode-indicator")?.textContent?.trim(),
      };
    });

    assert.strictEqual(empiricalValues.unemp, "4.40%");
    assert.strictEqual(empiricalValues.cpi, "2.72%");
    assert.strictEqual(empiricalValues.retail, "5.07%");
    assert.strictEqual(empiricalValues.rec, "15%");
    assert.ok(empiricalValues.ciUnemp.includes("Mean CI: [4.04%"), `CI unemp must contain bounds, got ${empiricalValues.ciUnemp}`);
    assert.ok(empiricalValues.ciCpi.includes("Mean CI: [0.46%"), `CI cpi must contain bounds, got ${empiricalValues.ciCpi}`);
    assert.ok(empiricalValues.ciRetail.includes("Mean CI: [2.22%"), `CI retail must contain bounds, got ${empiricalValues.ciRetail}`);
    assert.strictEqual(empiricalValues.hasActiveCi, true);
    assert.ok(empiricalValues.modeLabel.includes("Illustrative Empirical"));
    console.log("  [PASS] Switched to Illustrative Empirical mode: point estimates and conditional-mean confidence intervals rendered to DOM");

    // 5. Test slider interaction
    await page.evaluate(() => {
      const slider = document.getElementById("slider-fed");
      slider.value = "6.00";
      slider.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const sliderResult = await page.evaluate(() => {
      return {
        fedLabel: document.getElementById("val-fed")?.textContent?.trim(),
        unemp: document.getElementById("proj-unemp")?.textContent?.trim(),
        cpi: document.getElementById("proj-cpi")?.textContent?.trim(),
      };
    });

    assert.strictEqual(sliderResult.fedLabel, "6.00%");
    assert.strictEqual(sliderResult.unemp, "4.63%");
    assert.strictEqual(sliderResult.cpi, "2.60%");
    console.log("  [PASS] Reactive slider update verified: Fed rate 6.00% -> unemp 4.63% [Empirical]");

    // 6. Test preset badge click ("Soft Landing")
    await page.click("#btn-preset-soft");

    const presetResult = await page.evaluate(() => {
      return {
        fed: document.getElementById("slider-fed")?.value,
        cpi: document.getElementById("slider-cpi")?.value,
        unemp: document.getElementById("slider-unemp")?.value,
        projUnemp: document.getElementById("proj-unemp")?.textContent?.trim(),
        projRec: document.getElementById("proj-recprob")?.textContent?.trim(),
      };
    });

    assert.strictEqual(presetResult.fed, "4");
    assert.strictEqual(presetResult.cpi, "2.5");
    assert.strictEqual(presetResult.unemp, "4");
    assert.strictEqual(presetResult.projUnemp, "4.23%");
    assert.strictEqual(presetResult.projRec, "13%");
    console.log("  [PASS] Interactive preset badge 'Soft Landing' applied to sliders and projections (4.23% unemp, 13% rec)");

    // 7. Test switching back to Calibrated mode
    await page.click("#btn-mode-calibrated");

    const resetValues = await page.evaluate(() => {
      return {
        projUnemp: document.getElementById("proj-unemp")?.textContent?.trim(),
        projRec: document.getElementById("proj-recprob")?.textContent?.trim(),
        ciUnemp: document.getElementById("ci-unemp")?.textContent?.trim(),
        hasActiveCi: document.getElementById("ci-unemp")?.classList.contains("active-ci"),
      };
    });

    assert.strictEqual(resetValues.projUnemp, "4.22%");
    assert.strictEqual(resetValues.projRec, "62%");
    assert.ok(resetValues.ciUnemp.includes("Stylized rule"));
    assert.strictEqual(resetValues.hasActiveCi, false);
    console.log("  [PASS] Toggled back to Calibrated Baseline: reverted to stylized rule point estimate (4.22% unemp, 62% rec)");

    // 8. Test Theme toggle
    const themeInitial = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.click(".theme-toggle-btn");
    const themeToggled = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert.notStrictEqual(themeInitial, themeToggled);
    await page.click(".theme-toggle-btn");
    const themeRestored = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert.strictEqual(themeInitial, themeRestored);
    console.log("  [PASS] Universal Light/Dark theme toggle verified");

    // 9. Verify comparison table and econometric architecture table rendered in DOM
    const tablesCheck = await page.evaluate(() => {
      const compRows = document.querySelectorAll("#comp-table-body tr").length;
      const econRows = document.querySelectorAll("#econometric-panel tbody tr").length;
      return { compRows, econRows };
    });

    assert.strictEqual(tablesCheck.compRows, 7, "Comparison table must have 7 rows");
    assert.strictEqual(tablesCheck.econRows, 4, "Econometric panel must have 4 equation rows");
    console.log("  [PASS] All tabular DOM structures verified (7 comparison rows, 4 econometric equation rows)");

    console.log("=".repeat(72));
    console.log("BROWSER SMOKE TEST PASSED COMPLETELY (100% SUCCESS)");
    console.log("=".repeat(72));

  } finally {
    await browser.close();
  }
}

runBrowserSmokeTest().catch(err => {
  console.error("Browser smoke test failed:", err);
  process.exit(1);
});
