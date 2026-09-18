import { describe, it, expect } from "vitest";
import { runBacktest } from "../src/simulate";
import type { Candle } from "@alphatrade/shared-types";

function candle(i: number, openTime: number): Candle {
  const low = 8 + i * 2;
  const high = 10 + i * 2;
  const close = 9 + i * 2;
  return { symbol: "BTCUSDT", interval: "1h", openTime, closeTime: openTime + 3_599_999, open: close, high, low, close, volume: 1000 };
}

/** A long, strong, consistent uptrend — enough bars for EMA200 + ADX to confirm TRENDING_BULLISH throughout. */
function uptrendCandles(count: number): Candle[] {
  return Array.from({ length: count }, (_, i) => candle(i, i * 3_600_000));
}

describe("runBacktest", () => {
  it("does nothing over too few candles to compute any indicators", () => {
    const result = runBacktest(uptrendCandles(10), {
      symbol: "BTCUSDT",
      interval: "1h",
      minConfidence: 60,
      minRiskReward: 1.5,
      initialBalanceUsd: 10_000,
    });

    expect(result.trades).toHaveLength(0);
    expect(result.metrics.finalBalanceUsd).toBe(10_000);
    expect(result.metrics.totalReturnPercent).toBe(0);
  });

  it("opens and profitably closes LONG trend-following trades over a strong sustained uptrend", () => {
    const result = runBacktest(uptrendCandles(300), {
      symbol: "BTCUSDT",
      interval: "1h",
      strategies: ["TrendFollowingStrategy"],
      minConfidence: 50,
      minRiskReward: 1,
      initialBalanceUsd: 10_000,
    });

    expect(result.trades.length).toBeGreaterThan(0);
    for (const trade of result.trades) {
      expect(trade.side).toBe("LONG");
      expect(trade.strategy).toBe("TrendFollowingStrategy");
      expect(["TAKE_PROFIT", "END_OF_BACKTEST"]).toContain(trade.closeReason); // never stopped out in a monotonic uptrend
    }

    // Balance bookkeeping must exactly reconcile with the sum of realized P&L.
    const totalPnl = result.trades.reduce((sum, t) => sum + t.realizedPnlUsd, 0);
    expect(result.metrics.finalBalanceUsd).toBeCloseTo(10_000 + totalPnl, 5);
    expect(result.metrics.totalReturnPercent).toBeGreaterThan(0);
    expect(result.metrics.wins).toBeGreaterThan(0);
  });

  it("never opens a second position while one is already open", () => {
    const result = runBacktest(uptrendCandles(300), {
      symbol: "BTCUSDT",
      interval: "1h",
      strategies: ["TrendFollowingStrategy"],
      minConfidence: 50,
      minRiskReward: 1,
      initialBalanceUsd: 10_000,
    });

    // Every trade's entry must be at or after the previous trade's exit.
    for (let i = 1; i < result.trades.length; i++) {
      expect(new Date(result.trades[i]!.entryTime).getTime()).toBeGreaterThanOrEqual(
        new Date(result.trades[i - 1]!.exitTime).getTime(),
      );
    }
  });
});
