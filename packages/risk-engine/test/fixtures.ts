import type { TradeProposal } from "@alphatrade/shared-types";

export function makeProposal(overrides: Partial<TradeProposal> = {}): TradeProposal {
  return {
    id: "proposal-1",
    symbol: "BTCUSDT",
    side: "LONG",
    strategy: "TrendFollowingStrategy",
    confidence: 80,
    entryPrice: 100,
    stopLoss: 95,
    takeProfit: 115,
    riskReward: 3,
    reasoning: "test",
    regime: "TRENDING_BULLISH",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
