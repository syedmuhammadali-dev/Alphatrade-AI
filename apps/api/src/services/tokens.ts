import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { loadEnv } from "@alphatrade/shared-config";

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const env = loadEnv();
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const env = loadEnv();
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Refresh tokens are opaque random strings; only their SHA-256 hash is persisted. */
export function generateRefreshToken(): string {
  return randomUUID() + randomUUID();
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
