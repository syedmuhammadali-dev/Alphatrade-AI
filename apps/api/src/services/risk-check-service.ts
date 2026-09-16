import { getDb, riskChecks } from "@alphatrade/database";
import type { TradeProposal, RiskConfig, RiskCheckResult } from "@alphatrade/shared-types";

export async function recordRiskCheck(
  userId: string,
  proposal: TradeProposal,
  config: RiskConfig,
  result: RiskCheckResult,
): Promise<void> {
  const db = getDb();
  await db.insert(riskChecks).values({
    userId,
    symbol: proposal.symbol,
    proposalId: proposal.id,
    decision: result.decision,
    reasons: result.reasons,
    positionSizeUnits: result.positionSize?.units ?? null,
    positionSizeNotionalUsd: result.positionSize?.notionalValueUsd ?? null,
    riskConfigSnapshot: config,
  });
}
