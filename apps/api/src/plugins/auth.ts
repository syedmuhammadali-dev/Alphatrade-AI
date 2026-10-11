import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { loadEnv } from "@alphatrade/shared-config";
import { verifyAccessToken } from "../services/tokens";
import { parseDurationMs } from "../services/duration";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    setAuthCookies: (reply: FastifyReply, accessToken: string, refreshToken: string) => void;
    clearAuthCookies: (reply: FastifyReply) => void;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  const env = loadEnv();

  app.decorate(
    "authenticate",
    async function authenticate(request: FastifyRequest, reply: FastifyReply) {
      // The web app authenticates via the httpOnly access_token cookie. The
      // Chrome extension (Phase 10) can't rely on that cross-origin, so it
      // authenticates with a Bearer token instead — same JWT, same
      // verification, just carried differently. Cookie takes precedence
      // when both are somehow present.
      const bearer = request.headers.authorization?.startsWith("Bearer ")
        ? request.headers.authorization.slice("Bearer ".length)
        : undefined;
      const token = request.cookies.access_token ?? bearer;
      if (!token) {
        return reply.code(401).send({ error: "Not authenticated." });
      }
      try {
        const payload = verifyAccessToken(token);
        request.userId = payload.sub;
        request.userEmail = payload.email;
      } catch {
        return reply.code(401).send({ error: "Session expired. Please log in again." });
      }
    },
  );

  app.decorate("setAuthCookies", function setAuthCookies(reply, accessToken, refreshToken) {
    const cookieOptions = {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "strict" as const,
      path: "/",
    };
    reply.setCookie("access_token", accessToken, {
      ...cookieOptions,
      maxAge: parseDurationMs(env.JWT_ACCESS_TTL) / 1000,
    });
    reply.setCookie("refresh_token", refreshToken, {
      ...cookieOptions,
      maxAge: parseDurationMs(env.JWT_REFRESH_TTL) / 1000,
      path: "/auth",
    });
  });

  app.decorate("clearAuthCookies", function clearAuthCookies(reply) {
    reply.clearCookie("access_token", { path: "/" });
    reply.clearCookie("refresh_token", { path: "/auth" });
  });
});
