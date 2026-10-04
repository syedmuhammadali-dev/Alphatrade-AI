import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { closeDb } from "@alphatrade/database";

describe("bot lifecycle routes", () => {
  let app: FastifyInstance;
  let accessCookie: string;

  beforeAll(async () => {
    const { buildApp } = await import("../src/app");
    app = await buildApp();
    await app.ready();

    const email = `bot-test-${randomUUID()}@example.com`;
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

  async function post(url: string) {
    return app.inject({ method: "POST", url, headers: { cookie: accessCookie } });
  }

  it("starts stopped, then walks through start -> pause -> resume -> emergency-stop", async () => {
    const initial = await app.inject({ method: "GET", url: "/bot/status", headers: { cookie: accessCookie } });
    expect(initial.json().status).toBe("stopped");

    expect((await post("/bot/start")).json().status).toBe("running");
    expect((await post("/bot/pause")).json().status).toBe("paused");
    expect((await post("/bot/resume")).json().status).toBe("running");
    expect((await post("/bot/emergency-stop")).json().status).toBe("emergency_stopped");
  });

  it("rejects invalid transitions with 409 and leaves the status unchanged", async () => {
    // Currently emergency_stopped: pause/resume/start are all invalid.
    const pauseRes = await post("/bot/pause");
    expect(pauseRes.statusCode).toBe(409);

    const startRes = await post("/bot/start");
    expect(startRes.statusCode).toBe(409);

    const status = await app.inject({ method: "GET", url: "/bot/status", headers: { cookie: accessCookie } });
    expect(status.json().status).toBe("emergency_stopped");
  });

  it("only lets an emergency-stopped bot return via reset to stopped, never straight to running", async () => {
    expect((await post("/bot/resume")).statusCode).toBe(409);
    expect((await post("/bot/stop")).statusCode).toBe(409);

    const resetRes = await post("/bot/reset");
    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.json().status).toBe("stopped");
  });

  it("requires authentication", async () => {
    const res = await app.inject({ method: "POST", url: "/bot/start" });
    expect(res.statusCode).toBe(401);
  });
});
