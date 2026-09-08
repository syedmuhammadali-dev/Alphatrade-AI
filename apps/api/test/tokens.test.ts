import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL ??= "postgresql://alphatrade:alphatrade@localhost:5432/alphatrade";
  process.env.JWT_ACCESS_SECRET ??= "a".repeat(32);
  process.env.JWT_REFRESH_SECRET ??= "b".repeat(32);
});

describe("tokens", () => {
  it("signs and verifies an access token round-trip", async () => {
    const { signAccessToken, verifyAccessToken } = await import("../src/services/tokens");
    const token = signAccessToken({ sub: "user-1", email: "user@example.com" });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
  });

  it("hashes refresh tokens deterministically", async () => {
    const { hashRefreshToken, generateRefreshToken } = await import("../src/services/tokens");
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toEqual(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toEqual(token);
  });
});

describe("duration parsing", () => {
  it("parses common duration formats", async () => {
    const { parseDurationMs } = await import("../src/services/duration");
    expect(parseDurationMs("15m")).toBe(15 * 60_000);
    expect(parseDurationMs("30d")).toBe(30 * 86_400_000);
    expect(parseDurationMs("1h")).toBe(3_600_000);
  });

  it("throws on an invalid format", async () => {
    const { parseDurationMs } = await import("../src/services/duration");
    expect(() => parseDurationMs("bogus")).toThrow();
  });
});
