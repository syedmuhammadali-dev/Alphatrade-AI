import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { buildApp } from "../src/app";

function fakeCandle(i: number) {
  return {
    symbol: "BTCUSDT",
    interval: "1m",
    openTime: i * 60_000,
    closeTime: i * 60_000 + 59_999,
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 10,
  };
}

function startFakeMarketData(candleCount: number): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url?.startsWith("/internal/symbol/")) {
        const candles = Array.from({ length: candleCount }, (_, i) => fakeCandle(i));
        res.end(JSON.stringify({ ticker: null, candles }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe("analysis-engine HTTP API", () => {
  let app: FastifyInstance;
  let fakeServer: Server;

  beforeAll(async () => {
    const fake = await startFakeMarketData(60);
    fakeServer = fake.server;
    app = await buildApp(fake.url);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => fakeServer.close(resolve));
  });

  it("GET /health responds ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("GET /internal/analysis/:symbol returns analysis, structure, and regime", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/analysis/BTCUSDT" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.analysis.symbol).toBe("BTCUSDT");
    expect(body.analysis.candleCount).toBe(60);
    expect(body.structure).not.toBeNull();
    expect(["TRENDING_BULLISH", "TRENDING_BEARISH", "RANGING", "HIGH_VOLATILITY", "LOW_VOLATILITY", "UNCERTAIN"]).toContain(
      body.regime,
    );
  });

  it("returns null analysis/structure when there isn't enough candle history yet", async () => {
    await new Promise((resolve) => fakeServer.close(resolve));
    const fake = await startFakeMarketData(5);
    fakeServer = fake.server;
    const shortApp = await buildApp(fake.url);
    await shortApp.ready();

    const res = await shortApp.inject({ method: "GET", url: "/internal/analysis/BTCUSDT" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.analysis).toBeNull();
    expect(body.structure).toBeNull();
    expect(body.regime).toBe("UNCERTAIN");

    await shortApp.close();
  });
});
