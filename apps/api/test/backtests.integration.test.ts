import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

const SAMPLE_TRADE = {
  symbol: "BTCUSDT",
  side: "LONG",
  strategy: "TrendFollowingStrategy",
  entryTime: "2024-01-01T00:00:00.000Z",
  entryPrice: 100,
  exitTime: "2024-01-01T05:00:00.000Z",
  exitPrice: 120,
  quantity: 10,
  stopLoss: 90,
  takeProfit: 120,
  closeReason: "TAKE_PROFIT",
  entryFeeUsd: 1,
  exitFeeUsd: 1.2,
  realizedPnlUsd: 197.8,
  realizedRiskReward: 1.978,
};

const SAMPLE_RESULT = {
  metrics: {
    initialBalanceUsd: 10_000,
    finalBalanceUsd: 10_197.8,
    totalReturnPercent: 1.978,
    tradeCount: 1,
    wins: 1,
    losses: 0,
    winRate: 100,
    profitFactor: null,
    sharpeRatio: null,
    maxDrawdownPercent: 0,
    averageRiskReward: 1.978,
  },
  trades: [SAMPLE_TRADE],
};

/** Requests for FAILSYM simulate the engine rejecting an unrunnable request (bad range, unknown symbol, etc). */
function startFakeBacktestingEngine(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        res.setHeader("content-type", "application/json");
        if (body.symbol === "FAILSYM") {
          res.statusCode = 422;
          res.end(JSON.stringify({ error: "No historical candles found for the requested symbol/date range." }));
          return;
        }
        res.end(JSON.stringify(SAMPLE_RESULT));
      });
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

const VALID_REQUEST = {
  symbol: "BTCUSDT",
  interval: "1h",
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: "2024-01-10T00:00:00.000Z",
  initialBalanceUsd: 10_000,
};

describe("backtests routes", () => {
  let app: FastifyInstance;
  let backtestingServer: Server;
  let accessCookie: string;

  beforeAll(async () => {
    const fake = await startFakeBacktestingEngine();
    backtestingServer = fake.server;
    process.env.BACKTESTING_ENGINE_URL = fake.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `backtest-test-${randomUUID()}@example.com`;
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "a-very-secure-password-123" },
    });
    const setCookie = registerRes.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
    accessCookie = cookies.find((c) => c.startsWith("access_token="))!.split(";")[0]!;
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
    await new Promise((resolve) => backtestingServer.close(resolve));
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/backtests" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /backtests starts empty", async () => {
    const res = await app.inject({ method: "GET", url: "/backtests", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().backtests).toEqual([]);
  });

  it("400s on an invalid request body", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/backtests",
      headers: { cookie: accessCookie },
      payload: { symbol: "BTCUSDT" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400s when endDate is not after startDate", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/backtests",
      headers: { cookie: accessCookie },
      payload: { ...VALID_REQUEST, startDate: VALID_REQUEST.endDate, endDate: VALID_REQUEST.startDate },
    });
    expect(res.statusCode).toBe(400);
  });

  let createdId: string;

  it("POST /backtests runs the backtest and persists a COMPLETED result", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/backtests",
      headers: { cookie: accessCookie },
      payload: VALID_REQUEST,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe("COMPLETED");
    expect(body.metrics.tradeCount).toBe(1);
    expect(body.metrics.totalReturnPercent).toBeCloseTo(1.978, 5);
    expect(body.trades).toHaveLength(1);
    createdId = body.id;
  });

  it("GET /backtests now lists the completed run in summary form", async () => {
    const res = await app.inject({ method: "GET", url: "/backtests", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const list = res.json().backtests;
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(createdId);
    expect(list[0].status).toBe("COMPLETED");
    expect(list[0].tradeCount).toBe(1);
  });

  it("GET /backtests/:id returns the full detail including trades", async () => {
    const res = await app.inject({ method: "GET", url: `/backtests/${createdId}`, headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(createdId);
    expect(body.trades[0].symbol).toBe("BTCUSDT");
    expect(body.request.symbol).toBe("BTCUSDT");
  });

  it("GET /backtests/:id 404s for an unknown id", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/backtests/00000000-0000-0000-0000-000000000000",
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("persists a FAILED backtest (with no result row) when the engine rejects the request, rather than discarding it", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/backtests",
      headers: { cookie: accessCookie },
      payload: { ...VALID_REQUEST, symbol: "FAILSYM" },
    });
    expect(res.statusCode).toBe(201); // the backtest row itself is created either way — FAILED is a valid, inspectable outcome
    const body = res.json();
    expect(body.status).toBe("FAILED");
    expect(body.errorMessage).toContain("No historical candles");
    expect(body.metrics).toBeNull();
    expect(body.trades).toEqual([]);
  });
});
