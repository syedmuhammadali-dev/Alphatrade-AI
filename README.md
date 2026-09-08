# AlphaTrade AI

Autonomous crypto trading platform — modular monorepo. See [remaining-tasks.md](./remaining-tasks.md) for the live backlog and phase plan.

**Status:** Phase 2 (monorepo, database, authentication, dashboard, live Binance market-data service + market scanner). No paper/live trading, technical analysis, or strategy engine exists yet — the dashboard KPI cards still show illustrative demo data; the Market Scanner is real live data. No guaranteed returns are claimed anywhere in this project.

## Local development

Prerequisites: Node 20+, pnpm 9+, and a Postgres 16 instance (Docker, or any existing local/native Postgres — just point `DATABASE_URL` at it). No exchange API keys are needed for Phase 2 — market data comes from Binance's public, unauthenticated WebSocket streams.

```bash
pnpm install
docker compose up -d                              # starts local Postgres (skip if you're using an existing Postgres instance)
pnpm --filter @alphatrade/database db:generate    # generate SQL migrations from schema (first run)
pnpm --filter @alphatrade/database db:migrate     # apply migrations
pnpm dev                                          # runs apps/api (4000) + apps/web (3010) + services/market-data (4100)
```

Then open http://localhost:3010, register an account, and you'll land on the dashboard. Open the "Market Scanner" nav item for the live, polling-refreshed table of Binance USDT pairs.

Copy `.env.example` to `.env` and fill in real secrets before running anything — `.env` is gitignored.

## Tests

```bash
pnpm test                                          # unit + integration tests (need Postgres running + migrated)
pnpm typecheck
pnpm lint
pnpm --filter @alphatrade/web exec playwright install chromium   # once, to fetch the browser binary
pnpm --filter @alphatrade/web test:e2e             # e2e tests — needs api+web+market-data all running (pnpm dev)
```

## Monorepo layout

- `apps/web` — Next.js dashboard
- `apps/api` — Fastify REST API (auth, bot status, market data proxy)
- `apps/extension` — Chrome extension (Phase 10)
- `services/market-data` — Binance public WebSocket ingestion, in-memory market state, scanner/symbol HTTP API
- `services/*` (remaining) — trading pipeline workers, added phase by phase
- `packages/*` — shared code (database schema, types, config, UI, exchange client, indicators, strategy engine)
- `stitch_alphatrade_ai_trading_platform/` — source design mockups the web UI is built from
