# services/ml-service

Phase 11's swap-in point for `packages/market-analysis`'s deterministic
`RegimeDetector` — a Random Forest / Gradient Boosting classifier that
predicts bullish/bearish/neutral probabilities from historical candles.
Python, not TypeScript: this is a standalone process, not part of the
pnpm workspace or `pnpm dev`.

It is never part of the live decision/execution path on its own — it only
ever classifies a regime, the same contract `DeterministicRegimeDetector`
fulfills. Nothing here places, sizes, or approves a trade.

## Setup

```bash
cd services/ml-service
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
```

## Train a model (offline, separate from the live path)

```bash
python -m training.train --symbol BTCUSDT --interval 1h --days 180
```

Fetches historical candles directly from Binance's public REST endpoint
(no API key needed), builds features + forward-return labels, trains both
a `RandomForestClassifier` and a `GradientBoostingClassifier`, and saves
whichever scores higher on a held-out split to `models/model.joblib`
(gitignored — train your own rather than committing a binary artifact).
`models/metrics.json` records both candidates' accuracy and per-class
precision/recall for inspection.

## Run the service

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

`GET /health` reports whether a model is loaded. `POST /predict` takes
`{"candles": [{"open","high","low","close","volume"}, ...]}` (at least 200,
oldest first) and returns `{"predicted", "probabilities", "model_type"}`.
A 503 means no model has been trained yet; a 422 means too few candles or
not enough history for every feature.

## Wiring it into the live path

Set `REGIME_DETECTOR_MODE=ml` and `ML_SERVICE_URL` in `.env`, then restart
`services/analysis-engine`. `MlRegimeDetector`
(`services/analysis-engine/src/ml-regime-detector.ts`) calls this service
and maps its 3-class output onto `MarketRegime`:

- `BULLISH` (confidence ≥ 0.5) → `TRENDING_BULLISH`
- `BEARISH` (confidence ≥ 0.5) → `TRENDING_BEARISH`
- `NEUTRAL` (confidence ≥ 0.5) → `RANGING`
- anything below that confidence, or any failure (service down, no model
  trained, not enough candles) → `UNCERTAIN`, never a guess

The model has no concept of `HIGH_VOLATILITY`/`LOW_VOLATILITY` — those two
regimes are never returned in `ml` mode. `packages/backtesting-engine`
always uses the deterministic detector regardless of this setting: it's a
pure package (no network calls of its own volition) and a per-bar HTTP
round trip would make backtests slow and non-reproducible anyway.

## Tests

```bash
python -m pytest tests/ -q
```
