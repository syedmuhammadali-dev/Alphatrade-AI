import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { createLogger } from "@alphatrade/shared-config";
import type { SymbolAnalysisResponse } from "@alphatrade/shared-types";
import { analyze, detectStructure, DeterministicRegimeDetector } from "@alphatrade/market-analysis";
import { fetchCandles, MarketDataUnavailableError } from "./market-data-client";

const MIN_CANDLES_FOR_ANALYSIS = 30;

export async function buildApp(marketDataUrl: string) {
  const logger = createLogger("analysis-engine");
  const app = Fastify({ loggerInstance: logger });
  const regimeDetector = new DeterministicRegimeDetector();

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  app.get<{ Params: { symbol: string } }>("/internal/analysis/:symbol", async (request, reply) => {
    const symbol = request.params.symbol.toUpperCase();

    let candles;
    try {
      candles = await fetchCandles(marketDataUrl, symbol);
    } catch (err) {
      if (err instanceof MarketDataUnavailableError) {
        return reply.code(503).send({ error: err.message });
      }
      throw err;
    }

    if (candles.length < MIN_CANDLES_FOR_ANALYSIS) {
      const response: SymbolAnalysisResponse = { analysis: null, structure: null, regime: "UNCERTAIN" };
      return reply.send(response);
    }

    const response: SymbolAnalysisResponse = {
      analysis: analyze(symbol, "1m", candles),
      structure: detectStructure(candles),
      regime: regimeDetector.detect({ candles }),
    };
    return reply.send(response);
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: statusCode >= 500 ? "Internal server error." : error.message });
  });

  return app;
}
