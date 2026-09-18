import { describe, it, expect } from "vitest";
import { computeMetrics } from "../src/metrics";
import type { BacktestTrade } from "@alphatrade/shared-types";

function trade(overrides: Partial<BacktestTrade>): BacktestTrade {
  return {
    symbol: "BTCUSDT",
    side: "LONG",
    strategy: "TrendFollowingStrategy",
    entryTime: "2024-01-01T00:00:00.000Z",
    entryPrice: 100,
    exitTime: "2024-01-01T01:00:00.000Z",
    exitPrice: 110,
    quantity: 1,
    stopLoss: 95,
    takeProfit: 110,
    closeReason: "TAKE_PROFIT",
    entryFeeUsd: 0.1,
    exitFeeUsd: 0.11,
    realizedPnlUsd: 9.79,
    realizedRiskReward: 2,
    ...overrides,
  };
}

describe("computeMetrics", () => {
  it("returns all-null/zero stats for an empty trade list", () => {
    const metrics = computeMetrics([], 10_000, 10_000);
    expect(metrics.tradeCount).toBe(0);
    expect(metrics.winRate).toBeNull();
    expect(metrics.profitFactor).toBeNull();
    expect(metrics.sharpeRatio).toBeNull();
    expect(metrics.totalReturnPercent).toBe(0);
    expect(metrics.maxDrawdownPercent).toBe(0);
  });

  it("computes win rate, profit factor, and total return over a mix of wins and losses", () => {
    const trades = [
      trade({ realizedPnlUsd: 100, realizedRiskReward: 2 }),
      trade({ realizedPnlUsd: -50, realizedRiskReward: -1 }),
      trade({ realizedPnlUsd: 200, realizedRiskReward: 4 }),
    ];
    const metrics = computeMetrics(trades, 10_000, 10_250);

    expect(metrics.tradeCount).toBe(3);
    expect(metrics.wins).toBe(2);
    expect(metrics.losses).toBe(1);
    expect(metrics.winRate).toBeCloseTo((2 / 3) * 100, 10);
    expect(metrics.profitFactor).toBeCloseTo(300 / 50, 10); // gross profit 300 / gross loss 50
    expect(metrics.totalReturnPercent).toBeCloseTo(2.5, 10); // (10250-10000)/10000*100
    expect(metrics.averageRiskReward).toBeCloseTo((2 - 1 + 4) / 3, 10);
  });

  it("reports max drawdown from the equity curve, not just the final balance", () => {
    // Equity path: 10000 -> 10500 (peak) -> 10000 (drawdown ~4.76%) -> 10800 (new peak, recovered)
    const trades = [
      trade({ realizedPnlUsd: 500 }),
      trade({ realizedPnlUsd: -500 }),
      trade({ realizedPnlUsd: 800 }),
    ];
    const metrics = computeMetrics(trades, 10_000, 10_800);

    expect(metrics.maxDrawdownPercent).toBeCloseTo((500 / 10_500) * 100, 5);
  });

  it("treats a break-even trade (pnl exactly 0) as a loss, not a win", () => {
    const metrics = computeMetrics([trade({ realizedPnlUsd: 0, realizedRiskReward: 0 })], 10_000, 10_000);
    expect(metrics.wins).toBe(0);
    expect(metrics.losses).toBe(1);
  });
});
