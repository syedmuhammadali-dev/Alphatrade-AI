import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import { getDb, livePositions, type LivePositionRow } from "@alphatrade/database";
import { checkExitTrigger } from "@alphatrade/trade-executor";
import type { LivePosition, ExecuteLiveTradeResult } from "@alphatrade/shared-types";
import { getSymbolDetail, MarketDataUnavailableError } from "./market-data-client";
import { getDecision, TradingEngineUnavailableError } from "./trading-engine-client";
import { checkProposal, RiskEngineUnavailableError } from "./risk-engine-client";
import { getEnabledStrategyNames } from "./strategy-config-service";
import { getRiskConfig } from "./risk-config-service";
import { recordRiskCheck } from "./risk-check-service";
import { recordDecision } from "./trade-decision-service";
import { getDecryptedConnection } from "./exchange-connection-service";
import { placeLiveMarketOrder, ExchangeRejectedError, ExecutionEngineUnavailableError } from "./execution-engine-client";

async function getCurrentPrice(symbol: string): Promise<number | null> {
  const detail = await getSymbolDetail(symbol);
  return detail.ticker?.lastPrice ?? null;
}

function toLivePosition(row: LivePositionRow, currentPrice: number | null): LivePosition {
  const unrealizedPnlUsd =
    row.status === "OPEN" && currentPrice !== null ? (currentPrice - row.entryPrice) * row.quantity : null;

  return {
    id: row.id,
    connectionId: row.connectionId,
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
    entryOrderId: row.entryOrderId,
    exitOrderId: row.exitOrderId,
  };
}

/**
 * Places a real SELL market order to close the position and settles the
 * row. Known gap vs. paper trading: this doesn't net out the exchange's
 * own commission from realizedPnlUsd (commission can be charged in a third
 * asset like BNB, which needs a price conversion this MVP doesn't do yet) —
 * the P&L here is gross of the exchange's trading fee, not net.
 */
async function settleLivePosition(
  userId: string,
  position: LivePositionRow,
  reason: "TAKE_PROFIT" | "STOP_LOSS" | "MANUAL",
): Promise<LivePositionRow | null> {
  const db = getDb();
  const connection = await getDecryptedConnection(userId, position.connectionId);
  if (!connection) return null;

  const result = await placeLiveMarketOrder(connection, {
    symbol: position.symbol,
    side: "SELL",
    quantity: position.quantity,
    clientOrderId: `close-${position.id}`.slice(0, 36),
  });

  const executedQty = Number(result.executedQty);
  const exitPrice = executedQty > 0 ? Number(result.cummulativeQuoteQty) / executedQty : position.entryPrice;
  const realizedPnlUsd = (exitPrice - position.entryPrice) * position.quantity;

  const [closed] = await db
    .update(livePositions)
    .set({
      status: "CLOSED",
      closedAt: new Date(),
      closePrice: exitPrice,
      closeReason: reason,
      exitOrderId: String(result.orderId),
      realizedPnlUsd,
    })
    .where(eq(livePositions.id, position.id))
    .returning();

  return closed!;
}

/** Checks every open live position against its current price and auto-closes any that hit stop-loss/take-profit. Run by the bot orchestrator's tick, same as paper trading's protective exits. */
export async function monitorAndAutoCloseLive(userId: string): Promise<void> {
  const db = getDb();
  const open = await db.query.livePositions.findMany({
    where: and(eq(livePositions.userId, userId), eq(livePositions.status, "OPEN")),
  });

  for (const position of open) {
    const currentPrice = await getCurrentPrice(position.symbol).catch(() => null);
    if (currentPrice === null) continue;

    const trigger = checkExitTrigger("LONG", currentPrice, position.stopLoss, position.takeProfit);
    if (trigger) {
      await settleLivePosition(userId, position, trigger).catch(() => null);
    }
  }
}

export async function getOpenLivePositions(userId: string): Promise<LivePosition[]> {
  await monitorAndAutoCloseLive(userId);
  const db = getDb();
  const rows = await db.query.livePositions.findMany({
    where: and(eq(livePositions.userId, userId), eq(livePositions.status, "OPEN")),
    orderBy: desc(livePositions.openedAt),
  });
  return Promise.all(rows.map(async (row) => toLivePosition(row, await getCurrentPrice(row.symbol).catch(() => null))));
}

export async function getClosedLivePositions(userId: string): Promise<LivePosition[]> {
  const db = getDb();
  const rows = await db.query.livePositions.findMany({
    where: and(eq(livePositions.userId, userId), eq(livePositions.status, "CLOSED")),
    orderBy: desc(livePositions.closedAt),
  });
  return rows.map((row) => toLivePosition(row, null));
}

export async function manualCloseLivePosition(userId: string, positionId: string): Promise<ExecuteLiveTradeResult> {
  const db = getDb();
  const position = await db.query.livePositions.findFirst({
    where: and(eq(livePositions.id, positionId), eq(livePositions.userId, userId)),
  });
  if (!position) return { executed: false, reason: "Position not found.", position: null };
  if (position.status !== "OPEN") return { executed: false, reason: "Position is already closed.", position: null };

  try {
    const closed = await settleLivePosition(userId, position, "MANUAL");
    if (!closed) return { executed: false, reason: "Exchange connection not found.", position: null };
    return { executed: true, reason: "Position closed.", position: toLivePosition(closed, null) };
  } catch (err) {
    if (err instanceof ExchangeRejectedError || err instanceof ExecutionEngineUnavailableError) {
      return { executed: false, reason: err.message, position: null };
    }
    throw err;
  }
}

/**
 * Re-derives the decision + risk check server-side (never trusts a
 * client-supplied proposal), same as paper trading. Known gap: the risk
 * check here uses an empty AccountState (no live open-positions/exposure
 * context yet) — parity with paper trading's getPaperRiskContext is
 * deferred, documented honestly rather than faked.
 */
export async function executeLiveTrade(userId: string, symbol: string, connectionId: string): Promise<ExecuteLiveTradeResult> {
  const db = getDb();

  const existingOpen = await db.query.livePositions.findFirst({
    where: and(eq(livePositions.userId, userId), eq(livePositions.symbol, symbol), eq(livePositions.status, "OPEN")),
  });
  if (existingOpen) {
    return { executed: false, reason: `Already have an open live position on ${symbol}.`, position: null };
  }

  const connection = await getDecryptedConnection(userId, connectionId);
  if (!connection) {
    return { executed: false, reason: "Exchange connection not found.", position: null };
  }
  if (connection.row.canTrade === false) {
    return { executed: false, reason: "This exchange connection failed its last verification — reconnect or re-test it first.", position: null };
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
    return { executed: false, reason: "Live trading currently supports LONG (spot-style) positions only.", position: null };
  }

  let riskCheck;
  try {
    const config = await getRiskConfig(userId);
    riskCheck = await checkProposal(decision.proposal, config, {});
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

  const estimatedQuantity = riskCheck.positionSize.notionalValueUsd / currentPrice;

  let orderResult;
  try {
    orderResult = await placeLiveMarketOrder(connection, {
      symbol,
      side: "BUY",
      quantity: estimatedQuantity,
      clientOrderId: `entry-${randomUUID()}`.slice(0, 36),
    });
  } catch (err) {
    if (err instanceof ExchangeRejectedError || err instanceof ExecutionEngineUnavailableError) {
      return { executed: false, reason: err.message, position: null };
    }
    throw err;
  }

  const executedQty = Number(orderResult.executedQty);
  const entryPrice = executedQty > 0 ? Number(orderResult.cummulativeQuoteQty) / executedQty : currentPrice;

  const [position] = await db
    .insert(livePositions)
    .values({
      userId,
      connectionId,
      symbol,
      strategy: decision.proposal.strategy,
      entryPrice,
      quantity: executedQty,
      stopLoss: decision.proposal.stopLoss,
      takeProfit: decision.proposal.takeProfit,
      entryOrderId: String(orderResult.orderId),
    })
    .returning();

  return { executed: true, reason: "Position opened.", position: toLivePosition(position!, entryPrice) };
}
