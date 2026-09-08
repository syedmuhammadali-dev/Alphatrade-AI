# ALPHATRADE AI — Remaining Tasks

This file is the live backlog. Add items as soon as new issues/tasks surface; delete items once done (git history is the record of what was completed, not this file).

## In progress

- [ ] Phase 1: Monorepo setup, database, authentication, basic dashboard

## Backlog (by phase)

### Phase 2 — Market data
- [ ] `services/market-data`: exchange WebSocket connection manager (Binance)
- [ ] Normalize ticks/candles/orderbook into shared event types
- [ ] In-memory market-state cache (pluggable `Cache` interface already in `packages/shared-config`)
- [ ] `GET /market/scanner`, `GET /market/:symbol` endpoints

### Phase 3 — Analysis
- [ ] `packages/indicators`: RSI, MACD, EMA/SMA, ATR, VWAP, Bollinger, ADX, OBV
- [ ] Market structure detector (HH/HL/LH/LL, support/resistance, breakout/breakdown)
- [ ] Market regime classifier (deterministic rules first, ML-replaceable interface)

### Phase 4 — Strategy & ranking
- [ ] `packages/strategy-engine`: `TradingStrategy` interface + Trend/Breakout/Momentum/MeanReversion strategies
- [ ] Opportunity ranker (multi-factor scoring, NO_TRADE as valid outcome)
- [ ] Autonomous decision engine producing `TradeProposal` (no execution)
- [ ] `strategies`, `strategy_configs`, `trade_decisions` tables

### Phase 5 — Risk engine
- [ ] `services/risk-engine`: deterministic rule set (risk/trade, daily loss cap, max exposure, max concurrent positions, losing streak, min R:R, min confidence)
- [ ] APPROVED/REJECTED decision with explicit reasons
- [ ] `risk_checks` table
- [ ] Unit tests for risk engine + position sizing

### Phase 6 — Paper trading
- [ ] `services/paper-trading-engine`: simulated exchange (virtual balance, fees, SL/TP)
- [ ] `TradeExecutor` interface + `PaperTradingExecutor`
- [ ] `paper_accounts`, `paper_orders`, `performance_metrics` tables
- [ ] `POST /paper/start`, `GET /paper/account`, `GET /paper/trades`
- [ ] Integration tests for paper trading

### Phase 7 — Backtesting
- [ ] `services/backtesting-engine`: historical candle replay, fees + slippage model
- [ ] Metrics: total return, win rate, profit factor, Sharpe, max drawdown, trade count, avg R:R
- [ ] `backtests`, `backtest_results` tables
- [ ] `POST /backtests`, `GET /backtests`, `GET /backtests/:id`

### Phase 8 — Autonomous orchestration
- [ ] `services/trading-engine`: wire market data → analysis → strategy → ranking → decision → risk → execution pipeline
- [ ] Bot Start/Pause/Resume/Stop + Emergency Stop (no auto position close unless configured)
- [ ] `GET /bot/status`, `POST /bot/{start,pause,resume,stop,emergency-stop}` (status already stubbed in Phase 1; wire to real orchestrator)

### Phase 9 — Live execution
- [ ] `packages/exchange-client`: Binance REST/WS wrapper, read + trade permissions only, no withdrawal
- [ ] `services/execution-engine`: idempotent order placement, SL/TP creation, retry logic
- [ ] `services/trade-manager`: position monitoring, trailing stops, partial TP, emergency close, action logging
- [ ] `LiveTradingExecutor` implementing the same `TradeExecutor` interface as paper trading
- [ ] `exchange_connections` table + `encryptSecret()`/`decryptSecret()` (AES-256-GCM, `ENCRYPTION_KEY` already reserved in `.env.example`)
- [ ] Exchange Connections + Security dashboard pages, IP-restriction support

### Phase 10 — Chrome extension
- [ ] `apps/extension`: WXT + React + TS, Manifest V3
- [ ] Status/portfolio/P&L/regime/positions/best-opportunity/recent-decision views
- [ ] Pause/Resume/Emergency Stop actions against authenticated API only
- [ ] Optional content script: detect viewed symbol on exchange pages

### Phase 11 — ML service
- [ ] `services/ml-service`: FastAPI + pandas/numpy/scikit-learn
- [ ] Random Forest / Gradient Boosting classifiers returning bullish/bearish/neutral probabilities
- [ ] Offline training pipeline, separate from the live path
- [ ] Swap-in point for the deterministic market regime detector

## Known issues / notes
- (none open)
