import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { createLogger } from "@alphatrade/shared-config";
import { computeDecision } from "./decision";
import { computeOpportunities } from "./opportunities";
import { UpstreamUnavailableError } from "./upstream-clients";
import { DEFAULT_THRESHOLDS } from "./thresholds";

interface CommonQuery {
  minConfidence?: string;
  minRiskReward?: string;
  enabledStrategies?: string;
}

function parseThresholdOptions(query: CommonQuery) {
  return {
    minConfidence: query.minConfidence ? Number(query.minConfidence) : DEFAULT_THRESHOLDS.minConfidence,
    minRiskReward: query.minRiskReward ? Number(query.minRiskReward) : DEFAULT_THRESHOLDS.minRiskReward,
    enabledStrategies: query.enabledStrategies
      ? query.enabledStrategies.split(",").map((s) => s.trim())
      : undefined,
  };
}

export async function buildApp(analysisEngineUrl: string, marketDataUrl: string) {
  const logger = createLogger("trading-engine");
  const app = Fastify({ loggerInstance: logger });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.get<{ Params: { symbol: string }; Querystring: CommonQuery }>(
    "/internal/decision/:symbol",
    async (request, reply) => {
      try {
        const symbol = request.params.symbol.toUpperCase();
        const decision = await computeDecision(analysisEngineUrl, symbol, parseThresholdOptions(request.query));
        return reply.send(decision);
      } catch (err) {
        if (err instanceof UpstreamUnavailableError) {
          return reply.code(503).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.get<{ Querystring: CommonQuery & { symbols?: string } }>("/internal/opportunities", async (request, reply) => {
    try {
      const symbols = request.query.symbols
        ? request.query.symbols.split(",").map((s) => s.trim().toUpperCase())
        : [];
      if (symbols.length === 0) {
        return reply.code(400).send({ error: "symbols query param is required (comma-separated)." });
      }
      const result = await computeOpportunities(
        analysisEngineUrl,
        marketDataUrl,
        symbols,
        parseThresholdOptions(request.query),
      );
      return reply.send(result);
    } catch (err) {
      if (err instanceof UpstreamUnavailableError) {
        return reply.code(503).send({ error: err.message });
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
