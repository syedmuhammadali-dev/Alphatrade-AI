import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "../src/encryption";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0".repeat(64);
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", () => {
    const encrypted = encryptSecret("my-api-secret-key");
    expect(encrypted).not.toContain("my-api-secret-key");
    expect(decryptSecret(encrypted)).toBe("my-api-secret-key");
  });

  it("produces a different ciphertext each time (random IV) for the same plaintext", () => {
    expect(encryptSecret("same-value")).not.toBe(encryptSecret("same-value"));
  });

  it("rejects a tampered ciphertext", () => {
    const encrypted = encryptSecret("secret");
    const [iv, tag, ciphertext] = encrypted.split(".");
    const tampered = `${iv}.${tag}.${Buffer.from("tampered").toString("base64")}${ciphertext!.slice(-4)}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("maskSecret", () => {
  it("shows only the last 4 characters", () => {
    expect(maskSecret("abcdefgh1234")).toBe("****1234");
  });

  it("fully masks very short values", () => {
    expect(maskSecret("ab")).toBe("****");
  });
});
