import { describe, it, expect } from "vitest";
import { normalizeMiniTicker, normalizeKline } from "../src/binance/normalize";
import type { RawBinanceMiniTicker, RawBinanceKline } from "../src/binance/types";

describe("normalizeMiniTicker", () => {
  it("maps raw Binance mini-ticker fields to our normalized shape", () => {
    const raw: RawBinanceMiniTicker = {
      e: "24hrMiniTicker",
      E: 1700000000000,
      s: "BTCUSDT",
      c: "78371.99000000",
      o: "79352.66000000",
      h: "79485.00000000",
      l: "77620.01000000",
      v: "12345.6789",
      q: "987654321.12",
    };

    const result = normalizeMiniTicker(raw, new Date("2024-01-01T00:00:00.000Z"));

    expect(result.symbol).toBe("BTCUSDT");
    expect(result.lastPrice).toBe(78371.99);
    expect(result.highPrice).toBe(79485.0);
    expect(result.lowPrice).toBe(77620.01);
    expect(result.quoteVolume).toBe(987654321.12);
    expect(result.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    // priceChangePercent is derived from open/close since miniTicker has no p/P fields.
    expect(result.priceChangePercent).toBeCloseTo(((78371.99 - 79352.66) / 79352.66) * 100, 5);
  });

  it("returns 0% change when open price is 0 (avoids divide-by-zero)", () => {
    const raw: RawBinanceMiniTicker = {
      e: "24hrMiniTicker",
      E: 1700000000000,
      s: "NEWUSDT",
      c: "1.00",
      o: "0",
      h: "1.00",
      l: "1.00",
      v: "0",
      q: "0",
    };

    const result = normalizeMiniTicker(raw);
    expect(result.priceChangePercent).toBe(0);
  });
});

describe("normalizeKline", () => {
  it("maps raw Binance kline fields to our normalized candle shape", () => {
    const raw: RawBinanceKline = {
      t: 1700000000000,
      T: 1700000059999,
      s: "ETHUSDT",
      i: "1m",
      o: "3000.10",
      c: "3005.50",
      h: "3010.00",
      l: "2995.00",
      v: "150.25",
      x: true,
    };

    const result = normalizeKline(raw);

    expect(result).toEqual({
      symbol: "ETHUSDT",
      interval: "1m",
      openTime: 1700000000000,
      closeTime: 1700000059999,
      open: 3000.1,
      high: 3010.0,
      low: 2995.0,
      close: 3005.5,
      volume: 150.25,
    });
  });
});
