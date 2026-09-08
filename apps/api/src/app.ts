import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { loadEnv, createLogger } from "@alphatrade/shared-config";
import authPlugin from "./plugins/auth";
import authRoutes from "./routes/auth";
import botRoutes from "./routes/bot";

export async function buildApp() {
  const env = loadEnv();
  const logger = createLogger("api");

  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
  await app.register(authPlugin);

  await app.register(authRoutes);
  await app.register(botRoutes);

  app.get("/health", async () => ({ ok: true }));

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: statusCode >= 500 ? "Internal server error." : error.message,
    });
  });

  return app;
}
