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

describe("bot orchestrator tick", () => {
  let app: FastifyInstance;
  const servers: Server[] = [];
  let runBotTick: (symbols: string[]) => Promise<void>;
  let runningCookie: string;
  let pausedCookie: string;

  async function registerUser(): Promise<string> {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: `orch-${randomUUID()}@example.com`, password: "a-very-secure-password-123" },
    });
    const setCookie = res.headers["set-cookie"];
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
    return cookies.find((c) => c.startsWith("access_token="))!.split(";")[0]!;
  }

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
    servers.push(trading.server, risk.server, marketData.server);
    process.env.TRADING_ENGINE_URL = trading.url;
    process.env.RISK_ENGINE_URL = risk.url;
    process.env.MARKET_DATA_URL = marketData.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();
    ({ runBotTick } = await import("../src/services/bot-orchestrator"));

    runningCookie = await registerUser();
    pausedCookie = await registerUser();

    await app.inject({ method: "POST", url: "/paper/start", headers: { cookie: runningCookie } });
    await app.inject({ method: "POST", url: "/paper/start", headers: { cookie: pausedCookie } });
    await app.inject({ method: "POST", url: "/bot/start", headers: { cookie: runningCookie } });
    await app.inject({ method: "POST", url: "/bot/start", headers: { cookie: pausedCookie } });
    await app.inject({ method: "POST", url: "/bot/pause", headers: { cookie: pausedCookie } });
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
    for (const s of servers) await new Promise((resolve) => s.close(resolve));
  });

  it("opens a paper position for a running bot, but not for a paused one", async () => {
    currentPrice = 100;
    await runBotTick([SYMBOL]);

    const running = await app.inject({ method: "GET", url: "/paper/positions", headers: { cookie: runningCookie } });
    expect(running.json().positions).toHaveLength(1);

    const paused = await app.inject({ method: "GET", url: "/paper/positions", headers: { cookie: pausedCookie } });
    expect(paused.json().positions).toHaveLength(0);
  });

  it("closes a paused bot's open position at take-profit even though the bot won't open new ones", async () => {
    // Paused user gets a position opened while it was still running, then gets paused.
    await app.inject({ method: "POST", url: "/bot/resume", headers: { cookie: pausedCookie } });
    await runBotTick([SYMBOL]);
    await app.inject({ method: "POST", url: "/bot/pause", headers: { cookie: pausedCookie } });
    const before = await app.inject({ method: "GET", url: "/paper/positions", headers: { cookie: pausedCookie } });
    expect(before.json().positions).toHaveLength(1);

    currentPrice = 125; // above take-profit (120)
    await runBotTick([SYMBOL]);

    const after = await app.inject({ method: "GET", url: "/paper/positions", headers: { cookie: pausedCookie } });
    expect(after.json().positions).toHaveLength(0);
    const trades = await app.inject({ method: "GET", url: "/paper/trades", headers: { cookie: pausedCookie } });
    expect(trades.json().trades[0].closeReason).toBe("TAKE_PROFIT");
  });
});
