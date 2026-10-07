import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

const SYMBOL = "BTCUSDT";
let currentPrice = 100;

const SAMPLE_PROPOSAL = {
  id: "proposal-1",
  symbol: SYMBOL,
  side: "LONG",
  strategy: "TrendFollowingStrategy",
  confidence: 85,
  entryPrice: 100,
  stopLoss: 90,
  takeProfit: 120,
  riskReward: 2,
  reasoning: "test reasoning",
  regime: "TRENDING_BULLISH",
  createdAt: new Date().toISOString(),
};

function jsonServer(handler: (url: string, body: unknown) => unknown): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
        res.setHeader("content-type", "application/json");
        const result = handler(req.url ?? "", body);
        if (result === undefined) {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: "not found" }));
          return;
        }
        res.end(JSON.stringify(result));
      });
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

let orderCounter = 0;

describe("live trading routes", () => {
  let app: FastifyInstance;
  const servers: Server[] = [];
  let accessCookie: string;
  let connectionId: string;

  beforeAll(async () => {
    const trading = await jsonServer((url) =>
      url.startsWith("/internal/decision/")
        ? { symbol: SYMBOL, action: "LONG", proposal: SAMPLE_PROPOSAL, signals: [] }
        : undefined,
    );
    const risk = await jsonServer((url) =>
      url === "/internal/check"
        ? {
            decision: "APPROVED",
            reasons: ["all checks passed"],
            positionSize: { units: 10, notionalValueUsd: 1000, riskAmountUsd: 100, cappedByMaxPositionSize: false },
          }
        : undefined,
    );
    const marketData = await jsonServer((url) =>
      url.startsWith("/internal/symbol/")
        ? {
            ticker: {
              symbol: SYMBOL,
              lastPrice: currentPrice,
              priceChangePercent: 0,
              highPrice: currentPrice,
              lowPrice: currentPrice,
              quoteVolume: 1_000_000,
              updatedAt: new Date().toISOString(),
            },
            candles: [],
          }
        : undefined,
    );
    const execution = await jsonServer((url, body) => {
      if (url === "/internal/account") return { canTrade: true, canWithdraw: false, balances: [] };
      if (url === "/internal/orders") {
        const req = body as { symbol: string; quantity: number; clientOrderId: string };
        orderCounter++;
        return {
          symbol: req.symbol,
          orderId: orderCounter,
          clientOrderId: req.clientOrderId,
          status: "FILLED",
          executedQty: String(req.quantity),
          cummulativeQuoteQty: String(req.quantity * currentPrice),
          fills: [],
        };
      }
      return undefined;
    });
    servers.push(trading.server, risk.server, marketData.server, execution.server);
    process.env.TRADING_ENGINE_URL = trading.url;
    process.env.RISK_ENGINE_URL = risk.url;
    process.env.MARKET_DATA_URL = marketData.url;
    process.env.EXECUTION_ENGINE_URL = execution.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `live-test-${randomUUID()}@example.com`;
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "a-very-secure-password-123" },
    });
    const setCookie = registerRes.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
    accessCookie = cookies.find((c) => c.startsWith("access_token="))!.split(";")[0]!;

    const connRes = await app.inject({
      method: "POST",
      url: "/exchange-connections",
      headers: { cookie: accessCookie },
      payload: { label: "Testnet", apiKey: "key", apiSecret: "secret" },
    });
    connectionId = connRes.json().id;
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
    for (const s of servers) await new Promise((resolve) => s.close(resolve));
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/live/positions" });
    expect(res.statusCode).toBe(401);
  });

  it("POST /live/execute places a real (fake-exchange) market order and opens a position at its actual fill price", async () => {
    currentPrice = 100;
    const res = await app.inject({
      method: "POST",
      url: "/live/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL, connectionId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.executed).toBe(true);
    expect(body.position.entryPrice).toBe(100);
    expect(body.position.quantity).toBeCloseTo(10, 5); // 1000 notional / 100 price
    expect(body.position.entryOrderId).toBeTruthy();
  });

  it("rejects opening a second live position on the same symbol", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/live/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL, connectionId },
    });
    expect(res.json().executed).toBe(false);
    expect(res.json().reason).toContain("Already have an open");
  });

  it("GET /live/positions shows unrealized P&L as price moves", async () => {
    currentPrice = 110;
    const res = await app.inject({ method: "GET", url: "/live/positions", headers: { cookie: accessCookie } });
    const position = res.json().positions[0];
    expect(position.currentPrice).toBe(110);
    expect(position.unrealizedPnlUsd).toBeCloseTo((110 - 100) * 10, 5);
  });

  it("auto-closes the live position at take-profit via a real SELL market order", async () => {
    currentPrice = 125; // above takeProfit (120)
    const res = await app.inject({ method: "GET", url: "/live/positions", headers: { cookie: accessCookie } });
    expect(res.json().positions).toHaveLength(0);

    const tradesRes = await app.inject({ method: "GET", url: "/live/trades", headers: { cookie: accessCookie } });
    const trades = tradesRes.json().trades;
    expect(trades).toHaveLength(1);
    expect(trades[0].closeReason).toBe("TAKE_PROFIT");
    expect(trades[0].realizedPnlUsd).toBeGreaterThan(0);
    expect(trades[0].exitOrderId).toBeTruthy();
  });

  it("POST /live/positions/:id/close manually closes a fresh position", async () => {
    currentPrice = 100;
    const openRes = await app.inject({
      method: "POST",
      url: "/live/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL, connectionId },
    });
    const positionId = openRes.json().position.id;

    currentPrice = 105;
    const closeRes = await app.inject({
      method: "POST",
      url: `/live/positions/${positionId}/close`,
      headers: { cookie: accessCookie },
    });
    expect(closeRes.statusCode).toBe(200);
    expect(closeRes.json().executed).toBe(true);
    expect(closeRes.json().position.closeReason).toBe("MANUAL");
  });
});
