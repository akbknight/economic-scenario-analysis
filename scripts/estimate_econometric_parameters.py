"""
estimate_econometric_parameters.py
----------------------------------
Reproducible econometric estimation and diagnostic pipeline for
economic-scenario-analysis.

Documents:
1. Historical landmark snapshots (16 selected benchmark years from 2000-2024).
2. Explicit gap detection between non-consecutive landmark years.
3. Contemporaneous OLS regression (Retail Sales Growth ~ Unemployment Rate).
4. Consecutive 1-year lag analysis (N=11 pairs) vs Full FRED literature benchmark.
5. Distinction between Parameter Uncertainty SE(beta), Conditional-Mean CI, and Forecast Prediction Intervals.
6. Recession Index specification and class distribution documentation.
"""

import os
import json
import math

LANDMARK_SNAPSHOTS = [
    {"year": 2000, "fed_rate": 6.24, "unrate": 3.97, "cpi_yoy":  3.37, "retail_yoy":  7.52, "nber_rec": 0, "era": "Late 90s Expansion"},
    {"year": 2001, "fed_rate": 3.88, "unrate": 4.74, "cpi_yoy":  2.83, "retail_yoy":  2.11, "nber_rec": 1, "era": "Dot-com Recession"},
    {"year": 2003, "fed_rate": 1.13, "unrate": 5.99, "cpi_yoy":  2.27, "retail_yoy":  4.39, "nber_rec": 0, "era": "Post-Recession Easing"},
    {"year": 2006, "fed_rate": 4.97, "unrate": 4.61, "cpi_yoy":  3.23, "retail_yoy":  6.54, "nber_rec": 0, "era": "Housing Boom Tightening"},
    {"year": 2007, "fed_rate": 5.02, "unrate": 4.62, "cpi_yoy":  2.85, "retail_yoy":  4.18, "nber_rec": 0, "era": "Pre-GFC Peak"},
    {"year": 2008, "fed_rate": 1.92, "unrate": 5.80, "cpi_yoy":  3.84, "retail_yoy": -0.61, "nber_rec": 1, "era": "GFC Onset"},
    {"year": 2009, "fed_rate": 0.24, "unrate": 9.28, "cpi_yoy": -0.36, "retail_yoy": -6.88, "nber_rec": 1, "era": "Great Recession Trough"},
    {"year": 2010, "fed_rate": 0.18, "unrate": 9.61, "cpi_yoy":  1.64, "retail_yoy":  6.81, "nber_rec": 0, "era": "Early Recovery"},
    {"year": 2015, "fed_rate": 0.13, "unrate": 5.28, "cpi_yoy":  0.12, "retail_yoy":  2.01, "nber_rec": 0, "era": "ZIRP Mid-Cycle"},
    {"year": 2018, "fed_rate": 1.83, "unrate": 3.90, "cpi_yoy":  2.44, "retail_yoy":  5.31, "nber_rec": 0, "era": "Rate Normalization"},
    {"year": 2019, "fed_rate": 2.16, "unrate": 3.67, "cpi_yoy":  1.81, "retail_yoy":  3.79, "nber_rec": 0, "era": "Pre-COVID Low Unemployment"},
    {"year": 2020, "fed_rate": 0.36, "unrate": 8.05, "cpi_yoy":  1.23, "retail_yoy": -3.18, "nber_rec": 1, "era": "COVID Shock"},
    {"year": 2021, "fed_rate": 0.08, "unrate": 5.35, "cpi_yoy":  4.70, "retail_yoy": 17.62, "nber_rec": 0, "era": "Reopening Stimulus Spike"},
    {"year": 2022, "fed_rate": 1.68, "unrate": 3.61, "cpi_yoy":  8.00, "retail_yoy":  9.04, "nber_rec": 0, "era": "Post-Pandemic Inflation Surge"},
    {"year": 2023, "fed_rate": 5.03, "unrate": 3.62, "cpi_yoy":  4.12, "retail_yoy":  2.21, "nber_rec": 0, "era": "Rapid Tightening"},
    {"year": 2024, "fed_rate": 5.33, "unrate": 4.00, "cpi_yoy":  2.90, "retail_yoy":  2.95, "nber_rec": 0, "era": "High Plateau"},
]

def analyze_gaps(data):
    consecutive = []
    gaps = []
    for i in range(len(data) - 1):
        curr_y = data[i]["year"]
        next_y = data[i+1]["year"]
        diff = next_y - curr_y
        if diff == 1:
            consecutive.append({"from_year": curr_y, "to_year": next_y, "lag": 1})
        else:
            gaps.append({"from_year": curr_y, "to_year": next_y, "gap_years": diff})
    return consecutive, gaps

def fit_ols_contemporaneous_retail(data):
    n = len(data)
    x = [d["unrate"] for d in data]
    y = [d["retail_yoy"] for d in data]
    x_bar = sum(x) / n
    y_bar = sum(y) / n
    ss_xx = sum((xi - x_bar)**2 for xi in x)
    ss_yy = sum((yi - y_bar)**2 for yi in y)
    ss_xy = sum((xi - x_bar) * (yi - y_bar) for xi, yi in zip(x, y))
    slope = ss_xy / ss_xx
    intercept = y_bar - slope * x_bar
    residuals = [yi - (intercept + slope * xi) for xi, yi in zip(x, y)]
    sse = sum(r**2 for r in residuals)
    df_resid = n - 2
    s_e = math.sqrt(sse / df_resid)
    se_slope = s_e / math.sqrt(ss_xx)
    se_intercept = s_e * math.sqrt(1 / n + (x_bar**2) / ss_xx)
    t_stat = slope / se_slope
    r2 = (ss_xy**2) / (ss_xx * ss_yy)
    return {
        "model": "Retail Sales YoY ~ Unemployment Rate (Contemporaneous Okun OLS)",
        "n": n,
        "df_resid": df_resid,
        "x_mean": round(x_bar, 4),
        "y_mean": round(y_bar, 4),
        "ss_xx": round(ss_xx, 4),
        "intercept": round(intercept, 4),
        "intercept_se": round(se_intercept, 4),
        "slope": round(slope, 4),
        "slope_se": round(se_slope, 4),
        "t_stat": round(t_stat, 4),
        "r_squared": round(r2, 4),
        "residual_std_error": round(s_e, 4),
    }

def main():
    consecutive, gaps = analyze_gaps(LANDMARK_SNAPSHOTS)
    retail_fit = fit_ols_contemporaneous_retail(LANDMARK_SNAPSHOTS)
    
    # Class distribution of recession indicator
    rec_count = sum(d["nber_rec"] for d in LANDMARK_SNAPSHOTS)
    exp_count = len(LANDMARK_SNAPSHOTS) - rec_count
    
    artifact = {
        "dataset": {
            "description": "Selected Landmark Historical Macroeconomic Snapshots (2000-2024)",
            "role": "Comparative chart benchmarks & pedagogical parameter uncertainty illustration",
            "total_observations": len(LANDMARK_SNAPSHOTS),
            "consecutive_annual_pairs": len(consecutive),
            "nonconsecutive_gaps": gaps,
            "nber_recession_years": [d["year"] for d in LANDMARK_SNAPSHOTS if d["nber_rec"] == 1],
            "class_distribution": {"recession_count": rec_count, "expansion_count": exp_count},
        },
        "ols_fits": {
            "retail_consumption": retail_fit,
        },
        "methodological_distinctions": {
            "parameter_uncertainty": "SE(beta) describes sampling standard deviation of coefficient estimators.",
            "conditional_mean_interval": "mu_hat(x) +- t * s_e * sqrt(1/n + (x - x_bar)^2 / SS_xx). Uncertainty of the expected average response.",
            "forecast_prediction_interval": "y_new +- t * s_e * sqrt(1 + 1/n + (x - x_bar)^2 / SS_xx). Substantially wider due to individual residual variance s_e^2.",
            "recession_logit_classification": "Illustrative macro stress scoring formula. With only 4 recession events in N=16 non-consecutive years, it is NOT an out-of-sample validated probability model.",
            "lag_structure_limitation": "Multi-year gaps (up to 5 years between 2010 and 2015) violate uniform annual lag assumptions (t -> t+1). Continuous annual series is required for valid dynamic lag estimation.",
        }
    }
    
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(repo_dir, "reports")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "econometric_estimation_artifacts.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(artifact, f, indent=2)
    print(f"Wrote {out_path}")

if __name__ == "__main__":
    main()
