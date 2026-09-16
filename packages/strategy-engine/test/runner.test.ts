import { describe, it, expect } from "vitest";
import { runStrategy, runAllStrategies, selectBestSignal } from "../src/runner";
import { TrendFollowingStrategy } from "../src/strategies/trend-following";
import { STRATEGIES } from "../src/strategies";
import { noTradeSignal } from "../src/types";
import { makeContext } from "./fixtures";

describe("runStrategy", () => {
  it("gates a strategy to NO_TRADE outside its required regime, even if it would otherwise signal", () => {
    const strategy = new TrendFollowingStrategy();
    const context = makeContext({
      regime: "RANGING", // TrendFollowingStrategy only runs in TRENDING_BULLISH/BEARISH
      analysis: { lastPrice: 110, ema20: 105, ema50: 100, ema200: 90, atr: 2 },
    });

    const signal = runStrategy(strategy, context);

    expect(signal.action).toBe("NO_TRADE");
    expect(signal.reasoning).toContain("RANGING");
  });

  it("lets a strategy analyze normally inside its required regime", () => {
    const strategy = new TrendFollowingStrategy();
    const context = makeContext({
      regime: "TRENDING_BULLISH",
      analysis: { lastPrice: 110, ema20: 105, ema50: 100, ema200: 90, atr: 2 },
    });

    expect(runStrategy(strategy, context).action).toBe("LONG");
  });
});

describe("runAllStrategies", () => {
  it("returns one signal per registered strategy", () => {
    const context = makeContext({ regime: "RANGING" });
    expect(runAllStrategies(context)).toHaveLength(STRATEGIES.length);
  });
});

describe("selectBestSignal", () => {
  it("picks the highest-confidence actionable signal", () => {
    const low = { ...noTradeSignal("A", ""), action: "LONG" as const, confidence: 40 };
    const high = { ...noTradeSignal("B", ""), action: "SHORT" as const, confidence: 80 };
    expect(selectBestSignal([low, high]).strategyName).toBe("B");
  });

  it("returns NO_TRADE when every strategy returned NO_TRADE", () => {
    const signals = [noTradeSignal("A", "x"), noTradeSignal("B", "y")];
    expect(selectBestSignal(signals).action).toBe("NO_TRADE");
  });
});
