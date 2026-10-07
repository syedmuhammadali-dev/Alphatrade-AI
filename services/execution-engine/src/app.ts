import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { createLogger } from "@alphatrade/shared-config";
import { getAccountInfo, placeMarketOrder, ExchangeApiError } from "@alphatrade/exchange-client";
import { withRetry } from "./retry";

const connectionSchema = z.object({
  baseUrl: z.string().min(1),
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
});

const orderSchema = connectionSchema.extend({
  symbol: z.string().min(1),
  side: z.enum(["BUY", "SELL"]),
  quantity: z.number().positive(),
  clientOrderId: z.string().min(1).max(36),
});

export async function buildApp() {
  const logger = createLogger("execution-engine");
  const app = Fastify({ loggerInstance: logger });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.post("/internal/account", async (request, reply) => {
    const parsed = connectionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    try {
      const account = await withRetry(() => getAccountInfo(parsed.data.baseUrl, parsed.data.apiKey, parsed.data.apiSecret));
      return reply.send(account);
    } catch (err) {
      if (err instanceof ExchangeApiError) {
        return reply.code(502).send({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  app.post("/internal/orders", async (request, reply) => {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    try {
      const result = await withRetry(() =>
        placeMarketOrder(parsed.data.baseUrl, parsed.data.apiKey, parsed.data.apiSecret, {
          symbol: parsed.data.symbol,
          side: parsed.data.side,
          quantity: parsed.data.quantity,
          clientOrderId: parsed.data.clientOrderId,
        }),
      );
      return reply.send(result);
    } catch (err) {
      if (err instanceof ExchangeApiError) {
        return reply.code(502).send({ error: err.message, code: err.code });
      }
      throw err;
    }
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: statusCode >= 500 ? "Internal server error." : error.message });
  });

  return app;
}
