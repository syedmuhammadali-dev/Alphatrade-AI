import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

/**
 * Integration test for the full register -> login -> me -> logout flow.
 * Requires a reachable Postgres with migrations applied:
 *   docker compose up -d && pnpm --filter @alphatrade/database db:migrate
 */
describe("auth flow", () => {
  let app: FastifyInstance;
  const email = `test-${randomUUID()}@example.com`;
  const password = "a-very-secure-password-123";

  beforeAll(async () => {
    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  function extractCookie(setCookieHeader: string | string[] | undefined, name: string) {
    const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader ?? ""];
    const match = headers.find((h) => h.startsWith(`${name}=`));
    return match?.split(";")[0];
  }

  it("registers, logs in, fetches the session, and logs out", async () => {
    const registerRes = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(registerRes.statusCode).toBe(201);
    const registerBody = registerRes.json();
    expect(registerBody.user.email).toBe(email);

    const accessCookie = extractCookie(registerRes.headers["set-cookie"], "access_token");
    const refreshCookie = extractCookie(registerRes.headers["set-cookie"], "refresh_token");
    expect(accessCookie).toBeDefined();
    expect(refreshCookie).toBeDefined();

    const meRes = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { cookie: accessCookie! },
    });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.email).toBe(email);

    const loginRes = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password },
    });
    expect(loginRes.statusCode).toBe(200);

    const logoutRes = await app.inject({
      method: "POST",
      url: "/auth/logout",
      headers: { cookie: refreshCookie! },
    });
    expect(logoutRes.statusCode).toBe(200);
  });

  it("rejects login with a wrong password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password: "totally-wrong-password" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("rejects registering the same email twice", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email, password },
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejects /auth/me without a session cookie", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});
