import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { STRATEGIES } from "@alphatrade/strategy-engine";
import type { StrategyInfo, StrategyPerformance } from "@alphatrade/shared-types";
import { setStrategyEnabled } from "../services/strategy-config-service";

const toggleBodySchema = z.object({ enabled: z.boolean() });

export default async function strategiesRoutes(app: FastifyInstance) {
  app.get("/strategies", { preHandler: app.authenticate }, async (_request, reply) => {
    const infos: StrategyInfo[] = STRATEGIES.map((s) => ({
      name: s.name,
      description: s.description,
      requiredConditions: s.getRequiredMarketConditions(),
    }));
    return reply.send({ strategies: infos });
  });

  app.get("/strategies/performance", { preHandler: app.authenticate }, async (_request, reply) => {
    // No paper or live trades exist yet (Phase 6+), so there is nothing real
    // to report — return honest zeroed stats rather than fabricated numbers.
    const performance: StrategyPerformance[] = STRATEGIES.map((s) => ({
      strategy: s.name,
      totalTrades: 0,
      winRate: null,
      averageRiskReward: null,
    }));
    return reply.send({ performance, note: "No trade history yet — paper trading ships in Phase 6." });
  });

  app.patch<{ Params: { name: string } }>(
    "/strategies/:name",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const strategy = STRATEGIES.find((s) => s.name === request.params.name);
      if (!strategy) {
        return reply.code(404).send({ error: "Unknown strategy." });
      }
      const parsed = toggleBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid request.", details: parsed.error.flatten() });
      }

      await setStrategyEnabled(request.userId!, strategy.name, parsed.data.enabled);
      return reply.send({ ok: true });
    },
  );
}
