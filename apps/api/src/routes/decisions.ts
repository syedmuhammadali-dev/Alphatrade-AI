import type { FastifyInstance } from "fastify";
import { loadEnv } from "@alphatrade/shared-config";
import { getDecision, getOpportunities, TradingEngineUnavailableError } from "../services/trading-engine-client";
import { getEnabledStrategyNames } from "../services/strategy-config-service";
import { recordDecision, recordOpportunities } from "../services/trade-decision-service";

export default async function decisionsRoutes(app: FastifyInstance) {
  app.get("/decisions", { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const env = loadEnv();
      const watchlist = env.MARKET_DATA_WATCHLIST.split(",").map((s) => s.trim()).filter(Boolean);
      const enabledStrategies = await getEnabledStrategyNames(request.userId!);

      const result = await getOpportunities(watchlist, enabledStrategies);
      await recordOpportunities(request.userId!, result.opportunities);

      return reply.send(result);
    } catch (err) {
      if (err instanceof TradingEngineUnavailableError) {
        return reply.code(503).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get<{ Params: { symbol: string } }>(
    "/decisions/:symbol",
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const symbol = request.params.symbol.toUpperCase();
        const enabledStrategies = await getEnabledStrategyNames(request.userId!);

        const decision = await getDecision(symbol, enabledStrategies);
        await recordDecision(request.userId!, symbol, decision.proposal?.regime ?? "UNCERTAIN", decision);

        return reply.send(decision);
      } catch (err) {
        if (err instanceof TradingEngineUnavailableError) {
          return reply.code(503).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
