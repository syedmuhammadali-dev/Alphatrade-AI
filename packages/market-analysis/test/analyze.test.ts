import { describe, it, expect } from "vitest";
import { analyze } from "../src/analyze";
import type { Candle } from "@alphatrade/shared-types";

function candle(close: number, volume = 100): Candle {
  return {
    symbol: "TEST",
    interval: "1m",
    openTime: 0,
    closeTime: 59,
    open: close,
    high: close + 0.5,
    low: close - 0.5,
    close,
    volume,
  };
}

describe("analyze", () => {
  it("returns nulls for indicators that need more history than provided", () => {
    const candles = Array.from({ length: 5 }, (_, i) => candle(10 + i));
    const result = analyze("BTCUSDT", "1m", candles);

    expect(result.symbol).toBe("BTCUSDT");
    expect(result.candleCount).toBe(5);
    expect(result.ema200).toBeNull();
    expect(result.rsi).toBeNull();
    expect(result.trend).toBe("neutral");
  });

  it("derives a bullish trend when price and EMAs are stacked upward", () => {
    const candles = Array.from({ length: 60 }, (_, i) => candle(10 + i));
    const result = analyze("BTCUSDT", "1m", candles);

    expect(result.ema20).not.toBeNull();
    expect(result.ema50).not.toBeNull();
    expect(result.trend).toBe("bullish");
    expect(result.rsi).not.toBeNull();
    expect(result.rsi!).toBeGreaterThan(50);
  });

  it("derives a bearish trend when price and EMAs are stacked downward", () => {
    const candles = Array.from({ length: 60 }, (_, i) => candle(100 - i));
    const result = analyze("BTCUSDT", "1m", candles);

    expect(result.trend).toBe("bearish");
    expect(result.rsi!).toBeLessThan(50);
  });

  it("computes volumeRatio above 1 when the latest volume spikes above its baseline", () => {
    const candles = Array.from({ length: 25 }, (_, i) => candle(10 + i * 0.01, 100));
    candles[candles.length - 1] = candle(candles[candles.length - 1]!.close, 500);

    const result = analyze("BTCUSDT", "1m", candles);
    expect(result.volumeRatio).not.toBeNull();
    expect(result.volumeRatio!).toBeGreaterThan(1);
  });
});
