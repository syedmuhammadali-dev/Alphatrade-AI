import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";
import { getPaperRiskContext } from "../src/services/paper-trading-service";

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

function jsonServer(handler: (url: string) => unknown): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      const body = handler(req.url ?? "");
      if (body === undefined) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not found" }));
        return;
      }
      res.end(JSON.stringify(body));
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

function startFakeTradingEngine() {
  return jsonServer((url) => {
    if (url.startsWith("/internal/decision/")) {
      return { symbol: SYMBOL, action: "LONG", proposal: SAMPLE_PROPOSAL, signals: [] };
    }
    return undefined;
  });
}

function startFakeRiskEngine() {
  return jsonServer((url) => {
    if (url === "/internal/check") {
      return {
        decision: "APPROVED",
        reasons: ["all checks passed"],
        positionSize: { units: 10, notionalValueUsd: 1000, riskAmountUsd: 100, cappedByMaxPositionSize: false },
      };
    }
    return undefined;
  });
}

function startFakeMarketData() {
  return jsonServer((url) => {
    if (url.startsWith("/internal/symbol/")) {
      return {
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
      };
    }
    return undefined;
  });
}

describe("paper trading routes", () => {
  let app: FastifyInstance;
  let tradingServer: Server;
  let riskServer: Server;
  let marketDataServer: Server;
  let accessCookie: string;
  let userId: string;

  beforeAll(async () => {
    const trading = await startFakeTradingEngine();
    tradingServer = trading.server;
    process.env.TRADING_ENGINE_URL = trading.url;

    const risk = await startFakeRiskEngine();
    riskServer = risk.server;
    process.env.RISK_ENGINE_URL = risk.url;

    const marketData = await startFakeMarketData();
    marketDataServer = marketData.server;
    process.env.MARKET_DATA_URL = marketData.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `paper-test-${randomUUID()}@example.com`;
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password: "a-very-secure-password-123" },
    });
    userId = registerRes.json().user.id;
    const setCookie = registerRes.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
    accessCookie = cookies.find((c) => c.startsWith("access_token="))!.split(";")[0]!;
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
    await new Promise((resolve) => tradingServer.close(resolve));
    await new Promise((resolve) => riskServer.close(resolve));
    await new Promise((resolve) => marketDataServer.close(resolve));
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/paper/account" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /paper/account 404s before an account exists", async () => {
    const res = await app.inject({ method: "GET", url: "/paper/account", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(404);
  });

  it("POST /paper/start creates an account with the default starting balance", async () => {
    const res = await app.inject({ method: "POST", url: "/paper/start", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(201);
    expect(res.json().balanceUsd).toBe(10_000);
    expect(res.json().startingBalanceUsd).toBe(10_000);
  });

  it("POST /paper/start is idempotent — calling it again doesn't reset the balance", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/paper/start",
      headers: { cookie: accessCookie },
      payload: { startingBalanceUsd: 50_000 },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().balanceUsd).toBe(10_000); // unchanged, not reset to 50000
  });

  it("GET /paper/account now returns the account summary", async () => {
    const res = await app.inject({ method: "GET", url: "/paper/account", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.balanceUsd).toBe(10_000);
    expect(body.equityUsd).toBe(10_000);
    expect(body.openPositionsCount).toBe(0);
  });

  it("POST /paper/execute opens a real position at the live market price, deducting cost + fee from the balance", async () => {
    currentPrice = 100;
    const res = await app.inject({
      method: "POST",
      url: "/paper/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.executed).toBe(true);
    expect(body.position.symbol).toBe(SYMBOL);
    expect(body.position.entryPrice).toBe(100);
    expect(body.position.quantity).toBeCloseTo(10, 10); // 1000 notional / 100 price

    const accountRes = await app.inject({ method: "GET", url: "/paper/account", headers: { cookie: accessCookie } });
    const account = accountRes.json();
    // balance = 10000 - (1000 notional + 0.1% fee) = 10000 - 1001 = 8999
    expect(account.balanceUsd).toBeCloseTo(8999, 5);
    expect(account.openPositionsCount).toBe(1);
  });

  it("POST /paper/execute rejects opening a second position on the same symbol", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/paper/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().executed).toBe(false);
    expect(res.json().reason).toContain("Already have an open");
  });

  it("GET /paper/positions shows unrealized P&L as price moves", async () => {
    currentPrice = 110;
    const res = await app.inject({ method: "GET", url: "/paper/positions", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const position = res.json().positions[0];
    expect(position.currentPrice).toBe(110);
    expect(position.unrealizedPnlUsd).toBeCloseTo((110 - 100) * 10, 5); // 100
  });

  it("auto-closes the position when price crosses take-profit, crediting the account", async () => {
    currentPrice = 125; // above takeProfit (120)
    const res = await app.inject({ method: "GET", url: "/paper/account", headers: { cookie: accessCookie } });
    expect(res.json().openPositionsCount).toBe(0);

    const tradesRes = await app.inject({ method: "GET", url: "/paper/trades", headers: { cookie: accessCookie } });
    const trades = tradesRes.json().trades;
    expect(trades).toHaveLength(1);
    expect(trades[0].closeReason).toBe("TAKE_PROFIT");
    expect(trades[0].realizedPnlUsd).toBeGreaterThan(0);
  });

  it("GET /paper/performance reflects the closed, winning trade", async () => {
    const res = await app.inject({ method: "GET", url: "/paper/performance", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalTrades).toBe(1);
    expect(body.wins).toBe(1);
    expect(body.winRate).toBe(100);
    expect(body.totalPnlUsd).toBeGreaterThan(0);
  });

  it("POST /paper/positions/:id/close manually closes a fresh position", async () => {
    currentPrice = 100;
    const openRes = await app.inject({
      method: "POST",
      url: "/paper/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL },
    });
    const positionId = openRes.json().position.id;

    currentPrice = 105;
    const closeRes = await app.inject({
      method: "POST",
      url: `/paper/positions/${positionId}/close`,
      headers: { cookie: accessCookie },
    });
    expect(closeRes.statusCode).toBe(200);
    expect(closeRes.json().executed).toBe(true);
    expect(closeRes.json().position.closeReason).toBe("MANUAL");
  });

  it("getPaperRiskContext reflects real closed-trade history (2 wins, 0 losses, 0 open)", async () => {
    // By this point in the suite: one TAKE_PROFIT win + one MANUAL-close win are on the books,
    // and no positions are currently open.
    const { balanceOverride, accountState } = await getPaperRiskContext(userId);

    expect(balanceOverride).not.toBeNull();
    expect(accountState.openPositionsCount).toBe(0);
    expect(accountState.currentExposurePercent).toBe(0);
    expect(accountState.currentLosingStreak).toBe(0); // both closed trades were wins
    expect(accountState.dailyPnlPercent).toBeGreaterThan(0); // both trades closed today, both profitable
  });

  it("getPaperRiskContext reports open exposure and a losing streak after a losing trade", async () => {
    currentPrice = 100;
    const openRes = await app.inject({
      method: "POST",
      url: "/paper/execute",
      headers: { cookie: accessCookie },
      payload: { symbol: SYMBOL },
    });
    expect(openRes.json().executed).toBe(true);

    const { accountState: whileOpen } = await getPaperRiskContext(userId);
    expect(whileOpen.openPositionsCount).toBe(1);
    expect(whileOpen.currentExposurePercent).toBeGreaterThan(0);

    // Close it at a loss.
    const positionId = openRes.json().position.id;
    currentPrice = 95;
    await app.inject({ method: "POST", url: `/paper/positions/${positionId}/close`, headers: { cookie: accessCookie } });

    const { accountState: afterLoss } = await getPaperRiskContext(userId);
    expect(afterLoss.openPositionsCount).toBe(0);
    expect(afterLoss.currentLosingStreak).toBe(1);
  });
});
