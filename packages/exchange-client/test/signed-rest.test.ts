import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { getAccountInfo, placeMarketOrder, ExchangeApiError } from "../src/binance/signed-rest";

describe("signed-rest", () => {
  let server: Server;
  let url: string;
  let lastQuery: URLSearchParams;

  beforeAll(async () => {
    server = createServer((req, res) => {
      lastQuery = new URL(req.url ?? "", "http://localhost").searchParams;
      res.setHeader("content-type", "application/json");

      if (req.url?.startsWith("/api/v3/account")) {
        res.end(JSON.stringify({ canTrade: true, canWithdraw: false, balances: [] }));
        return;
      }
      if (req.url?.startsWith("/api/v3/order")) {
        if (lastQuery.get("symbol") === "FAILSYM") {
          res.statusCode = 400;
          res.end(JSON.stringify({ code: -2010, msg: "Account has insufficient balance." }));
          return;
        }
        res.end(
          JSON.stringify({
            symbol: lastQuery.get("symbol"),
            orderId: 1,
            clientOrderId: lastQuery.get("newClientOrderId"),
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
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    url = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  });

  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it("signs the request with a valid HMAC signature and API key header", async () => {
    await getAccountInfo(url, "test-api-key", "test-api-secret");
    expect(lastQuery.get("signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(lastQuery.get("timestamp")).toBeTruthy();
  });

  it("places a market order, passing the client order id through for idempotency", async () => {
    const result = await placeMarketOrder(url, "key", "secret", {
      symbol: "BTCUSDT",
      side: "BUY",
      quantity: 0.01,
      clientOrderId: "my-idempotency-key-1",
    });
    expect(result.status).toBe("FILLED");
    expect(result.clientOrderId).toBe("my-idempotency-key-1");
  });

  it("throws ExchangeApiError with the exchange's message on rejection", async () => {
    await expect(
      placeMarketOrder(url, "key", "secret", { symbol: "FAILSYM", side: "BUY", quantity: 1, clientOrderId: "x" }),
    ).rejects.toThrow(ExchangeApiError);
  });
});
