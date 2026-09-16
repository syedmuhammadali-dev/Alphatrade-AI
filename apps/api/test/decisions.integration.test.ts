import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { closeDb, getDb, tradeDecisions } from "@alphatrade/database";

const SAMPLE_PROPOSAL = {
  id: "proposal-1",
  symbol: "BTCUSDT",
  side: "LONG",
  strategy: "TrendFollowingStrategy",
  confidence: 80,
  entryPrice: 100,
  stopLoss: 95,
  takeProfit: 115,
  riskReward: 3,
  reasoning: "test reasoning",
  regime: "TRENDING_BULLISH",
  createdAt: new Date().toISOString(),
};

function startFakeTradingEngine(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url?.startsWith("/internal/decision/")) {
        res.end(JSON.stringify({ symbol: "BTCUSDT", action: "LONG", proposal: SAMPLE_PROPOSAL, signals: [] }));
        return;
      }
      if (req.url?.startsWith("/internal/opportunities")) {
        res.end(
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            opportunities: [
              { symbol: "BTCUSDT", totalScore: 72.5, rank: 1, recommendedStrategy: "TrendFollowingStrategy", confidence: 80, action: "LONG", proposal: SAMPLE_PROPOSAL },
            ],
          }),
        );
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

describe("strategies and decisions routes", () => {
  let app: FastifyInstance;
  let fakeServer: Server;
  let accessCookie: string;
  let userId: string;

  beforeAll(async () => {
    const fake = await startFakeTradingEngine();
    fakeServer = fake.server;
    process.env.TRADING_ENGINE_URL = fake.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `decisions-test-${randomUUID()}@example.com`;
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
    await new Promise((resolve) => fakeServer.close(resolve));
  });

  it("GET /strategies lists the registered strategies with descriptions", async () => {
    const res = await app.inject({ method: "GET", url: "/strategies", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.strategies.length).toBe(4);
    expect(body.strategies.map((s: { name: string }) => s.name)).toContain("TrendFollowingStrategy");
    expect(body.strategies[0].description).toBeTruthy();
  });

  it("GET /strategies/performance returns honest zeroed stats (no trade history yet)", async () => {
    const res = await app.inject({ method: "GET", url: "/strategies/performance", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.performance.every((p: { totalTrades: number }) => p.totalTrades === 0)).toBe(true);
  });

  it("PATCH /strategies/:name toggles a strategy off for the user", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/strategies/MeanReversionStrategy",
      headers: { cookie: accessCookie },
      payload: { enabled: false },
    });
    expect(res.statusCode).toBe(200);
  });

  it("PATCH /strategies/:name 404s for an unknown strategy", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/strategies/NotAStrategy",
      headers: { cookie: accessCookie },
      payload: { enabled: false },
    });
    expect(res.statusCode).toBe(404);
  });

  it("rejects unauthenticated /decisions requests", async () => {
    const res = await app.inject({ method: "GET", url: "/decisions" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /decisions proxies ranked opportunities and persists them to trade_decisions", async () => {
    const res = await app.inject({ method: "GET", url: "/decisions", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.opportunities[0].symbol).toBe("BTCUSDT");

    const db = getDb();
    const rows = await db.select().from(tradeDecisions).where(eq(tradeDecisions.userId, userId));
    expect(rows.some((r) => r.symbol === "BTCUSDT" && r.strategy === "TrendFollowingStrategy")).toBe(true);
  });

  it("GET /decisions/:symbol proxies a single decision and persists it", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/decisions/BTCUSDT",
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().action).toBe("LONG");

    const db = getDb();
    const rows = await db.select().from(tradeDecisions).where(eq(tradeDecisions.userId, userId));
    expect(rows.length).toBeGreaterThanOrEqual(2); // one from /decisions, one from /decisions/:symbol
  });

  it("returns 503 when the trading-engine upstream is unreachable", async () => {
    await new Promise((resolve) => fakeServer.close(resolve));
    const res = await app.inject({ method: "GET", url: "/decisions", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(503);
  });
});
