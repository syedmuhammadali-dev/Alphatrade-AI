import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { createLogger } from "@alphatrade/shared-config";
import type { SymbolDetailResponse, ScannerResponse } from "@alphatrade/shared-types";
import type { MarketDataStore } from "./store";
import { buildScanner } from "./scanner";

export async function buildApp(store: MarketDataStore, quoteFilter: string) {
  const logger = createLogger("market-data");
  const app = Fastify({ loggerInstance: logger });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, tickerCount: store.listTickers().length }));

  app.get<{ Querystring: { limit?: string; quote?: string } }>("/internal/scanner", async (request) => {
    const limit = request.query.limit ? Number(request.query.limit) : undefined;
    const quote = request.query.quote ?? quoteFilter;
    const entries = buildScanner(store, { quoteFilter: quote, limit });
    const response: ScannerResponse = {
      updatedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    };
    return response;
  });

  app.get<{ Params: { symbol: string } }>("/internal/symbol/:symbol", async (request) => {
    const symbol = request.params.symbol.toUpperCase();
    const response: SymbolDetailResponse = {
      ticker: store.getTicker(symbol) ?? null,
      candles: store.getCandles(symbol),
    };
    return response;
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({ error: statusCode >= 500 ? "Internal server error." : error.message });
  });

  return app;
}
