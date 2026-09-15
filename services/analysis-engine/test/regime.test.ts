import { describe, it, expect } from "vitest";
import { DeterministicRegimeDetector } from "../src/regime";
import type { Candle } from "@alphatrade/shared-types";

function candle(high: number, low: number, close: number): Candle {
  return { symbol: "TEST", interval: "1m", openTime: 0, closeTime: 59, open: close, high, low, close, volume: 100 };
}

const detector = new DeterministicRegimeDetector();

describe("DeterministicRegimeDetector", () => {
  it("classifies a strong, consistent uptrend as TRENDING_BULLISH", () => {
    const candles = Array.from({ length: 60 }, (_, i) => candle(10 + i * 2, 8 + i * 2, 9 + i * 2));
    expect(detector.detect({ candles })).toBe("TRENDING_BULLISH");
  });

  it("classifies a strong, consistent downtrend as TRENDING_BEARISH", () => {
    const candles = Array.from({ length: 60 }, (_, i) => {
      const base = 200 - i * 2;
      return candle(base + 2, base - 2, base);
    });
    expect(detector.detect({ candles })).toBe("TRENDING_BEARISH");
  });

  it("classifies a flat, constant-range series as RANGING (not trending, average volatility)", () => {
    const candles = Array.from({ length: 60 }, () => candle(10.5, 9.5, 10));
    expect(detector.detect({ candles })).toBe("RANGING");
  });

  it("returns UNCERTAIN when there isn't enough history for ADX yet", () => {
    const candles = Array.from({ length: 5 }, (_, i) => candle(10 + i, 8 + i, 9 + i));
    expect(detector.detect({ candles })).toBe("UNCERTAIN");
  });

  it("classifies a sudden range expansion (still non-trending) as HIGH_VOLATILITY", () => {
    // Random-ish flat wobble (no directional trend => low ADX) with a sharp
    // range expansion only in the last few bars.
    const calm = Array.from({ length: 55 }, (_, i) => {
      const wobble = i % 2 === 0 ? 0.3 : -0.3;
      return candle(10 + wobble, 9.5 + wobble, 9.75 + wobble);
    });
    const spike = Array.from({ length: 5 }, (_, i) => {
      const wobble = i % 2 === 0 ? 6 : -6;
      return candle(10 + wobble, 9.5 + wobble - 5, 9.75 + wobble);
    });
    expect(detector.detect({ candles: [...calm, ...spike] })).toBe("HIGH_VOLATILITY");
  });

  it("classifies a sudden range contraction (still non-trending) as LOW_VOLATILITY", () => {
    const wide = Array.from({ length: 30 }, (_, i) => {
      const wobble = i % 2 === 0 ? 3 : -3;
      return candle(10 + wobble, 5 + wobble, 7.5 + wobble);
    });
    const quiet = Array.from({ length: 25 }, () => candle(10.05, 9.95, 10));
    expect(detector.detect({ candles: [...wide, ...quiet] })).toBe("LOW_VOLATILITY");
  });
});
