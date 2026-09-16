import { describe, it, expect } from "vitest";
import { MeanReversionStrategy } from "../src/strategies/mean-reversion";
import { makeContext } from "./fixtures";

const strategy = new MeanReversionStrategy();

describe("MeanReversionStrategy", () => {
  it("goes LONG when RSI is oversold at the Bollinger lower band", () => {
    const context = makeContext({
      analysis: { lastPrice: 89, atr: 2, rsi: 25, bollinger: { upper: 110, middle: 100, lower: 90 } },
    });

    const signal = strategy.analyze(context);

    expect(signal.action).toBe("LONG");
    expect(signal.stopLoss).toBeCloseTo(87, 10);
    expect(signal.takeProfit).toBe(100);
    expect(signal.riskReward).toBeCloseTo(11 / 2, 10);
  });

  it("goes SHORT when RSI is overbought at the Bollinger upper band", () => {
    const context = makeContext({
      analysis: { lastPrice: 111, atr: 2, rsi: 75, bollinger: { upper: 110, middle: 100, lower: 90 } },
    });

    expect(strategy.analyze(context).action).toBe("SHORT");
  });

  it("returns NO_TRADE when RSI is oversold but price hasn't reached the band", () => {
    const context = makeContext({
      analysis: { lastPrice: 95, atr: 2, rsi: 25, bollinger: { upper: 110, middle: 100, lower: 90 } },
    });

    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });

  it("returns NO_TRADE when there isn't enough Bollinger history yet", () => {
    const context = makeContext({ analysis: { bollinger: { upper: null, middle: null, lower: null } } });
    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });
});
