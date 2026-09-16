import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

const SAMPLE_PROPOSAL = {
  id: "proposal-1",
  symbol: "BTCUSDT",
  side: "LONG",
  strategy: "TrendFollowingStrategy",
  confidence: 85,
  entryPrice: 100,
  stopLoss: 95,
  takeProfit: 115,
  riskReward: 3,
  reasoning: "test reasoning",
  regime: "TRENDING_BULLISH",
  createdAt: new Date().toISOString(),
};

describe("risk-engine HTTP API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health responds ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("APPROVEs a strong proposal with default config and no state supplied", async () => {
    const res = await app.inject({ method: "POST", url: "/internal/check", payload: { proposal: SAMPLE_PROPOSAL } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.decision).toBe("APPROVED");
    expect(body.positionSize).not.toBeNull();
  });

  it("REJECTs when a partial config overrides minimumConfidence above the proposal's confidence", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/check",
      payload: { proposal: SAMPLE_PROPOSAL, config: { minimumConfidence: 95 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().decision).toBe("REJECTED");
  });

  it("REJECTs when the supplied account state is already at the open-positions cap", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/check",
      payload: { proposal: SAMPLE_PROPOSAL, config: { maxOpenPositions: 2 }, accountState: { openPositionsCount: 2 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().decision).toBe("REJECTED");
  });

  it("400s on an invalid request body", async () => {
    const res = await app.inject({ method: "POST", url: "/internal/check", payload: { proposal: { symbol: "BTCUSDT" } } });
    expect(res.statusCode).toBe(400);
  });
});
