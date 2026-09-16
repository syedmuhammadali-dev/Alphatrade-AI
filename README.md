# AlphaTrade AI

Autonomous crypto trading platform — modular monorepo. See [remaining-tasks.md](./remaining-tasks.md) for the live backlog and phase plan.

**Status:** Phase 6 (monorepo, database, authentication, dashboard, live Binance market-data service, market scanner, technical analysis + market structure + regime detection, strategy engine + opportunity ranker + AI decision engine, independent risk engine, paper trading). No live trading/execution exists yet — no real money or exchange account is ever involved anywhere in this project. The dashboard overview's KPI cards still show illustrative demo data; the Market Scanner, Coin Analysis, AI Decisions, Strategy Engine, Risk & Security, and Paper Trading pages are real (paper trading uses a simulated account, but real live market prices/fees). No guaranteed returns are claimed anywhere in this project.

## Local development

Prerequisites: Node 20+, pnpm 9+, and a Postgres 16 instance (Docker, or any existing local/native Postgres — just point `DATABASE_URL` at it). No exchange API keys are needed — market data comes from Binance's public, unauthenticated WebSocket/REST endpoints.

```bash
pnpm install
docker compose up -d                              # starts local Postgres (skip if you're using an existing Postgres instance)
pnpm --filter @alphatrade/database db:generate    # generate SQL migrations from schema (first run)
pnpm --filter @alphatrade/database db:migrate     # apply migrations
pnpm dev                                          # runs apps/api (4000) + apps/web (3010) + market-data (4100) + analysis-engine (4200) + trading-engine (4300) + risk-engine (4400)
```

Then open http://localhost:3010, register an account, and you'll land on the dashboard.

- **Market Scanner** — live, polling-refreshed table of Binance USDT pairs.
- **Coin Analysis** (click any scanner row) — real technical analysis (RSI, MACD, EMAs, ATR, VWAP, ADX, market structure, regime).
- **AI Decisions** — the Opportunity Ranker's output across the watchlist: recommended strategy, confidence, entry/stop/target, risk:reward, a total score, each actionable proposal's real APPROVED/REJECTED verdict from the independent Risk Engine, and an "Execute (Paper)" button when approved. NO_TRADE is shown as a valid outcome, not hidden.
- **Strategy Engine** — the four registered strategies (Trend Following, Breakout, Momentum, Mean Reversion) with per-user enable/disable.
- **Risk & Security** — editable deterministic risk config (risk per trade, max daily loss, max open positions, max losing streak, max portfolio exposure, minimum confidence/risk:reward, max position size).
- **Paper Trading** — a simulated $10,000 account. Positions fill at live Binance prices with realistic fees, auto-close on stop-loss/take-profit, and can be closed manually — but no real money or exchange account is ever touched.

Copy `.env.example` to `.env` and fill in real secrets before running anything — `.env` is gitignored.

## Tests

```bash
pnpm test                                          # unit + integration tests (need Postgres running + migrated)
pnpm typecheck
pnpm lint
pnpm --filter @alphatrade/web exec playwright install chromium   # once, to fetch the browser binary
pnpm --filter @alphatrade/web test:e2e             # e2e tests — needs every `pnpm dev` service running
```

## Monorepo layout

- `apps/web` — Next.js dashboard
- `apps/api` — Fastify REST API (auth, bot status, market data + analysis + decisions/strategies/risk/paper-trading proxy)
- `apps/extension` — Chrome extension (Phase 10)
- `services/market-data` — Binance public WebSocket/REST ingestion, in-memory market state, scanner/symbol HTTP API
- `services/analysis-engine` — technical indicators, market structure, and regime classification computed from market-data's candles
- `services/trading-engine` — strategy selection (packages/strategy-engine) + opportunity ranking + TradeProposal generation; stateless, never executes anything
- `services/risk-engine` — the independent risk gate (packages/risk-engine); stateless HTTP wrapper, architecturally isolated from the strategy/AI layer
- `services/*` (remaining) — trading pipeline workers, added phase by phase
- `packages/*` — shared code (database schema, types, config, UI, exchange client, indicators, strategy engine, risk engine, trade executor)
- `stitch_alphatrade_ai_trading_platform/` — source design mockups the web UI is built from
