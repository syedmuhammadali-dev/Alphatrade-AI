import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { buildApp } from "../src/app";

describe("execution-engine HTTP API", () => {
  let app: FastifyInstance;
  let exchangeServer: Server;
  let exchangeUrl: string;

  beforeAll(async () => {
    exchangeServer = createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost");
      res.setHeader("content-type", "application/json");
      if (url.pathname === "/api/v3/account") {
        res.end(JSON.stringify({ canTrade: true, canWithdraw: false, balances: [] }));
        return;
      }
      if (url.pathname === "/api/v3/order") {
        if (url.searchParams.get("symbol") === "FAILSYM") {
          res.statusCode = 400;
          res.end(JSON.stringify({ code: -2010, msg: "Account has insufficient balance." }));
          return;
        }
        res.end(
          JSON.stringify({
            symbol: url.searchParams.get("symbol"),
            orderId: 1,
            clientOrderId: url.searchParams.get("newClientOrderId"),
            status: "FILLED",
            executedQty: "1",
            cummulativeQuoteQty: "100",
            fills: [],
          }),
        );
        return;
      }
      res.statusCode = 404;
      res.end("{}");
    });
    await new Promise<void>((resolve) => exchangeServer.listen(0, resolve));
    const address = exchangeServer.address();
    exchangeUrl = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await new Promise((resolve) => exchangeServer.close(resolve));
  });

  it("GET /health responds ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("POST /internal/account proxies the signed account-info call", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/account",
      payload: { baseUrl: exchangeUrl, apiKey: "key", apiSecret: "secret" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().canTrade).toBe(true);
  });

  it("POST /internal/orders places a market order and returns the fill", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/orders",
      payload: { baseUrl: exchangeUrl, apiKey: "key", apiSecret: "secret", symbol: "BTCUSDT", side: "BUY", quantity: 0.01, clientOrderId: "abc-1" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("FILLED");
  });

  it("502s with the exchange's own rejection reason, without retrying a real rejection", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/internal/orders",
      payload: { baseUrl: exchangeUrl, apiKey: "key", apiSecret: "secret", symbol: "FAILSYM", side: "BUY", quantity: 1, clientOrderId: "abc-2" },
    });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toContain("insufficient balance");
  });

  it("400s on an invalid request body", async () => {
    const res = await app.inject({ method: "POST", url: "/internal/orders", payload: { symbol: "BTCUSDT" } });
    expect(res.statusCode).toBe(400);
  });
});
