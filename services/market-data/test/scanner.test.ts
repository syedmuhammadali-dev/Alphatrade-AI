import { describe, it, expect } from "vitest";
import { MarketDataStore } from "../src/store";
import { buildScanner } from "../src/scanner";
import type { TickerSnapshot } from "@alphatrade/shared-types";

function ticker(overrides: Partial<TickerSnapshot>): TickerSnapshot {
  return {
    symbol: "BTCUSDT",
    lastPrice: 100,
    priceChangePercent: 1,
    highPrice: 110,
    lowPrice: 90,
    quoteVolume: 1000,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildScanner", () => {
  it("ranks symbols by quote volume descending", () => {
    const store = new MarketDataStore();
    store.upsertTicker(ticker({ symbol: "BTCUSDT", quoteVolume: 5000 }));
    store.upsertTicker(ticker({ symbol: "ETHUSDT", quoteVolume: 9000 }));
    store.upsertTicker(ticker({ symbol: "DOGEUSDT", quoteVolume: 1000 }));

    const entries = buildScanner(store);

    expect(entries.map((e) => e.symbol)).toEqual(["ETHUSDT", "BTCUSDT", "DOGEUSDT"]);
    expect(entries.map((e) => e.rank)).toEqual([1, 2, 3]);
  });

  it("filters by quote asset suffix", () => {
    const store = new MarketDataStore();
    store.upsertTicker(ticker({ symbol: "BTCUSDT", quoteVolume: 5000 }));
    store.upsertTicker(ticker({ symbol: "BTCEUR", quoteVolume: 9000 }));

    const entries = buildScanner(store, { quoteFilter: "USDT" });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.symbol).toBe("BTCUSDT");
  });

  it("respects the limit option", () => {
    const store = new MarketDataStore();
    for (let i = 0; i < 10; i++) {
      store.upsertTicker(ticker({ symbol: `SYM${i}USDT`, quoteVolume: i }));
    }

    const entries = buildScanner(store, { limit: 3 });

    expect(entries).toHaveLength(3);
  });
});

describe("MarketDataStore candles", () => {
  it("dedupes candles with the same open time and keeps them sorted", () => {
    const store = new MarketDataStore();
    store.appendCandle({
      symbol: "BTCUSDT",
      interval: "1m",
      openTime: 2000,
      closeTime: 2059,
      open: 1,
      high: 2,
      low: 0,
      close: 1.5,
      volume: 10,
    });
    store.appendCandle({
      symbol: "BTCUSDT",
      interval: "1m",
      openTime: 1000,
      closeTime: 1059,
      open: 1,
      high: 2,
      low: 0,
      close: 1.5,
      volume: 10,
    });
    // Re-close of the same bar (e.g. a late update) should replace, not duplicate.
    store.appendCandle({
      symbol: "BTCUSDT",
      interval: "1m",
      openTime: 2000,
      closeTime: 2059,
      open: 1,
      high: 3,
      low: 0,
      close: 2.5,
      volume: 20,
    });

    const candles = store.getCandles("BTCUSDT", "1m");
    expect(candles.map((c) => c.openTime)).toEqual([1000, 2000]);
    expect(candles[1]?.close).toBe(2.5);
  });
});
