import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { MarketDataStore } from "../src/store";
import { buildApp } from "../src/app";

describe("market-data HTTP API", () => {
  let app: FastifyInstance;
  const store = new MarketDataStore();

  beforeAll(async () => {
    store.upsertTicker({
      symbol: "BTCUSDT",
      lastPrice: 65000,
      priceChangePercent: 2.1,
      highPrice: 66000,
      lowPrice: 64000,
      quoteVolume: 1_000_000,
      updatedAt: new Date().toISOString(),
    });
    store.appendCandle({
      symbol: "BTCUSDT",
      interval: "1m",
      openTime: 1000,
      closeTime: 1059,
      open: 64900,
      high: 65100,
      low: 64800,
      close: 65000,
      volume: 12.5,
    });

    app = await buildApp(store, "USDT");
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health reports the ticker count", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, tickerCount: 1 });
  });

  it("GET /internal/scanner returns ranked entries", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/scanner" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(1);
    expect(body.entries[0].symbol).toBe("BTCUSDT");
    expect(body.entries[0].rank).toBe(1);
  });

  it("GET /internal/symbol/:symbol returns ticker + candles", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/symbol/btcusdt" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ticker.symbol).toBe("BTCUSDT");
    expect(body.candles).toHaveLength(1);
  });

  it("GET /internal/symbol/:symbol returns null ticker for an unknown symbol", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/symbol/UNKNOWNUSDT" });
    expect(res.statusCode).toBe(200);
    expect(res.json().ticker).toBeNull();
  });
});
