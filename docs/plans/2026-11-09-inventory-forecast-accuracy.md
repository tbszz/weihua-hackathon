# Inventory Forecast Accuracy Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reproducible inventory-demand forecasting and safety-stock evaluation pipeline, then select the best model by time-based backtesting to improve stockout prediction accuracy.

**Architecture:** Copy the two supplied workbooks into a project-local raw-data area, normalize issue/receipt transactions into one daily demand table, and evaluate candidate forecasters using rolling-origin backtests. Feed the selected forecast and empirical lead-time distribution into a transparent safety-stock calculator and export metrics, predictions, risk dates, and a human-readable report.

**Tech Stack:** Python 3.11+, pandas, NumPy, openpyxl, scikit-learn (only where useful), pytest, Markdown/CSV/JSON outputs.

---

### Task 1: Create the forecasting project skeleton

**Files:**
- Create: `inventory-forecasting/README.md`
- Create: `inventory-forecasting/requirements.txt`
- Create: `inventory-forecasting/src/__init__.py`
- Create: `inventory-forecasting/tests/__init__.py`
- Create: `inventory-forecasting/data/raw/.gitkeep`
- Create: `inventory-forecasting/data/processed/.gitkeep`
- Create: `inventory-forecasting/reports/.gitkeep`

**Step 1: Write the failing smoke test**

Create `inventory-forecasting/tests/test_project_smoke.py` that imports `src` and checks the project directories exist.

**Step 2: Run it to verify it fails**

Run: `python -m pytest inventory-forecasting/tests/test_project_smoke.py -q`

Expected: FAIL because the package and directories do not exist.

**Step 3: Create the skeleton and dependency file**

Add the listed files and keep the package importable without side effects.

**Step 4: Run it to verify it passes**

Run: `python -m pytest inventory-forecasting/tests/test_project_smoke.py -q`

Expected: PASS.

### Task 2: Normalize workbook data into daily demand and lead-time tables

**Files:**
- Create: `inventory-forecasting/src/ingest.py`
- Create: `inventory-forecasting/tests/test_ingest.py`
- Create: `inventory-forecasting/data/raw/出入库数据.XLSX`
- Create: `inventory-forecasting/data/raw/工字钢-出入库数据(1).XLSX`

**Step 1: Write failing tests**

Test that the loader:

- finds the three ordinary materials and the steel material;
- aggregates issue quantities to one row per material/unit/date;
- keeps KG and M as separate unit series;
- produces non-negative demand quantities;
- computes actual lead days only from valid receipt records.

**Step 2: Run tests to verify they fail**

Run: `python -m pytest inventory-forecasting/tests/test_ingest.py -q`

Expected: FAIL because the loader is not implemented.

**Step 3: Implement the minimal loader**

Read the source workbook summary/detail sheets, filter real consumption movement types, normalize signs, fill missing dates between the observed start/end dates, and write `demand_daily.parquet`/CSV plus `lead_time.csv`.

**Step 4: Run tests and inspect sample output**

Run: `python -m pytest inventory-forecasting/tests/test_ingest.py -q` and print the first 10 normalized rows.

Expected: PASS; no mixed units in one series and no negative demand values.

### Task 3: Implement candidate demand forecasters

**Files:**
- Create: `inventory-forecasting/src/forecast.py`
- Create: `inventory-forecasting/tests/test_forecast.py`

**Step 1: Write failing tests**

Cover constant demand, intermittent demand, all-zero windows, short history fallback, and non-negative forecast outputs for:

- trailing mean;
- weighted moving average;
- exponentially weighted moving average;
- Croston-style intermittent-demand baseline.

**Step 2: Run tests to verify they fail**

Run: `python -m pytest inventory-forecasting/tests/test_forecast.py -q`

Expected: FAIL because the forecasters are not implemented.

**Step 3: Implement forecasters**

Expose a common `forecast(history, horizon, config)` interface. Keep the models deterministic, clip negative values to zero, and return model metadata for explainability.

**Step 4: Run tests to verify they pass**

Run: `python -m pytest inventory-forecasting/tests/test_forecast.py -q`

Expected: PASS.

### Task 4: Add rolling-origin backtesting and model selection

**Files:**
- Create: `inventory-forecasting/src/backtest.py`
- Create: `inventory-forecasting/tests/test_backtest.py`
- Create: `inventory-forecasting/config/backtest.yaml`

**Step 1: Write failing tests**

Verify that:

- every validation window uses only dates before the forecast origin;
- horizons 7 and 14 are evaluated separately;
- WAPE, MAE, RMSE and scaled error are computed correctly;
- sparse series do not produce divide-by-zero errors;
- the selected model is chosen per material/unit when enough history exists.

**Step 2: Run tests to verify they fail**

Run: `python -m pytest inventory-forecasting/tests/test_backtest.py -q`

Expected: FAIL because the evaluator is not implemented.

**Step 3: Implement the evaluator**

Use expanding-window or rolling-origin splits, evaluate each candidate over all eligible origins, aggregate metrics by material/unit and horizon, and select the lowest WAPE with a minimum-history fallback to the global best robust model.

**Step 4: Run tests and execute the first real backtest**

Run: `python -m pytest inventory-forecasting/tests/test_backtest.py -q` and `python inventory-forecasting/src/run_backtest.py`.

Expected: PASS and a metrics table showing baseline vs candidate models.

### Task 5: Build dynamic safety-stock and stockout-risk simulation

**Files:**
- Create: `inventory-forecasting/src/inventory.py`
- Create: `inventory-forecasting/tests/test_inventory.py`

**Step 1: Write failing tests**

Cover safety-stock monotonicity, lead-time delay impact, known-future-demand additivity, unit isolation, and stockout-date detection.

**Step 2: Run tests to verify they fail**

Run: `python -m pytest inventory-forecasting/tests/test_inventory.py -q`

Expected: FAIL because inventory calculations are not implemented.

**Step 3: Implement transparent formulas**

Use the PRD formulas for demand/lead-time variability, add known future demand, calculate inventory position, and simulate daily inventory under selected forecasts and P90 lead time. Return risk level, expected stockout date, gap quantity and recommended order quantity.

**Step 4: Run tests and verify behavior**

Run: `python -m pytest inventory-forecasting/tests/test_inventory.py -q`.

Expected: PASS; increasing demand volatility or lead time cannot reduce safety stock.

### Task 6: Generate accuracy report and reproducible run command

**Files:**
- Create: `inventory-forecasting/src/run_pipeline.py`
- Create: `inventory-forecasting/src/report.py`
- Create: `inventory-forecasting/tests/test_pipeline.py`
- Create: `inventory-forecasting/reports/README.md`

**Step 1: Write failing integration test**

Run the pipeline against the two raw workbooks and assert that it writes metrics, predictions, selected models, and a Markdown report.

**Step 2: Run it to verify it fails**

Run: `python -m pytest inventory-forecasting/tests/test_pipeline.py -q`

Expected: FAIL because the CLI pipeline is not implemented.

**Step 3: Implement the pipeline**

Add one command that ingests, backtests, selects models, calculates inventory risk, and writes timestamped outputs under `inventory-forecasting/reports/latest/`.

**Step 4: Run the full verification**

Run: `python -m pytest inventory-forecasting/tests -q` and `python inventory-forecasting/src/run_pipeline.py --input-dir inventory-forecasting/data/raw --output-dir inventory-forecasting/reports/latest`.

Expected: all tests pass; the report states the selected model per item, baseline comparison, error metrics, and limitations.

### Task 7: Review accuracy and tune only against backtest evidence

**Files:**
- Modify: `inventory-forecasting/config/backtest.yaml`
- Create: `inventory-forecasting/reports/accuracy-review.md`

**Step 1: Compare baseline and selected models**

For each material/unit, compare fixed daily average, weighted moving average, EWMA and Croston-style forecasts across 7-day and 14-day horizons.

**Step 2: Tune configuration**

Adjust lookback windows, decay factors, quantile handling and minimum history only when rolling-origin metrics improve without worsening stockout recall.

**Step 3: Re-run tests and pipeline**

Run: `python -m pytest inventory-forecasting/tests -q` and the pipeline command from Task 6.

**Step 4: Document the decision**

Record why the selected model improved accuracy, where it did not, and which data gaps prevent stronger conclusions.

