import { describe, it, expect } from "vitest";
import { detectStructure } from "../src/structure";
import type { Candle } from "@alphatrade/shared-types";

function buildCandles(highs: number[], lows: number[], closes: number[]): Candle[] {
  return highs.map((high, i) => ({
    symbol: "TEST",
    interval: "1m",
    openTime: i * 60_000,
    closeTime: i * 60_000 + 59_999,
    open: closes[i]!,
    high,
    low: lows[i]!,
    close: closes[i]!,
    volume: 100,
  }));
}

// Rising peaks [14,18,22,26] at indices [2,7,12,17] and rising troughs
// [8,9,10] at indices [4,9,14] — a textbook Higher-High/Higher-Low uptrend.
const BULLISH_HIGHS = [10, 12, 14, 12, 10, 12, 14, 18, 14, 12, 14, 16, 22, 16, 14, 16, 18, 26, 18, 16];
const BULLISH_LOWS = [8, 9, 10, 9, 8, 9, 10, 12, 10, 9, 10, 11, 14, 11, 10, 11, 12, 16, 12, 11];

describe("detectStructure", () => {
  it("recognizes an HH/HL bullish structure with support/resistance from the last swings", () => {
    const closes = BULLISH_HIGHS.map((h, i) => (h + BULLISH_LOWS[i]!) / 2);
    const candles = buildCandles(BULLISH_HIGHS, BULLISH_LOWS, closes);

    const result = detectStructure(candles, 2);

    expect(result.pattern).toBe("HH_HL");
    expect(result.bias).toBe("BULLISH_STRUCTURE");
    expect(result.resistance).toBe(26);
    expect(result.support).toBe(10);
    expect(result.breakout).toBe(false);
    expect(result.breakdown).toBe(false);
  });

  it("flags a breakout when the last close trades above the most recent resistance", () => {
    const closes = BULLISH_HIGHS.map((h, i) => (h + BULLISH_LOWS[i]!) / 2);
    closes[closes.length - 1] = 30; // above resistance (26)
    const candles = buildCandles(BULLISH_HIGHS, BULLISH_LOWS, closes);

    const result = detectStructure(candles, 2);
    expect(result.breakout).toBe(true);
  });

  it("recognizes an LH/LL bearish structure (mirror of the bullish case)", () => {
    const highs = [...BULLISH_HIGHS].reverse();
    const lows = [...BULLISH_LOWS].reverse();
    const closes = highs.map((h, i) => (h + lows[i]!) / 2);
    const candles = buildCandles(highs, lows, closes);

    const result = detectStructure(candles, 2);

    expect(result.pattern).toBe("LH_LL");
    expect(result.bias).toBe("BEARISH_STRUCTURE");
  });

  it("returns INSUFFICIENT_DATA when there aren't enough candles to find two swing points", () => {
    const highs = [10, 11, 12];
    const lows = [8, 9, 10];
    const closes = [9, 10, 11];
    const result = detectStructure(buildCandles(highs, lows, closes), 2);

    expect(result.pattern).toBe("INSUFFICIENT_DATA");
    expect(result.bias).toBe("RANGE");
  });
});
