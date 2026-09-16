import { getDb, tradeDecisions } from "@alphatrade/database";
import type { DecisionResponse, RankedOpportunity } from "@alphatrade/shared-types";

/** Persists a computed decision (including NO_TRADE — a valid, worth-auditing outcome). */
export async function recordDecision(userId: string, symbol: string, regime: string, decision: DecisionResponse): Promise<void> {
  const db = getDb();
  const { proposal } = decision;

  await db.insert(tradeDecisions).values({
    userId,
    symbol,
    side: decision.action,
    strategy: proposal?.strategy ?? null,
    confidence: proposal?.confidence ?? 0,
    entryPrice: proposal?.entryPrice ?? null,
    stopLoss: proposal?.stopLoss ?? null,
    takeProfit: proposal?.takeProfit ?? null,
    riskReward: proposal?.riskReward ?? null,
    regime,
    reasoning: proposal?.reasoning ?? decision.signals.map((s) => s.reasoning).join(" | ") ?? "No signals.",
  });
}

export async function recordOpportunities(userId: string, opportunities: RankedOpportunity[]): Promise<void> {
  const db = getDb();
  const actionable = opportunities.filter((o) => o.proposal !== null);
  if (actionable.length === 0) return;

  await db.insert(tradeDecisions).values(
    actionable.map((o) => ({
      userId,
      symbol: o.symbol,
      side: o.action,
      strategy: o.proposal!.strategy,
      confidence: o.proposal!.confidence,
      entryPrice: o.proposal!.entryPrice,
      stopLoss: o.proposal!.stopLoss,
      takeProfit: o.proposal!.takeProfit,
      riskReward: o.proposal!.riskReward,
      regime: o.proposal!.regime,
      reasoning: o.proposal!.reasoning,
    })),
  );
}
