import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { createLogger } from "@alphatrade/shared-config";
import { backtestRequestSchema } from "@alphatrade/shared-types";
import { fetchKlineRange } from "@alphatrade/exchange-client";
import { runBacktest } from "@alphatrade/backtesting-engine";

export async function buildApp(restBaseUrl: string) {
  const logger = createLogger("backtesting-engine");
  const app = Fastify({ loggerInstance: logger });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.post("/internal/run", async (request, reply) => {
    const parsed = backtestRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const req = parsed.data;

    const startTime = Date.parse(req.startDate);
    const endTime = Date.parse(req.endDate);
    if (endTime <= startTime) {
      return reply.code(400).send({ error: "endDate must be after startDate." });
    }

    let candles;
    try {
      candles = await fetchKlineRange(restBaseUrl, req.symbol.toUpperCase(), req.interval, startTime, endTime);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Failed to fetch historical candles." });
    }

    if (candles.length === 0) {
      return reply.code(422).send({ error: "No historical candles found for the requested symbol/date range." });
    }

    const result = runBacktest(candles, {
      symbol: req.symbol.toUpperCase(),
      interval: req.interval,
      strategies: req.strategies,
      minConfidence: req.minConfidence,
      minRiskReward: req.minRiskReward,
      initialBalanceUsd: req.initialBalanceUsd,
    });

    return reply.send(result);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: statusCode >= 500 ? "Internal server error." : error.message });
  });

  return app;
}
