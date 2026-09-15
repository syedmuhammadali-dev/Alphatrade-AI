import { describe, it, expect } from "vitest";
import { adx } from "../src/adx";
import type { Candle } from "@alphatrade/shared-types";

function candle(high: number, low: number, close: number): Candle {
  return { symbol: "TEST", interval: "1m", openTime: 0, closeTime: 59, open: close, high, low, close, volume: 100 };
}

describe("adx", () => {
  it("returns null until 2*period candles are available", () => {
    const candles = Array.from({ length: 10 }, (_, i) => candle(10 + i, 8 + i, 9 + i));
    const result = adx(candles, 14);
    expect(result.every((v) => v === null)).toBe(true);
  });

  it("reports a high value for a strongly, consistently trending series", () => {
    // Strictly higher highs and higher lows every bar — a textbook strong uptrend.
    const candles = Array.from({ length: 40 }, (_, i) => candle(10 + i * 2, 8 + i * 2, 9 + i * 2));
    const result = adx(candles, 14);
    const lastValue = result[result.length - 1];
    expect(lastValue).not.toBeNull();
    expect(lastValue!).toBeGreaterThan(25);
  });

  it("reports a low value for a flat, non-trending series", () => {
    const candles = Array.from({ length: 40 }, () => candle(10.5, 9.5, 10));
    const result = adx(candles, 14);
    const lastValue = result[result.length - 1];
    expect(lastValue).not.toBeNull();
    expect(lastValue!).toBeLessThan(10);
  });

  it("stays within [0, 100]", () => {
    const closes = [10, 12, 9, 15, 14, 16, 13, 18, 17, 20, 19, 22, 21, 25, 24, 28, 27, 30, 29, 33, 32, 36, 35, 39, 38, 42, 41, 45, 44, 48, 47];
    const candles = closes.map((c, i) => candle(c + 1, c - 1, c));
    const result = adx(candles, 14);
    for (const value of result) {
      if (value !== null) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});
