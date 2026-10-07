import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Reads ENCRYPTION_KEY directly rather than through loadEnv() — this module
 * is used by the rest of shared-config's consumers for one narrow purpose
 * (encrypting exchange credentials) and shouldn't require the full app env
 * schema (DATABASE_URL, JWT secrets, etc.) to be valid just to use it.
 */
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte (64 hex character) value.");
  }
  return key;
}

/**
 * Encrypts exchange API credentials at rest (AES-256-GCM). Never used for
 * anything exchange-independent — this is the one place in the project
 * where a real secret (an exchange API key/secret) is persisted, per the
 * Phase 9 `exchange_connections` design reserved since Phase 1.
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, ciphertextB64] = encoded.split(".");
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted secret.");
  }
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Last 4 characters only — safe to display in the UI so a user can tell connections apart. */
export function maskSecret(plaintext: string): string {
  return plaintext.length <= 4 ? "****" : `****${plaintext.slice(-4)}`;
}
