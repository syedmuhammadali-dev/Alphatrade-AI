import { eq, and, isNull } from "drizzle-orm";
import { getDb, users, sessions, auditLogs, botConfigs, type UserRow } from "@alphatrade/database";
import { loadEnv } from "@alphatrade/shared-config";
import { hashPassword, verifyPassword } from "./password";
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "./tokens";
import { parseDurationMs } from "./duration";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401,
  ) {
    super(message);
  }
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

async function issueSession(
  userId: string,
  email: string,
  meta: { userAgent?: string; ip?: string },
): Promise<IssuedTokens> {
  const db = getDb();
  const env = loadEnv();

  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = generateRefreshToken();
  const refreshTokenExpiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));

  await db.insert(sessions).values({
    userId,
    refreshTokenHash: hashRefreshToken(refreshToken),
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: refreshTokenExpiresAt,
  });

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function registerUser(
  email: string,
  password: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: UserRow; tokens: IssuedTokens }> {
  const db = getDb();

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    throw new AuthError("An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash }).returning();
  if (!user) throw new AuthError("Failed to create user.", 500);

  await db.insert(botConfigs).values({ userId: user.id, name: "Default Bot" });

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "auth.register",
    metadata: { email },
  });

  const tokens = await issueSession(user.id, user.email, meta);
  return { user, tokens };
}

export async function loginUser(
  email: string,
  password: string,
  meta: { userAgent?: string; ip?: string },
): Promise<{ user: UserRow; tokens: IssuedTokens }> {
  const db = getDb();

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(user.passwordHash, password))) {
    await db.insert(auditLogs).values({
      action: "auth.login_failed",
      metadata: { email },
    });
    throw new AuthError("Invalid email or password.", 401);
  }

  await db.insert(auditLogs).values({
    userId: user.id,
    action: "auth.login",
    metadata: { email },
  });

  const tokens = await issueSession(user.id, user.email, meta);
  return { user, tokens };
}

export async function logoutUser(refreshToken: string, userId?: string): Promise<void> {
  const db = getDb();
  const tokenHash = hashRefreshToken(refreshToken);

  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.refreshTokenHash, tokenHash), isNull(sessions.revokedAt)));

  await db.insert(auditLogs).values({
    userId,
    action: "auth.logout",
    metadata: {},
  });
}

export async function rotateRefreshToken(
  refreshToken: string,
): Promise<{ user: UserRow; tokens: IssuedTokens }> {
  const db = getDb();
  const tokenHash = hashRefreshToken(refreshToken);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.refreshTokenHash, tokenHash),
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw new AuthError("Session expired or invalid. Please log in again.", 401);
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) throw new AuthError("User not found.", 401);

  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));

  const tokens = await issueSession(user.id, user.email, {
    userAgent: session.userAgent ?? undefined,
    ip: session.ip ?? undefined,
  });
  return { user, tokens };
}

export async function getUserById(userId: string): Promise<UserRow | undefined> {
  const db = getDb();
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}
