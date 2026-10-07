import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

function startFakeExecutionEngine(): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        res.setHeader("content-type", "application/json");
        if (req.url === "/internal/account") {
          if (body.apiKey === "bad-key") {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: "Invalid API-key.", code: -2015 }));
            return;
          }
          res.end(JSON.stringify({ canTrade: true, canWithdraw: false, balances: [] }));
          return;
        }
        res.statusCode = 404;
        res.end("{}");
      });
    });
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe("exchange connections routes", () => {
  let app: FastifyInstance;
  let executionServer: Server;
  let accessCookie: string;

  beforeAll(async () => {
    const fake = await startFakeExecutionEngine();
    executionServer = fake.server;
    process.env.EXECUTION_ENGINE_URL = fake.url;

    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `exchange-test-${randomUUID()}@example.com`;
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
    await new Promise((resolve) => executionServer.close(resolve));
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/exchange-connections" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /exchange-connections starts empty", async () => {
    const res = await app.inject({ method: "GET", url: "/exchange-connections", headers: { cookie: accessCookie } });
    expect(res.json().connections).toEqual([]);
  });

  let connectionId: string;

  it("POST /exchange-connections stores and verifies a working connection without ever returning the secret", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/exchange-connections",
      headers: { cookie: accessCookie },
      payload: { label: "My Testnet Key", apiKey: "good-key-1234", apiSecret: "super-secret-value" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.canTrade).toBe(true);
    expect(body.apiKeyLast4).toBe("****1234");
    expect(body.testnet).toBe(true); // defaults to testnet
    expect(JSON.stringify(body)).not.toContain("super-secret-value");
    connectionId = body.id;
  });

  it("GET /exchange-connections now lists it", async () => {
    const res = await app.inject({ method: "GET", url: "/exchange-connections", headers: { cookie: accessCookie } });
    expect(res.json().connections).toHaveLength(1);
  });

  it("stores canTrade: false for a connection the exchange rejects, instead of throwing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/exchange-connections",
      headers: { cookie: accessCookie },
      payload: { label: "Bad Key", apiKey: "bad-key", apiSecret: "whatever" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().canTrade).toBe(false);
  });

  it("POST /:id/test re-verifies an existing connection", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/exchange-connections/${connectionId}/test`,
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().canTrade).toBe(true);
  });

  it("404s testing or deleting a connection that isn't the caller's", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/exchange-connections/00000000-0000-0000-0000-000000000000/test",
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /:id removes the connection", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/exchange-connections/${connectionId}`,
      headers: { cookie: accessCookie },
    });
    expect(res.statusCode).toBe(204);

    const listRes = await app.inject({ method: "GET", url: "/exchange-connections", headers: { cookie: accessCookie } });
    expect(listRes.json().connections).toHaveLength(1); // only the "Bad Key" one remains
  });
});
