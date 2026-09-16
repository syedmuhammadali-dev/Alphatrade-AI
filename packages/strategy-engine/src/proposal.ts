import { randomUUID } from "node:crypto";
import type { StrategySignal, TradeProposal, MarketRegime } from "@alphatrade/shared-types";

/** Builds the Autonomous Decision Engine's TradeProposal output. Never executed here — always routed through the risk engine first. */
export function buildProposal(symbol: string, signal: StrategySignal, regime: MarketRegime): TradeProposal | null {
  if (signal.action === "NO_TRADE" || signal.stopLoss === null || signal.takeProfit === null || signal.riskReward === null) {
    return null;
  }

  const entry = signal.entryZone ? (signal.entryZone[0] + signal.entryZone[1]) / 2 : null;
  if (entry === null) return null;

  return {
    id: randomUUID(),
    symbol,
    side: signal.action,
    strategy: signal.strategyName,
    confidence: signal.confidence,
    entryPrice: entry,
    stopLoss: signal.stopLoss,
    takeProfit: signal.takeProfit,
    riskReward: signal.riskReward,
    reasoning: signal.reasoning,
    regime,
    createdAt: new Date().toISOString(),
  };
}
