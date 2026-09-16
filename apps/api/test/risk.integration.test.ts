import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

describe("risk config routes", () => {
  let app: FastifyInstance;
  let accessCookie: string;

  beforeAll(async () => {
    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `risk-config-test-${randomUUID()}@example.com`;
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
  });

  it("rejects unauthenticated requests", async () => {
    const res = await app.inject({ method: "GET", url: "/risk/config" });
    expect(res.statusCode).toBe(401);
  });

  it("GET /risk/config returns the default config for a fresh user", async () => {
    const res = await app.inject({ method: "GET", url: "/risk/config", headers: { cookie: accessCookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.config.minimumConfidence).toBe(75);
    expect(body.config.minimumRiskReward).toBe(2);
    expect(body.config.maxOpenPositions).toBe(3);
    expect(body.config.maxDailyLossPercent).toBe(3);
  });

  it("PATCH /risk/config updates only the given fields and persists them", async () => {
    const patchRes = await app.inject({
      method: "PATCH",
      url: "/risk/config",
      headers: { cookie: accessCookie },
      payload: { minimumConfidence: 60, maxOpenPositions: 5 },
    });
    expect(patchRes.statusCode).toBe(200);
    expect(patchRes.json().config.minimumConfidence).toBe(60);
    expect(patchRes.json().config.maxOpenPositions).toBe(5);
    // Untouched field should keep its default.
    expect(patchRes.json().config.minimumRiskReward).toBe(2);

    const getRes = await app.inject({ method: "GET", url: "/risk/config", headers: { cookie: accessCookie } });
    expect(getRes.json().config.minimumConfidence).toBe(60);
    expect(getRes.json().config.maxOpenPositions).toBe(5);
  });

  it("PATCH /risk/config rejects an invalid value", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/risk/config",
      headers: { cookie: accessCookie },
      payload: { minimumConfidence: 500 },
    });
    expect(res.statusCode).toBe(400);
  });
});
