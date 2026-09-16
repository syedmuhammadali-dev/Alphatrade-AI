import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { buildApp } from "../src/app";

const BULLISH_ANALYSIS = {
  symbol: "BTCUSDT",
  timeframe: "1m",
  lastPrice: 110,
  rsi: 60,
  macd: { value: 1, signal: 0.5, histogram: 0.5 },
  ema20: 105,
  ema50: 100,
  ema200: 90,
  atr: 2,
  vwap: 105,
  adx: 40,
  bollinger: { upper: 120, middle: 100, lower: 80 },
  volumeRatio: 1.5,
  trend: "bullish",
  candleCount: 200,
};

const BULLISH_STRUCTURE = {
  pattern: "HH_HL",
  bias: "BULLISH_STRUCTURE",
  swingHighs: [108, 112],
  swingLows: [95, 98],
  support: 98,
  resistance: 112,
  breakout: false,
  breakdown: false,
};

function startFakeAnalysisEngine(regime = "TRENDING_BULLISH"): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url?.startsWith("/internal/analysis/")) {
        res.end(JSON.stringify({ analysis: BULLISH_ANALYSIS, structure: BULLISH_STRUCTURE, regime }));
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

function startFakeMarketData(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url?.startsWith("/internal/scanner")) {
        res.end(
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            count: 1,
            entries: [{ symbol: "BTCUSDT", lastPrice: 110, priceChangePercent: 2, highPrice: 112, lowPrice: 95, quoteVolume: 1_000_000_000, updatedAt: new Date().toISOString(), rank: 1 }],
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

describe("trading-engine HTTP API", () => {
  let app: FastifyInstance;
  let analysisServer: Server;
  let marketDataServer: Server;

  beforeAll(async () => {
    const analysis = await startFakeAnalysisEngine();
    analysisServer = analysis.server;
    const marketData = await startFakeMarketData();
    marketDataServer = marketData.server;

    app = await buildApp(analysis.url, marketData.url);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => analysisServer.close(resolve));
    await new Promise((resolve) => marketDataServer.close(resolve));
  });

  it("GET /internal/decision/:symbol returns an actionable proposal for a strongly bullish setup", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/decision/BTCUSDT" });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.action).toBe("LONG");
    expect(body.proposal).not.toBeNull();
    expect(body.proposal.symbol).toBe("BTCUSDT");
    expect(body.signals.length).toBeGreaterThan(0);
  });

  it("respects a high minConfidence threshold by downgrading to NO_TRADE", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/decision/BTCUSDT?minConfidence=99" });
    expect(res.statusCode).toBe(200);
    expect(res.json().action).toBe("NO_TRADE");
  });

  it("respects enabledStrategies filtering", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/internal/decision/BTCUSDT?enabledStrategies=MeanReversionStrategy",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // MeanReversionStrategy only runs in RANGING/LOW_VOLATILITY, not TRENDING_BULLISH, and no other
    // strategy was enabled, so every signal should be gated to NO_TRADE.
    expect(body.action).toBe("NO_TRADE");
    expect(body.signals).toHaveLength(1);
  });

  it("GET /internal/opportunities requires a symbols query param", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/opportunities" });
    expect(res.statusCode).toBe(400);
  });

  it("GET /internal/opportunities ranks the requested symbols", async () => {
    const res = await app.inject({ method: "GET", url: "/internal/opportunities?symbols=BTCUSDT" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.opportunities).toHaveLength(1);
    expect(body.opportunities[0].symbol).toBe("BTCUSDT");
    expect(body.opportunities[0].rank).toBe(1);
    expect(body.opportunities[0].totalScore).toBeGreaterThan(0);
  });

  it("returns 503 when the analysis-engine upstream is unreachable", async () => {
    await new Promise((resolve) => analysisServer.close(resolve));
    const res = await app.inject({ method: "GET", url: "/internal/decision/BTCUSDT" });
    expect(res.statusCode).toBe(503);
  });
});
