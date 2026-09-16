import { describe, it, expect } from "vitest";
import { TrendFollowingStrategy } from "../src/strategies/trend-following";
import { makeContext } from "./fixtures";

const strategy = new TrendFollowingStrategy();

describe("TrendFollowingStrategy", () => {
  it("goes LONG when EMA20/50/200 and price are fully bullish-aligned", () => {
    const context = makeContext({
      analysis: { lastPrice: 110, ema20: 105, ema50: 100, ema200: 90, atr: 2, adx: 30 },
    });

    const signal = strategy.analyze(context);

    expect(signal.action).toBe("LONG");
    expect(signal.stopLoss).toBeCloseTo(107, 10);
    expect(signal.takeProfit).toBeCloseTo(116, 10);
    expect(signal.riskReward).toBeCloseTo(2, 10);
    expect(signal.confidence).toBeGreaterThan(0);
  });

  it("goes SHORT when EMA20/50/200 and price are fully bearish-aligned", () => {
    const context = makeContext({
      analysis: { lastPrice: 90, ema20: 95, ema50: 100, ema200: 110, atr: 2, adx: 30 },
    });

    const signal = strategy.analyze(context);

    expect(signal.action).toBe("SHORT");
    expect(signal.stopLoss).toBeCloseTo(93, 10);
    expect(signal.takeProfit).toBeCloseTo(84, 10);
    expect(signal.riskReward).toBeCloseTo(2, 10);
  });

  it("returns NO_TRADE when EMAs are not aligned", () => {
    const context = makeContext({
      analysis: { lastPrice: 100, ema20: 100, ema50: 105, ema200: 95, atr: 2 },
    });

    const signal = strategy.analyze(context);
    expect(signal.action).toBe("NO_TRADE");
  });

  it("returns NO_TRADE when there isn't enough EMA history yet", () => {
    const context = makeContext({ analysis: { ema20: null, ema50: null, ema200: null } });
    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });
});
