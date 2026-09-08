import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/services/password";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash).not.toEqual("correct-horse-battery-staple");
    await expect(verifyPassword(hash, "correct-horse-battery-staple")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });
});
