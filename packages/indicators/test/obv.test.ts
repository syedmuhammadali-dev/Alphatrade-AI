import { describe, it, expect } from "vitest";
import { obv } from "../src/obv";
import type { Candle } from "@alphatrade/shared-types";

function candle(close: number, volume: number): Candle {
  return {
    symbol: "TEST",
    interval: "1m",
    openTime: 0,
    closeTime: 59,
    open: close,
    high: close,
    low: close,
    close,
    volume,
  };
}

describe("obv", () => {
  it("matches a hand-computed cumulative OBV sequence", () => {
    const candles = [candle(10, 100), candle(11, 50), candle(10, 80), candle(12, 60)];
    expect(obv(candles)).toEqual([0, 50, -30, 30]);
  });

  it("does not change on a flat close", () => {
    const candles = [candle(10, 100), candle(10, 50)];
    expect(obv(candles)).toEqual([0, 0]);
  });
});
