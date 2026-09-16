import type { FastifyInstance } from "fastify";
import { loadEnv } from "@alphatrade/shared-config";
import type { DecisionResponse, RankedOpportunity, RiskConfig } from "@alphatrade/shared-types";
import { getDecision, getOpportunities, TradingEngineUnavailableError } from "../services/trading-engine-client";
import { getEnabledStrategyNames } from "../services/strategy-config-service";
import { recordDecision, recordOpportunities } from "../services/trade-decision-service";
import { getRiskConfig } from "../services/risk-config-service";
import { checkProposal, RiskEngineUnavailableError } from "../services/risk-engine-client";
import { recordRiskCheck } from "../services/risk-check-service";
import { getPaperRiskContext } from "../services/paper-trading-service";

/** Merges the user's paper account balance (if one exists) into their risk config, per Phase 5's reserved-for-Phase-6 design. */
async function resolveRiskContext(userId: string): Promise<{ config: RiskConfig; accountState: Awaited<ReturnType<typeof getPaperRiskContext>>["accountState"] }> {
  const baseConfig = await getRiskConfig(userId);
  const { balanceOverride, accountState } = await getPaperRiskContext(userId);
  const config = balanceOverride !== null ? { ...baseConfig, accountBalanceUsd: balanceOverride } : baseConfig;
  return { config, accountState };
}

async function attachRiskCheck(userId: string, decision: DecisionResponse): Promise<DecisionResponse> {
  if (!decision.proposal) return decision;

  const { config, accountState } = await resolveRiskContext(userId);
  const riskCheck = await checkProposal(decision.proposal, config, accountState);
  await recordRiskCheck(userId, decision.proposal, config, riskCheck);
  return { ...decision, riskCheck };
}

export default async function decisionsRoutes(app: FastifyInstance) {
  app.get("/decisions", { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const env = loadEnv();
      const watchlist = env.MARKET_DATA_WATCHLIST.split(",").map((s) => s.trim()).filter(Boolean);
      const enabledStrategies = await getEnabledStrategyNames(request.userId!);

      const result = await getOpportunities(watchlist, enabledStrategies);
      await recordOpportunities(request.userId!, result.opportunities);

      const { config, accountState } = await resolveRiskContext(request.userId!);
      const opportunities: RankedOpportunity[] = await Promise.all(
        result.opportunities.map(async (opp) => {
          if (!opp.proposal) return opp;
          const riskCheck = await checkProposal(opp.proposal, config, accountState);
          await recordRiskCheck(request.userId!, opp.proposal, config, riskCheck);
          return { ...opp, riskCheck };
        }),
      );

      return reply.send({ ...result, opportunities });
    } catch (err) {
      if (err instanceof TradingEngineUnavailableError || err instanceof RiskEngineUnavailableError) {
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

        const withRiskCheck = await attachRiskCheck(request.userId!, decision);
        return reply.send(withRiskCheck);
      } catch (err) {
        if (err instanceof TradingEngineUnavailableError || err instanceof RiskEngineUnavailableError) {
          return reply.code(503).send({ error: err.message });
        }
        throw err;
      }
    },
  );
}
