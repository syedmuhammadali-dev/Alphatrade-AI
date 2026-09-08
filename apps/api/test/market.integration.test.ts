import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

/**
 * Spins up a tiny fake market-data upstream (no real Binance dependency) so
 * this test exercises apps/api's proxy + auth-gating logic in isolation.
 */
function startFakeMarketData(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      res.setHeader("content-type", "application/json");
      if (req.url?.startsWith("/internal/scanner")) {
        res.end(
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            count: 1,
            entries: [
              {
                symbol: "BTCUSDT",
                lastPrice: 65000,
                priceChangePercent: 1.5,
                highPrice: 66000,
                lowPrice: 64000,
                quoteVolume: 1_000_000,
                updatedAt: new Date().toISOString(),
                rank: 1,
              },
            ],
          }),
        );
        return;
      }
      if (req.url?.startsWith("/internal/symbol/")) {
        res.end(JSON.stringify({ ticker: null, candles: [] }));
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

describe("market routes", () => {
  let app: FastifyInstance;
  let fakeServer: Server;
  let accessCookie: string;

  beforeAll(async () => {
    const fake = await startFakeMarketData();
    fakeServer = fake.server;
    process.env.MARKET_DATA_URL = fake.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `market-test-${randomUUID()}@example.com`;
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
    await new Promise((resolve) => fakeServer.close(resolve));
  });

  it("rejects unauthenticated scanner requests", async () => {
    const res = await app.inject({ method: "GET", url: "/market/scanner" });
    expect(res.statusCode).toBe(401);
  });

  it("proxies the scanner response for an authenticated request", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/market/scanner",
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.count).toBe(1);
    expect(body.entries[0].symbol).toBe("BTCUSDT");
  });

  it("proxies the symbol detail response", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/market/BTCUSDT",
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ticker: null, candles: [] });
  });

  it("returns 503 when the market-data upstream is unreachable", async () => {
    // loadEnv() memoizes MARKET_DATA_URL for the process, so simulate
    // "unreachable" by tearing down the fake upstream rather than pointing
    // at a different URL (which loadEnv's cache would ignore anyway).
    await new Promise((resolve) => fakeServer.close(resolve));

    const res = await app.inject({
      method: "GET",
      url: "/market/scanner",
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(503);
  });
});
