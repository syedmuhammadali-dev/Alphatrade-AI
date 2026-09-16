import { describe, it, expect } from "vitest";
import { BreakoutStrategy } from "../src/strategies/breakout";
import { makeContext } from "./fixtures";

const strategy = new BreakoutStrategy();

describe("BreakoutStrategy", () => {
  it("goes LONG on a volume-confirmed breakout above resistance", () => {
    const context = makeContext({
      analysis: { lastPrice: 100, atr: 2, volumeRatio: 1.5 },
      structure: { breakout: true, resistance: 95 },
    });

    const signal = strategy.analyze(context);

    expect(signal.action).toBe("LONG");
    expect(signal.stopLoss).toBeCloseTo(95, 10); // min(resistance, entry-atr) = min(95, 98)
    expect(signal.riskReward).toBeCloseTo(2, 10);
  });

  it("goes SHORT on a volume-confirmed breakdown below support", () => {
    const context = makeContext({
      analysis: { lastPrice: 100, atr: 2, volumeRatio: 1.5 },
      structure: { breakdown: true, support: 105 },
    });

    const signal = strategy.analyze(context);

    expect(signal.action).toBe("SHORT");
    expect(signal.stopLoss).toBeCloseTo(105, 10); // max(support, entry+atr) = max(105, 102)
  });

  it("returns NO_TRADE when a breakout lacks volume confirmation", () => {
    const context = makeContext({
      analysis: { lastPrice: 100, atr: 2, volumeRatio: 1.0 },
      structure: { breakout: true, resistance: 95 },
    });

    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });

  it("returns NO_TRADE when there is no breakout or breakdown", () => {
    const context = makeContext({ analysis: { atr: 2 } });
    expect(strategy.analyze(context).action).toBe("NO_TRADE");
  });
});
