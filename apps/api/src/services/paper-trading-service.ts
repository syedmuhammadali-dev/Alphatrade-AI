import { eq, and, desc, gte } from "drizzle-orm";
import { getDb, paperAccounts, paperPositions, paperOrders, type PaperPositionRow } from "@alphatrade/database";
import { computeFee, computeRealizedPnl, computeUnrealizedPnl, checkExitTrigger } from "@alphatrade/trade-executor";
import type { PaperAccount, PaperPosition, PaperPerformance, ExecutePaperTradeResult, AccountState } from "@alphatrade/shared-types";
import { getSymbolDetail, MarketDataUnavailableError } from "./market-data-client";
import { getDecision, TradingEngineUnavailableError } from "./trading-engine-client";
import { checkProposal, RiskEngineUnavailableError } from "./risk-engine-client";
import { getEnabledStrategyNames } from "./strategy-config-service";
import { getRiskConfig } from "./risk-config-service";
import { recordRiskCheck } from "./risk-check-service";
import { recordDecision } from "./trade-decision-service";

export const DEFAULT_STARTING_BALANCE_USD = 10_000;

async function getCurrentPrice(symbol: string): Promise<number | null> {
  const detail = await getSymbolDetail(symbol);
  return detail.ticker?.lastPrice ?? null;
}

/**
 * Real portfolio state for the risk engine, derived from the user's actual
 * paper account — supersedes the empty-portfolio defaults Phase 5 used
 * before any executor existed to supply a real one. Returns null for
 * balanceOverride when there's no paper account yet (caller falls back to
 * the risk config's reference balance).
 */
export async function getPaperRiskContext(
  userId: string,
): Promise<{ balanceOverride: number | null; accountState: Partial<AccountState> }> {
  const db = getDb();
  const account = await db.query.paperAccounts.findFirst({ where: eq(paperAccounts.userId, userId) });
  if (!account) return { balanceOverride: null, accountState: {} };

  const openPositions = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "OPEN")),
  });
  const currentExposurePercent =
    account.balanceUsd > 0
      ? (openPositions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0) / account.balanceUsd) * 100
      : 0;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const closedToday = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "CLOSED"), gte(paperPositions.closedAt, startOfDay)),
  });
  const dailyPnlPercent =
    account.startingBalanceUsd > 0
      ? (closedToday.reduce((sum, p) => sum + (p.realizedPnlUsd ?? 0), 0) / account.startingBalanceUsd) * 100
      : 0;

  const recentClosed = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "CLOSED")),
    orderBy: desc(paperPositions.closedAt),
    limit: 50,
  });
  let currentLosingStreak = 0;
  for (const position of recentClosed) {
    if ((position.realizedPnlUsd ?? 0) < 0) currentLosingStreak++;
    else break;
  }

  return {
    balanceOverride: account.balanceUsd,
    accountState: { openPositionsCount: openPositions.length, currentExposurePercent, dailyPnlPercent, currentLosingStreak },
  };
}

export async function startAccount(userId: string, startingBalanceUsd = DEFAULT_STARTING_BALANCE_USD) {
  const db = getDb();
  const existing = await db.query.paperAccounts.findFirst({ where: eq(paperAccounts.userId, userId) });
  if (existing) return existing;

  const [created] = await db
    .insert(paperAccounts)
    .values({ userId, balanceUsd: startingBalanceUsd, startingBalanceUsd })
    .returning();
  return created!;
}

/** Checks every open position against its current price and auto-closes any that hit stop-loss/take-profit. */
async function monitorAndAutoClose(userId: string): Promise<void> {
  const db = getDb();
  const open = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "OPEN")),
  });

  for (const position of open) {
    const currentPrice = await getCurrentPrice(position.symbol).catch(() => null);
    if (currentPrice === null) continue;

    const trigger = checkExitTrigger(position.side, currentPrice, position.stopLoss, position.takeProfit);
    if (trigger) {
      await settlePosition(userId, position, currentPrice, trigger);
    }
  }
}

async function settlePosition(
  userId: string,
  position: PaperPositionRow,
  exitPrice: number,
  reason: "TAKE_PROFIT" | "STOP_LOSS" | "MANUAL",
): Promise<PaperPositionRow> {
  const db = getDb();
  const exitFeeUsd = computeFee(position.quantity * exitPrice);
  const realizedPnlUsd = computeRealizedPnl(
    position.side,
    position.entryPrice,
    exitPrice,
    position.quantity,
    position.entryFeeUsd,
    exitFeeUsd,
  );
  // Cash returned to the account: what opening the position tied up, plus/minus the realized P&L.
  const proceeds = position.entryPrice * position.quantity + position.entryFeeUsd + realizedPnlUsd;

  const [closed] = await db
    .update(paperPositions)
    .set({
      status: "CLOSED",
      closedAt: new Date(),
      closePrice: exitPrice,
      closeReason: reason,
      exitFeeUsd,
      realizedPnlUsd,
    })
    .where(eq(paperPositions.id, position.id))
    .returning();

  await db.insert(paperOrders).values({
    userId,
    positionId: position.id,
    symbol: position.symbol,
    type: "EXIT",
    quantity: position.quantity,
    price: exitPrice,
    feeUsd: exitFeeUsd,
  });

  await creditAccount(userId, proceeds);

  return closed!;
}

// Drizzle doesn't have a first-class "increment by" helper without raw SQL for this project yet;
// read-modify-write is simple and safe enough here since paper trading isn't concurrent per user
// in this MVP.
async function creditAccount(userId: string, deltaUsd: number): Promise<void> {
  const db = getDb();
  const account = await db.query.paperAccounts.findFirst({ where: eq(paperAccounts.userId, userId) });
  if (!account) return;
  await db
    .update(paperAccounts)
    .set({ balanceUsd: account.balanceUsd + deltaUsd, updatedAt: new Date() })
    .where(eq(paperAccounts.userId, userId));
}

function toPaperPosition(row: PaperPositionRow, currentPrice: number | null): PaperPosition {
  const unrealizedPnlUsd =
    row.status === "OPEN" && currentPrice !== null
      ? computeUnrealizedPnl(row.side, row.entryPrice, currentPrice, row.quantity)
      : null;

  return {
    id: row.id,
    symbol: row.symbol,
    side: "LONG",
    entryPrice: row.entryPrice,
    quantity: row.quantity,
    stopLoss: row.stopLoss,
    takeProfit: row.takeProfit,
    status: row.status,
    strategy: row.strategy,
    currentPrice,
    unrealizedPnlUsd,
    openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    closePrice: row.closePrice,
    closeReason: row.closeReason,
    realizedPnlUsd: row.realizedPnlUsd,
    feesUsd: row.entryFeeUsd + (row.exitFeeUsd ?? 0),
  };
}

export async function getAccountSummary(userId: string): Promise<PaperAccount | null> {
  await monitorAndAutoClose(userId);

  const db = getDb();
  const account = await db.query.paperAccounts.findFirst({ where: eq(paperAccounts.userId, userId) });
  if (!account) return null;

  const openPositions = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "OPEN")),
  });

  let unrealizedTotal = 0;
  for (const position of openPositions) {
    const currentPrice = await getCurrentPrice(position.symbol).catch(() => null);
    if (currentPrice !== null) {
      unrealizedTotal += computeUnrealizedPnl(position.side, position.entryPrice, currentPrice, position.quantity);
    }
  }

  return {
    balanceUsd: account.balanceUsd,
    startingBalanceUsd: account.startingBalanceUsd,
    equityUsd: account.balanceUsd + unrealizedTotal,
    openPositionsCount: openPositions.length,
    createdAt: account.createdAt.toISOString(),
  };
}

export async function getOpenPositions(userId: string): Promise<PaperPosition[]> {
  await monitorAndAutoClose(userId);

  const db = getDb();
  const rows = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "OPEN")),
    orderBy: desc(paperPositions.openedAt),
  });

  return Promise.all(
    rows.map(async (row) => toPaperPosition(row, await getCurrentPrice(row.symbol).catch(() => null))),
  );
}

export async function getClosedPositions(userId: string): Promise<PaperPosition[]> {
  const db = getDb();
  const rows = await db.query.paperPositions.findMany({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.status, "CLOSED")),
    orderBy: desc(paperPositions.closedAt),
  });
  return rows.map((row) => toPaperPosition(row, null));
}

export async function getPerformance(userId: string): Promise<PaperPerformance> {
  const closed = await getClosedPositions(userId);

  const totalTrades = closed.length;
  const wins = closed.filter((p) => (p.realizedPnlUsd ?? 0) > 0).length;
  const losses = closed.filter((p) => (p.realizedPnlUsd ?? 0) <= 0).length;
  const totalPnlUsd = closed.reduce((sum, p) => sum + (p.realizedPnlUsd ?? 0), 0);
  const totalFeesUsd = closed.reduce((sum, p) => sum + p.feesUsd, 0);

  const grossProfit = closed.filter((p) => (p.realizedPnlUsd ?? 0) > 0).reduce((s, p) => s + (p.realizedPnlUsd ?? 0), 0);
  const grossLoss = Math.abs(closed.filter((p) => (p.realizedPnlUsd ?? 0) < 0).reduce((s, p) => s + (p.realizedPnlUsd ?? 0), 0));

  return {
    totalTrades,
    wins,
    losses,
    winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : null,
    totalPnlUsd,
    totalFeesUsd,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
  };
}

export async function manualClosePosition(userId: string, positionId: string): Promise<ExecutePaperTradeResult> {
  const db = getDb();
  const position = await db.query.paperPositions.findFirst({
    where: and(eq(paperPositions.id, positionId), eq(paperPositions.userId, userId)),
  });
  if (!position) return { executed: false, reason: "Position not found.", position: null };
  if (position.status !== "OPEN") return { executed: false, reason: "Position is already closed.", position: null };

  const currentPrice = await getCurrentPrice(position.symbol);
  if (currentPrice === null) {
    return { executed: false, reason: "Could not fetch a current price to close at.", position: null };
  }

  const closed = await settlePosition(userId, position, currentPrice, "MANUAL");
  return { executed: true, reason: "Position closed.", position: toPaperPosition(closed, null) };
}

/**
 * The paper-trading PaperTradingExecutor's entry point: re-derives the
 * current decision + risk check server-side (never trusts a client-supplied
 * proposal) and only ever opens a position when the risk engine APPROVED it.
 */
export async function executePaperTrade(userId: string, symbol: string): Promise<ExecutePaperTradeResult> {
  const db = getDb();

  const existingOpen = await db.query.paperPositions.findFirst({
    where: and(eq(paperPositions.userId, userId), eq(paperPositions.symbol, symbol), eq(paperPositions.status, "OPEN")),
  });
  if (existingOpen) {
    return { executed: false, reason: `Already have an open paper position on ${symbol}.`, position: null };
  }

  let decision;
  try {
    const enabledStrategies = await getEnabledStrategyNames(userId);
    decision = await getDecision(symbol, enabledStrategies);
    await recordDecision(userId, symbol, decision.proposal?.regime ?? "UNCERTAIN", decision);
  } catch (err) {
    if (err instanceof TradingEngineUnavailableError) {
      return { executed: false, reason: err.message, position: null };
    }
    throw err;
  }

  if (!decision.proposal || decision.action === "NO_TRADE") {
    return { executed: false, reason: `No actionable trade proposal for ${symbol} right now.`, position: null };
  }
  if (decision.proposal.side === "SHORT") {
    return {
      executed: false,
      reason: "Paper trading currently supports LONG (spot-style) positions only — margin/short simulation isn't built yet.",
      position: null,
    };
  }

  let riskCheck;
  try {
    const baseConfig = await getRiskConfig(userId);
    const { balanceOverride, accountState } = await getPaperRiskContext(userId);
    const config = balanceOverride !== null ? { ...baseConfig, accountBalanceUsd: balanceOverride } : baseConfig;
    riskCheck = await checkProposal(decision.proposal, config, accountState);
    await recordRiskCheck(userId, decision.proposal, config, riskCheck);
  } catch (err) {
    if (err instanceof RiskEngineUnavailableError) {
      return { executed: false, reason: err.message, position: null };
    }
    throw err;
  }

  if (riskCheck.decision !== "APPROVED" || !riskCheck.positionSize) {
    return { executed: false, reason: riskCheck.reasons.filter((r) => r).join(" "), position: null };
  }

  const account = await startAccount(userId);

  let currentPrice: number | null;
  try {
    currentPrice = await getCurrentPrice(symbol);
  } catch (err) {
    if (err instanceof MarketDataUnavailableError) {
      return { executed: false, reason: err.message, position: null };
    }
    throw err;
  }
  if (currentPrice === null) {
    return { executed: false, reason: `No live price available for ${symbol}.`, position: null };
  }

  // Fill at the live market price (not the proposal's possibly-stale entryPrice), recomputing
  // quantity from the risk-approved notional so the actual dollar risk still matches.
  const quantity = riskCheck.positionSize.notionalValueUsd / currentPrice;
  const entryFeeUsd = computeFee(quantity * currentPrice);
  const totalCost = quantity * currentPrice + entryFeeUsd;

  if (totalCost > account.balanceUsd) {
    return { executed: false, reason: "Insufficient virtual balance for this position size.", position: null };
  }

  const [position] = await db
    .insert(paperPositions)
    .values({
      userId,
      symbol,
      side: "LONG",
      strategy: decision.proposal.strategy,
      entryPrice: currentPrice,
      quantity,
      stopLoss: decision.proposal.stopLoss,
      takeProfit: decision.proposal.takeProfit,
      entryFeeUsd,
    })
    .returning();

  await db.insert(paperOrders).values({
    userId,
    positionId: position!.id,
    symbol,
    type: "ENTRY",
    quantity,
    price: currentPrice,
    feeUsd: entryFeeUsd,
  });

  await creditAccount(userId, -totalCost);

  return { executed: true, reason: "Position opened.", position: toPaperPosition(position!, currentPrice) };
}
