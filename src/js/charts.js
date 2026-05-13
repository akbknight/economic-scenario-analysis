/**
 * charts.js
 * ---------
 * Chart.js initialization and configuration for the Economic Scenario
 * Analysis Dashboard.
 *
 * This module contains the extracted chart-building logic from index.html.
 * The production dashboard embeds the equivalent code directly in index.html
 * for single-file deployment; this file is the documented, standalone version.
 *
 * Requires:
 *   - Chart.js 4.4.4 (loaded via CDN in index.html)
 *   - config.js (HISTORICAL_DATA constant)
 *   - A <canvas id="hist-chart"> element in the DOM
 */

"use strict";

/* ============================================================
   CHART THEME TOKENS
   Mirrors the CSS custom properties in index.html
   ============================================================ */

const CHART_COLORS = {
  amber:      "#E8A020",
  amberFill:  "rgba(232,160,32,0.08)",
  blue:       "#60a5fa",
  blueFill:   "rgba(96,165,250,0.08)",
  gridLine:   "rgba(255,255,255,0.04)",
  tickColor:  "#555555",
  surface2:   "#1a1a1a",
  border2:    "#2a2a2a",
  textMuted:  "#888888",
  text:       "#e8e8e8",
};

/* ============================================================
   HISTORICAL CONTEXT CHART
   Line chart: Fed Funds Rate + Unemployment Rate, 2000-2024
   ============================================================ */

/**
 * Initialize the historical context Chart.js line chart.
 *
 * Data source: HISTORICAL_DATA constant (config.js / index.html).
 * Chart type: line with smooth tension (tension: 0.35).
 * Two series:
 *   1. Fed Funds Rate (amber) — FEDFUNDS annual average
 *   2. Unemployment Rate (blue) — UNRATE annual average
 *
 * Y-axis is fixed to [-1, 11] to accommodate the 2009 recession spike
 * (UNRATE 9.61%) while keeping scale stable across scenario changes.
 *
 * Interaction mode "index" with intersect=false enables column-level
 * tooltips (showing both series values for a given year on hover).
 *
 * @param {Array<{year: number, fed_rate: number, unrate: number}>} historicalData
 *   - Array of annual data points (from HISTORICAL_DATA in config.js)
 * @returns {Chart} Chart.js instance (can be used to call .update() or .destroy())
 */
function buildHistoricalChart(historicalData) {
  const labels  = historicalData.map(d => String(d.year));
  const fedData = historicalData.map(d => d.fed_rate);
  const unrData = historicalData.map(d => d.unrate);

  const ctx = document.getElementById("hist-chart").getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label:              "Fed Funds Rate (%)",
          data:               fedData,
          borderColor:        CHART_COLORS.amber,
          backgroundColor:    CHART_COLORS.amberFill,
          pointBackgroundColor: CHART_COLORS.amber,
          pointRadius:        4,
          pointHoverRadius:   6,
          tension:            0.35,
          fill:               false,
          borderWidth:        2,
        },
        {
          label:              "Unemployment Rate (%)",
          data:               unrData,
          borderColor:        CHART_COLORS.blue,
          backgroundColor:    CHART_COLORS.blueFill,
          pointBackgroundColor: CHART_COLORS.blue,
          pointRadius:        4,
          pointHoverRadius:   6,
          tension:            0.35,
          fill:               false,
          borderWidth:        2,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: {
        mode:      "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART_COLORS.surface2,
          borderColor:     CHART_COLORS.border2,
          borderWidth:     1,
          titleColor:      CHART_COLORS.textMuted,
          bodyColor:       CHART_COLORS.text,
          padding:         12,
          callbacks: {
            label: function (ctx) {
              return " " + ctx.dataset.label + ": " + ctx.parsed.y.toFixed(2) + "%";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color:      CHART_COLORS.gridLine,
            drawBorder: false,
          },
          ticks: {
            color: CHART_COLORS.tickColor,
            font:  { family: "'IBM Plex Mono', monospace", size: 10 },
            maxRotation: 45,
          },
        },
        y: {
          min: -1,
          max: 11,
          grid: {
            color:      CHART_COLORS.gridLine,
            drawBorder: false,
          },
          ticks: {
            color:    CHART_COLORS.tickColor,
            font:     { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: val => val + "%",
          },
        },
      },
    },
  });
}
