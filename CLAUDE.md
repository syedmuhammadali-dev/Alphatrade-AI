# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repo. See [README.md](./README.md) for what the product does and [remaining-tasks.md](./remaining-tasks.md) for the live backlog/phase plan — read both before starting work.

## Architecture (don't violate these boundaries)

- `packages/*` — pure, stateless logic only. No Postgres, no outbound network calls of their own volition, no side effects. Indicators, strategy signals, risk rules, fee/P&L math, backtest simulation. A package may depend on another package (e.g. `backtesting-engine` imports `risk-engine` and `strategy-engine` directly), but never on a `service` or `app`.
- `services/*` — thin, stateless HTTP wrappers (Fastify). They call out to other services or packages, but **never touch Postgres**. Each is independently runnable (`pnpm --filter <name> dev`) on its own port (see table below).
- `apps/api` — the only thing that touches Postgres directly. It orchestrates calls to the stateless services, persists results, and owns all business logic that needs a database (paper/live trading, bot state, audit logs).
- `apps/web` — Next.js App Router. Route handlers under `app/api/**` are a thin BFF proxy (`lib/api-proxy.ts`'s `proxyToApi()`) to `apps/api` — they relay cookies, nothing else. All real logic lives server-side in `apps/api`.
- **The AI/strategy layer never executes anything.** `trading-engine` produces a `TradeProposal` or `NO_TRADE` and stops. Every proposal is routed through `risk-engine` (isolated — it only ever sees a plain `TradeProposal` + `RiskConfig` + `AccountState`, never strategy internals) before anything executes. This separation is the whole point of the project; don't take shortcuts that blur it.
- `TradeExecutor`-shaped code (paper trading, live trading) deliberately lives in `apps/api/src/services/*-trading-service.ts`, not as a literal class in `packages/trade-executor` — it needs Postgres + network side effects, which packages can't have. `packages/trade-executor` holds only the pure fee/P&L math both paper and live trading share.

## Port map (local dev)

| Service | Port |
|---|---|
| apps/web | 3010 |
| apps/api | 4000 |
| market-data | 4100 |
| analysis-engine | 4200 |
| trading-engine | 4300 |
| risk-engine | 4400 |
| backtesting-engine | 4500 |
| execution-engine | 4600 |

## Conventions established across phases

- **Phase-gated, not speculative.** Build only the current phase. Don't scaffold tables/services for a later phase beyond what's explicitly reserved (e.g. `ENCRYPTION_KEY` was reserved in `.env.example` from Phase 1 for Phase 9's use).
- **`remaining-tasks.md` is a live, gitignored backlog** — not committed. Move an item from Backlog → Done with a real writeup (what was built, what tests cover it, what's honestly deferred) when a phase finishes. Delete stale items rather than letting them rot.
- **`.env` and `.env.example` are kept in sync** on every new env var. `.env.example` has placeholders/documented defaults; `.env` has real local dev values and is gitignored. (A real gap from Phase 5 — `RISK_ENGINE_*` vars missing from both files — was found and fixed during Phase 7; check both files whenever you add a new service.)
- **NO_TRADE / REJECTED / FAILED are first-class outcomes, never hidden.** A strategy finding nothing, a risk check failing, a backtest the engine couldn't run — all are recorded and shown honestly, not swallowed or faked into a fallback value.
- **Honest scope-cuts over silent gaps.** When something is deliberately simplified for an MVP (paper trading is LONG-only; SL/TP is enforced by polling, not native exchange OCO orders; live P&L doesn't yet net out exchange commission), say so in a code comment and in the phase's `remaining-tasks.md` writeup. Don't present a simplified thing as complete.
- **Secrets**: exchange API keys are encrypted at rest via `encryptSecret`/`decryptSecret` (`packages/shared-config/src/encryption.ts`, AES-256-GCM, keyed by `ENCRYPTION_KEY`). Never log a decrypted secret; never return one from an API route (`apiKeyLast4` is enough for a user to tell connections apart). New exchange connections default to **testnet**.
- **Idempotency on real exchange calls**: every live order carries a `clientOrderId` so a safely-retried request can't double-fill. `services/execution-engine`'s retry wrapper only retries network-level failures, never a rejection the exchange actually returned.
- **Autonomous bot never trades live on its own.** The bot orchestrator (`apps/api/src/services/bot-orchestrator.ts`) runs protective SL/TP exits for every open position (paper and live, in every bot state) but only opens *new* paper positions, and only for `running` bots. Opening a live position is always a manual, one-click action (`POST /live/execute`) — don't wire autonomous live entries without the user explicitly asking for that and understanding the implication.

## Testing

- Every package/service gets real unit/integration tests — hand-verified math where it matters (fees, P&L, position sizing), fake HTTP upstreams (`node:http` `createServer`) for service-to-service integration tests, real Postgres for DB-backed tests.
- `apps/api`'s test script runs with `--no-file-parallelism` (see below — this machine can't sustain full parallel vitest workers across ~12 integration test files).
- Playwright e2e specs live in `apps/web/e2e/`. They run against **fully live services** (real Binance data, real Postgres) — there's no mocking layer for e2e. A failing e2e run under memory pressure (see below) is not necessarily a regression; rerun it once before treating it as a real bug.

## This machine runs low on memory — read this before debugging a "weird" failure

This dev machine has ~24GB RAM but VSCode + Chrome routinely leave only 2-4GB free. Symptoms you will see that are **not code bugs**:
- `tsc`, `eslint`, or `vitest` workers crashing with exit code `134` (SIGABRT) or "FATAL ERROR: Zone Allocation failed - process out of memory" under `turbo run <task>` at default concurrency.
- Vitest's "Worker exited unexpectedly" when apps/api's test suite runs multiple integration test files in parallel.
- The full `pnpm dev` stack (8 services + web) failing to fully start.

Before assuming a real regression: check free memory (`Get-CimInstance Win32_OperatingSystem | Select-Object FreePhysicalMemory`), kill stray `node` processes from a previous `pnpm dev` session (`Get-Process node | Stop-Process -Force`), and retry with lower concurrency (`pnpm exec turbo run typecheck --concurrency=4`, or sequentially with `--concurrency=1`). Isolate a single failing package (`pnpm --filter <pkg> test`) to confirm it passes alone before concluding there's a real bug.

## Git workflow

- Commit locally after every completed phase/task chunk, without waiting to be asked — this has been the user's standing instruction since Phase 6.
- Push to `origin master` as the natural next step after a local commit, matching the pattern established across every phase so far.
- Use descriptive multi-paragraph commit messages (see `git log` for the established style) — summarize what was built, the key design decisions, and test counts.

## Local run

```bash
pnpm install
pnpm --filter @alphatrade/database db:generate   # after any schema change
pnpm --filter @alphatrade/database db:migrate
pnpm dev                                          # all services + web, see port map above
```

See [README.md](./README.md) for the full list of real (non-demo) pages and prerequisites.
