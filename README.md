# AlphaTrade AI

Autonomous crypto trading platform — modular monorepo. See [remaining-tasks.md](./remaining-tasks.md) for the live backlog and phase plan.

**Status:** Phase 11 — all 11 planned phases complete (monorepo, database, authentication, dashboard, live Binance market-data service, market scanner, technical analysis + market structure + regime detection, strategy engine + opportunity ranker + AI decision engine, independent risk engine, paper trading, backtesting, autonomous bot with start/pause/resume/stop/emergency-stop controls, live execution against a real connected exchange account, a Chrome extension popup, and an optional ML-based regime classifier swap-in). Live execution exists now but is strictly manual and opt-in — the autonomous bot never trades real money on its own, and every connection defaults to Binance testnet. The dashboard overview's KPI cards still show illustrative demo data; the Market Scanner, Coin Analysis, AI Decisions, Strategy Engine, Risk & Security, Paper Trading, Backtesting, Autonomous Bot, Exchange Connections, and Live Trading pages are real (paper trading uses a simulated account, but real live market prices/fees; backtests replay historical Binance candles through the same strategy and risk pipeline). No guaranteed returns are claimed anywhere in this project.

## Local development

Prerequisites: Node 20+, pnpm 9+, and a Postgres 16 instance (Docker, or any existing local/native Postgres — just point `DATABASE_URL` at it). No exchange API keys are needed — market data comes from Binance's public, unauthenticated WebSocket/REST endpoints.

```bash
pnpm install
docker compose up -d                              # starts local Postgres (skip if you're using an existing Postgres instance)
pnpm --filter @alphatrade/database db:generate    # generate SQL migrations from schema (first run)
pnpm --filter @alphatrade/database db:migrate     # apply migrations
pnpm dev                                          # runs every service + apps/web — see CLAUDE.md for the full port map
```

Then open http://localhost:3010, register an account, and you'll land on the dashboard.

- **Market Scanner** — live, polling-refreshed table of Binance USDT pairs.
- **Coin Analysis** (click any scanner row) — real technical analysis (RSI, MACD, EMAs, ATR, VWAP, ADX, market structure, regime).
- **AI Decisions** — the Opportunity Ranker's output across the watchlist: recommended strategy, confidence, entry/stop/target, risk:reward, a total score, each actionable proposal's real APPROVED/REJECTED verdict from the independent Risk Engine, and an "Execute (Paper)" button when approved. NO_TRADE is shown as a valid outcome, not hidden.
- **Strategy Engine** — the four registered strategies (Trend Following, Breakout, Momentum, Mean Reversion) with per-user enable/disable.
- **Risk & Security** — editable deterministic risk config (risk per trade, max daily loss, max open positions, max losing streak, max portfolio exposure, minimum confidence/risk:reward, max position size).
- **Paper Trading** — a simulated $10,000 account. Positions fill at live Binance prices with realistic fees, auto-close on stop-loss/take-profit, and can be closed manually — but no real money or exchange account is ever touched.
- **Backtesting** — replays historical Binance candles (15m/1h/4h/1d) through the same strategy + risk pipeline, with metrics (return, win rate, profit factor, Sharpe, max drawdown, avg R:R).
- **Autonomous Bot** — start/pause/resume/stop/emergency-stop. Protective stop-loss/take-profit exits run continuously for every open position regardless of state; new (paper) entries only happen while `running`.
- **Exchange Connections** — add a real Binance API key/secret (encrypted at rest, AES-256-GCM); defaults to testnet. Read + trade permissions only — this project never requests or uses withdrawal access.
- **Live Trading** — places a real market order through a connected exchange account, after the exact same AI Decision + independent Risk Engine check paper trading uses. Always a manual, one-click action — the autonomous bot never trades live on its own.
- **Chrome extension** (`apps/extension`) — a popup for bot status/controls (pause/resume/emergency-stop), paper portfolio, and the best current AI opportunity, without leaving the page you're on. Authenticates with its own Bearer-token session (`POST /auth/extension-login`), not the web app's cookies. An optional content script surfaces the symbol you're viewing on a Binance trade page. See "Chrome extension" below for loading it unpacked.
- **ML regime classifier** (`services/ml-service`) — an optional Python/FastAPI swap-in for the deterministic market regime detector (RSI/ADX/EMA rules). A Random Forest / Gradient Boosting model predicts bullish/bearish/neutral from historical candles; opt in with `REGIME_DETECTOR_MODE=ml`. Off by default — the deterministic detector is what every other page above runs against. See `services/ml-service/README.md` for training and running it.

Copy `.env.example` to `.env` and fill in real secrets before running anything — `.env` is gitignored. Generate `ENCRYPTION_KEY` with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` before adding any exchange connection.

## Tests

```bash
pnpm test                                          # unit + integration tests (need Postgres running + migrated)
pnpm typecheck
pnpm lint
pnpm --filter @alphatrade/web exec playwright install chromium   # once, to fetch the browser binary
pnpm --filter @alphatrade/web test:e2e             # e2e tests — needs every `pnpm dev` service running
```

## Chrome extension

```bash
pnpm --filter @alphatrade/extension dev     # or: build, then load .output/chrome-mv3 unpacked
```

In Chrome: `chrome://extensions` → enable Developer mode → "Load unpacked" → select `apps/extension/.output/chrome-mv3` (after `pnpm --filter @alphatrade/extension build`) or let `pnpm --filter @alphatrade/extension dev` open a dev Chrome profile with it pre-loaded. Requires `pnpm dev`'s `apps/api` running at `http://localhost:4000` (hardcoded in `apps/extension/lib/api.ts` — change it for a non-local deployment).

## Monorepo layout

- `apps/web` — Next.js dashboard
- `apps/api` — Fastify REST API (auth, bot status, market data + analysis + decisions/strategies/risk/paper-trading proxy)
- `apps/extension` — Chrome extension (Manifest V3, WXT + React): bot controls, paper portfolio, best AI opportunity, optional Binance symbol detection
- `services/market-data` — Binance public WebSocket/REST ingestion, in-memory market state, scanner/symbol HTTP API
- `services/analysis-engine` — technical indicators, market structure, and regime classification computed from market-data's candles
- `services/trading-engine` — strategy selection (packages/strategy-engine) + opportunity ranking + TradeProposal generation; stateless, never executes anything
- `services/risk-engine` — the independent risk gate (packages/risk-engine); stateless HTTP wrapper, architecturally isolated from the strategy/AI layer
- `services/ml-service` — Python/FastAPI, scikit-learn regime classifier; a standalone process outside the pnpm workspace, see `services/ml-service/README.md`
- `services/*` (remaining) — trading pipeline workers, added phase by phase
- `packages/*` — shared code (database schema, types, config, UI, exchange client, indicators, strategy engine, risk engine, trade executor)
- `stitch_alphatrade_ai_trading_platform/` — source design mockups the web UI is built from
