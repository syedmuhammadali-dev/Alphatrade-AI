import { describe, it, expect } from "vitest";
import { MomentumStrategy } from "../src/strategies/momentum";
import { makeContext } from "./fixtures";

const strategy = new MomentumStrategy();

describe("MomentumStrategy", () => {
  it("goes LONG on confirmed bullish momentum (positive MACD histogram, RSI 50-70)", () => {
    const context = makeContext({
      analysis: { lastPrice: 100, atr: 2, rsi: 60, macd: { value: 1, signal: 0.5, histogram: 0.5 } },
    });

    const signal = strategy.analyze(context);

    expect(signal.action).toBe("LONG");
    expect(signal.stopLoss).toBeCloseTo(97.6, 10);
    expect(signal.riskReward).toBeCloseTo(1.5, 10);
  });

  it("goes SHORT on confirmed bearish momentum (negative MACD histogram, RSI 30-50)", () => {
    const context = makeContext({
      analysis: { lastPrice: 100, atr: 2, rsi: 40, macd: { value: -1, signal: -0.5, histogram: -0.5 } },
    });

    expect(strategy.analyze(context).action).toBe("SHORT");
  });

  it("returns NO_TRADE when RSI is already overbought despite positive momentum", () => {
    const context = makeContext({
      analysis: { rsi: 75, atr: 2, macd: { value: 1, signal: 0.5, histogram: 0.5 } },
    });

    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });

  it("returns NO_TRADE when there isn't enough history yet", () => {
    const context = makeContext({ analysis: { atr: null } });
    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });
});
