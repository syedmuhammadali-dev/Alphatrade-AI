import { eq, desc, inArray } from "drizzle-orm";
import { getDb, backtests, backtestResults, type BacktestRow, type BacktestResultRow } from "@alphatrade/database";
import type { BacktestRequest, BacktestDetail, BacktestSummary, BacktestMetrics, BacktestTrade } from "@alphatrade/shared-types";
import { runBacktest, BacktestRunError } from "./backtesting-engine-client";

function toMetrics(row: BacktestResultRow): BacktestMetrics {
  return {
    initialBalanceUsd: row.initialBalanceUsd,
    finalBalanceUsd: row.finalBalanceUsd,
    totalReturnPercent: row.totalReturnPercent,
    tradeCount: row.tradeCount,
    wins: row.wins,
    losses: row.losses,
    winRate: row.winRate,
    profitFactor: row.profitFactor,
    sharpeRatio: row.sharpeRatio,
    maxDrawdownPercent: row.maxDrawdownPercent,
    averageRiskReward: row.averageRiskReward,
  };
}

function toSummary(row: BacktestRow, result: BacktestResultRow | undefined): BacktestSummary {
  return {
    id: row.id,
    symbol: row.symbol,
    interval: row.interval as BacktestSummary["interval"],
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    status: row.status,
    errorMessage: row.errorMessage,
    totalReturnPercent: result?.totalReturnPercent ?? null,
    winRate: result?.winRate ?? null,
    tradeCount: result?.tradeCount ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Runs a backtest synchronously against the stateless backtesting-engine
 * service and persists both the request and, on success, its full result.
 * A run that the engine itself rejects (bad range, unknown symbol) is
 * recorded as a FAILED row rather than silently discarded — it's an honest,
 * inspectable outcome, the same philosophy Phase 4 applied to NO_TRADE.
 */
export async function createBacktest(userId: string, request: BacktestRequest): Promise<BacktestDetail> {
  const db = getDb();

  let result;
  let errorMessage: string | null = null;
  try {
    result = await runBacktest(request);
  } catch (err) {
    if (err instanceof BacktestRunError) {
      errorMessage = err.message;
    } else {
      throw err;
    }
  }

  const [row] = await db
    .insert(backtests)
    .values({
      userId,
      symbol: request.symbol.toUpperCase(),
      interval: request.interval,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      request,
      status: result ? "COMPLETED" : "FAILED",
      errorMessage,
    })
    .returning();

  let resultRow: BacktestResultRow | undefined;
  if (result) {
    const [inserted] = await db
      .insert(backtestResults)
      .values({
        backtestId: row!.id,
        initialBalanceUsd: result.metrics.initialBalanceUsd,
        finalBalanceUsd: result.metrics.finalBalanceUsd,
        totalReturnPercent: result.metrics.totalReturnPercent,
        tradeCount: result.metrics.tradeCount,
        wins: result.metrics.wins,
        losses: result.metrics.losses,
        winRate: result.metrics.winRate,
        profitFactor: result.metrics.profitFactor,
        sharpeRatio: result.metrics.sharpeRatio,
        maxDrawdownPercent: result.metrics.maxDrawdownPercent,
        averageRiskReward: result.metrics.averageRiskReward,
        trades: result.trades,
      })
      .returning();
    resultRow = inserted;
  }

  return {
    ...toSummary(row!, resultRow),
    request,
    metrics: resultRow ? toMetrics(resultRow) : null,
    trades: (resultRow?.trades as BacktestTrade[] | undefined) ?? [],
  };
}

export async function listBacktests(userId: string): Promise<BacktestSummary[]> {
  const db = getDb();
  const rows = await db.query.backtests.findMany({
    where: eq(backtests.userId, userId),
    orderBy: desc(backtests.createdAt),
  });
  if (rows.length === 0) return [];

  const results = await db.query.backtestResults.findMany({
    where: inArray(backtestResults.backtestId, rows.map((r) => r.id)),
  });
  const resultsByBacktestId = new Map(results.map((r) => [r.backtestId, r]));

  return rows.map((row) => toSummary(row, resultsByBacktestId.get(row.id)));
}

export async function getBacktestDetail(userId: string, id: string): Promise<BacktestDetail | null> {
  const db = getDb();
  const row = await db.query.backtests.findFirst({ where: eq(backtests.id, id) });
  if (!row || row.userId !== userId) return null;

  const resultRow = await db.query.backtestResults.findFirst({ where: eq(backtestResults.backtestId, id) });

  return {
    ...toSummary(row, resultRow),
    request: row.request as BacktestRequest,
    metrics: resultRow ? toMetrics(resultRow) : null,
    trades: (resultRow?.trades as BacktestTrade[] | undefined) ?? [],
  };
}
