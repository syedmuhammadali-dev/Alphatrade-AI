import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

/** Covers the Chrome extension's token-based auth path (Bearer header, not cookies). */
describe("extension auth flow", () => {
  let app: FastifyInstance;
  const email = `ext-test-${randomUUID()}@example.com`;
  const password = "a-very-secure-password-123";

  beforeAll(async () => {
    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();
    await app.inject({ method: "POST", url: "/auth/register", payload: { email, password } });
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  it("logs in and returns tokens in the body instead of cookies", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/extension-login", payload: { email, password } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("authenticates a protected route via Authorization: Bearer instead of a cookie", async () => {
    const loginRes = await app.inject({ method: "POST", url: "/auth/extension-login", payload: { email, password } });
    const { accessToken } = loginRes.json();

    const meRes = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: `Bearer ${accessToken}` } });
    expect(meRes.statusCode).toBe(200);
    expect(meRes.json().user.email).toBe(email);
  });

  it("rejects a request with no cookie and no bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("rejects an invalid bearer token", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me", headers: { authorization: "Bearer not-a-real-token" } });
    expect(res.statusCode).toBe(401);
  });

  it("rotates tokens via /auth/extension-refresh", async () => {
    const loginRes = await app.inject({ method: "POST", url: "/auth/extension-login", payload: { email, password } });
    const { refreshToken } = loginRes.json();

    const refreshRes = await app.inject({ method: "POST", url: "/auth/extension-refresh", payload: { refreshToken } });
    expect(refreshRes.statusCode).toBe(200);
    const body = refreshRes.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.refreshToken).not.toBe(refreshToken); // rotated, not reused
  });

  it("400s refresh with no refreshToken in the body", async () => {
    const res = await app.inject({ method: "POST", url: "/auth/extension-refresh", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("revokes the session via /auth/extension-logout, so the old refresh token can't be reused", async () => {
    const loginRes = await app.inject({ method: "POST", url: "/auth/extension-login", payload: { email, password } });
    const { refreshToken } = loginRes.json();

    const logoutRes = await app.inject({ method: "POST", url: "/auth/extension-logout", payload: { refreshToken } });
    expect(logoutRes.statusCode).toBe(200);

    const refreshRes = await app.inject({ method: "POST", url: "/auth/extension-refresh", payload: { refreshToken } });
    expect(refreshRes.statusCode).toBe(401);
  });
});
