import type { FastifyInstance } from "fastify";
import { getScanner, getSymbolDetail, MarketDataUnavailableError } from "../services/market-data-client";

export default async function marketRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string; quote?: string } }>(
    "/market/scanner",
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const limit = request.query.limit ? Number(request.query.limit) : undefined;
        const scanner = await getScanner({ limit, quote: request.query.quote });
        return reply.send(scanner);
      } catch (err) {
        if (err instanceof MarketDataUnavailableError) {
          return reply.code(503).send({ error: err.message });
        }
        throw err;
      }
    },
  );

  app.get<{ Params: { symbol: string } }>(
    "/market/:symbol",
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const detail = await getSymbolDetail(request.params.symbol);
        return reply.send(detail);
      } catch (err) {
        if (err instanceof MarketDataUnavailableError) {
          return reply.code(503).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
