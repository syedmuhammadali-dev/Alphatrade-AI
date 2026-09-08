import type { FastifyInstance } from "fastify";
import { registerRequestSchema, loginRequestSchema, type User } from "@alphatrade/shared-types";
import {
  registerUser,
  loginUser,
  logoutUser,
  rotateRefreshToken,
  getUserById,
  AuthError,
} from "../services/auth-service";
import type { UserRow } from "@alphatrade/database";

function toPublicUser(user: UserRow): User {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }

    try {
      const { user, tokens } = await registerUser(parsed.data.email, parsed.data.password, {
        userAgent: request.headers["user-agent"],
        ip: request.ip,
      });
      app.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);
      return reply.code(201).send({ user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }

    try {
      const { user, tokens } = await loginUser(parsed.data.email, parsed.data.password, {
        userAgent: request.headers["user-agent"],
        ip: request.ip,
      });
      app.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);
      return reply.send({ user: toPublicUser(user) });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post("/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies.refresh_token;
    if (!refreshToken) {
      return reply.code(401).send({ error: "No refresh token provided." });
    }

    try {
      const { user, tokens } = await rotateRefreshToken(refreshToken);
      app.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);
      return reply.send({ user: toPublicUser(user) });
    } catch (err) {
      app.clearAuthCookies(reply);
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const refreshToken = request.cookies.refresh_token;
    if (refreshToken) {
      await logoutUser(refreshToken, request.userId);
    }
    app.clearAuthCookies(reply);
    return reply.send({ ok: true });
  });

  app.get("/auth/me", { preHandler: app.authenticate }, async (request, reply) => {
    const user = await getUserById(request.userId!);
    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }
    return reply.send({ user: toPublicUser(user) });
  });
}
