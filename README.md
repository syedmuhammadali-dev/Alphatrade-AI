# AlphaTrade AI

Autonomous crypto trading platform — modular monorepo. See [remaining-tasks.md](./remaining-tasks.md) for the live backlog and phase plan.

**Status:** Phase 1 (monorepo, database, authentication, basic dashboard). No live/paper trading, market data, or analysis exists yet — dashboard figures are illustrative demo data only. No guaranteed returns are claimed anywhere in this project.

## Local development

Prerequisites: Node 20+, pnpm 9+, Docker.

```bash
pnpm install
docker compose up -d                              # starts local Postgres
pnpm --filter @alphatrade/database db:generate    # generate SQL migrations from schema (first run)
pnpm --filter @alphatrade/database db:migrate     # apply migrations
pnpm dev                                          # runs apps/api (port 4000) + apps/web (port 3000)
```

Then open http://localhost:3000, register an account, and you'll land on the dashboard.

Copy `.env.example` to `.env` and fill in real secrets before running anything — `.env` is gitignored.

## Tests

```bash
pnpm test          # unit + integration tests (integration tests need Postgres running + migrated)
pnpm typecheck
pnpm lint
```

## Monorepo layout

- `apps/web` — Next.js dashboard
- `apps/api` — Fastify REST API (auth, bot status)
- `apps/extension` — Chrome extension (Phase 10)
- `services/*` — trading pipeline workers, added phase by phase
- `packages/*` — shared code (database schema, types, config, UI, indicators, strategy engine, exchange client)
- `stitch_alphatrade_ai_trading_platform/` — source design mockups the web UI is built from
