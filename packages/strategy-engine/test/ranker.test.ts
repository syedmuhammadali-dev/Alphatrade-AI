import { describe, it, expect } from "vitest";
import { scoreOpportunity, rankOpportunities, type RankerInput } from "../src/ranker";
import { noTradeSignal } from "../src/types";
import { makeAnalysis, makeStructure } from "./fixtures";
import type { StrategySignal } from "@alphatrade/shared-types";

function longSignal(overrides: Partial<StrategySignal> = {}): StrategySignal {
  return {
    strategyName: "TestStrategy",
    action: "LONG",
    confidence: 80,
    entryZone: [100, 100],
    stopLoss: 95,
    takeProfit: 115,
    riskReward: 3,
    reasoning: "test",
    ...overrides,
  };
}

describe("scoreOpportunity", () => {
  it("scores a NO_TRADE opportunity as 0 with no proposal", () => {
    const result = scoreOpportunity({
      symbol: "BTCUSDT",
      analysis: makeAnalysis(),
      structure: makeStructure(),
      regime: "UNCERTAIN",
      quoteVolume: 1_000_000,
      bestSignal: noTradeSignal("none", "nothing"),
    });

    expect(result.totalScore).toBe(0);
    expect(result.action).toBe("NO_TRADE");
    expect(result.proposal).toBeNull();
  });

  it("scores an actionable opportunity above 0 and builds a proposal", () => {
    const input: RankerInput = {
      symbol: "BTCUSDT",
      analysis: makeAnalysis({ adx: 40, volumeRatio: 1.5 }),
      structure: makeStructure({ bias: "BULLISH_STRUCTURE" }),
      regime: "TRENDING_BULLISH",
      quoteVolume: 1_000_000_000,
      bestSignal: longSignal(),
    };

    const result = scoreOpportunity(input);

    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.recommendedStrategy).toBe("TestStrategy");
    expect(result.proposal).not.toBeNull();
    expect(result.proposal!.symbol).toBe("BTCUSDT");
    expect(result.proposal!.entryPrice).toBe(100);
  });

  it("rewards structure alignment: a LONG signal scores higher with bullish structure than bearish", () => {
    const base = {
      symbol: "BTCUSDT",
      analysis: makeAnalysis(),
      regime: "TRENDING_BULLISH" as const,
      quoteVolume: 1_000_000,
      bestSignal: longSignal(),
    };
    const aligned = scoreOpportunity({ ...base, structure: makeStructure({ bias: "BULLISH_STRUCTURE" }) });
    const opposing = scoreOpportunity({ ...base, structure: makeStructure({ bias: "BEARISH_STRUCTURE" }) });

    expect(aligned.totalScore).toBeGreaterThan(opposing.totalScore);
  });
});

describe("rankOpportunities", () => {
  it("sorts by score descending and assigns 1-based ranks", () => {
    const highConfidence = longSignal({ confidence: 90 });
    const lowConfidence = longSignal({ confidence: 30 });

    const inputs: RankerInput[] = [
      {
        symbol: "LOWUSDT",
        analysis: makeAnalysis(),
        structure: makeStructure(),
        regime: "TRENDING_BULLISH",
        quoteVolume: 1_000,
        bestSignal: lowConfidence,
      },
      {
        symbol: "HIGHUSDT",
        analysis: makeAnalysis(),
        structure: makeStructure(),
        regime: "TRENDING_BULLISH",
        quoteVolume: 1_000,
        bestSignal: highConfidence,
      },
      {
        symbol: "NOTRADEUSDT",
        analysis: makeAnalysis(),
        structure: makeStructure(),
        regime: "UNCERTAIN",
        quoteVolume: 1_000,
        bestSignal: noTradeSignal("none", "nothing"),
      },
    ];

    const ranked = rankOpportunities(inputs);

    expect(ranked.map((r) => r.symbol)).toEqual(["HIGHUSDT", "LOWUSDT", "NOTRADEUSDT"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
