import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { buildApp } from "../src/app";

const HOUR_MS = 3_600_000;
const CANDLE_COUNT = 300;

/** A strong, consistent uptrend — the same shape the backtesting-engine package's own unit tests use. */
function rawKlineRows(): unknown[][] {
  return Array.from({ length: CANDLE_COUNT }, (_, i) => {
    const openTime = i * HOUR_MS;
    const low = 8 + i * 2;
    const high = 10 + i * 2;
    const close = 9 + i * 2;
    return [openTime, String(close), String(high), String(low), String(close), "1000", openTime + HOUR_MS - 1, "10000", 5, "500", "5000", "0"];
  });
}

function startFakeBinance(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const rows = rawKlineRows();
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const startTime = Number(url.searchParams.get("startTime") ?? 0);
      const endTime = Number(url.searchParams.get("endTime") ?? Infinity);
      const page = rows.filter((r) => (r[0] as number) >= startTime && (r[0] as number) <= endTime);
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(page));
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe("backtesting-engine HTTP API", () => {
  let app: FastifyInstance;
  let binanceServer: Server;

  beforeAll(async () => {
    const fake = await startFakeBinance();
    binanceServer = fake.server;
    app = await buildApp(fake.url);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => binanceServer.close(resolve));
  });

  it("GET /health responds ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("runs a full backtest over the fetched historical range and returns trades + metrics", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/run",
      payload: {
        symbol: "BTCUSDT",
        interval: "1h",
        startDate: new Date(0).toISOString(),
        endDate: new Date(CANDLE_COUNT * HOUR_MS).toISOString(),
        strategies: ["TrendFollowingStrategy"],
        minConfidence: 50,
        minRiskReward: 1,
        initialBalanceUsd: 10_000,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.trades.length).toBeGreaterThan(0);
    expect(body.metrics.tradeCount).toBe(body.trades.length);
    expect(body.metrics.totalReturnPercent).toBeGreaterThan(0);
  });

  it("400s when endDate is not after startDate", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/run",
      payload: {
        symbol: "BTCUSDT",
        interval: "1h",
        startDate: new Date(HOUR_MS * 10).toISOString(),
        endDate: new Date(0).toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400s on an invalid request body", async () => {
    const res = await app.inject({ method: "POST", url: "/internal/run", payload: { symbol: "BTCUSDT" } });
    expect(res.statusCode).toBe(400);
  });

  it("422s when no historical candles exist for the requested range", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/run",
      payload: {
        symbol: "BTCUSDT",
        interval: "1h",
        startDate: new Date(Date.now() + HOUR_MS * 1000).toISOString(),
        endDate: new Date(Date.now() + HOUR_MS * 2000).toISOString(),
      },
    });
    expect(res.statusCode).toBe(422);
  });
});
