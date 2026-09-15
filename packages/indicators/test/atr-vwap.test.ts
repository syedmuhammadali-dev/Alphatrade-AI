import { describe, it, expect } from "vitest";
import { atr } from "../src/atr";
import { vwap } from "../src/vwap";
import type { Candle } from "@alphatrade/shared-types";

function candle(overrides: Partial<Candle>): Candle {
  return {
    symbol: "TEST",
    interval: "1m",
    openTime: 0,
    closeTime: 59,
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
    ...overrides,
  };
}

describe("atr", () => {
  it("matches a hand-computed Wilder ATR sequence (period=2)", () => {
    const candles: Candle[] = [
      candle({ high: 10, low: 8, close: 9 }),
      candle({ high: 11, low: 9, close: 10 }),
      candle({ high: 12, low: 10, close: 11 }),
      candle({ high: 9, low: 7, close: 8 }),
    ];

    const result = atr(candles, 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(2, 10);
    expect(result[3]).toBeCloseTo(3, 10);
  });
});

describe("vwap", () => {
  it("matches a hand-computed cumulative VWAP", () => {
    const candles: Candle[] = [
      candle({ high: 10, low: 8, close: 9, volume: 100 }),
      candle({ high: 11, low: 9, close: 10, volume: 200 }),
    ];

    const result = vwap(candles);
    expect(result[0]).toBeCloseTo(9, 10);
    expect(result[1]).toBeCloseTo(2900 / 300, 10);
  });
});
