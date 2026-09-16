import { z } from "zod";

export const actionSchema = z.enum(["LONG", "SHORT", "NO_TRADE"]);
export type Action = z.infer<typeof actionSchema>;

export const strategySignalSchema = z.object({
  strategyName: z.string(),
  action: actionSchema,
  confidence: z.number().min(0).max(100),
  entryZone: z.tuple([z.number(), z.number()]).nullable(),
  stopLoss: z.number().nullable(),
  takeProfit: z.number().nullable(),
  riskReward: z.number().nullable(),
  reasoning: z.string(),
});
export type StrategySignal = z.infer<typeof strategySignalSchema>;

/** The output of the Autonomous Decision Engine. Never executed directly — always routed through the risk engine first. */
export const tradeProposalSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: z.enum(["LONG", "SHORT"]),
  strategy: z.string(),
  confidence: z.number(),
  entryPrice: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  riskReward: z.number(),
  reasoning: z.string(),
  regime: z.string(),
  createdAt: z.string().datetime(),
});
export type TradeProposal = z.infer<typeof tradeProposalSchema>;

export const decisionResponseSchema = z.object({
  symbol: z.string(),
  action: actionSchema,
  proposal: tradeProposalSchema.nullable(),
  signals: z.array(strategySignalSchema),
});
export type DecisionResponse = z.infer<typeof decisionResponseSchema>;

export const rankedOpportunitySchema = z.object({
  symbol: z.string(),
  totalScore: z.number(),
  rank: z.number(),
  recommendedStrategy: z.string().nullable(),
  confidence: z.number(),
  action: actionSchema,
  proposal: tradeProposalSchema.nullable(),
});
export type RankedOpportunity = z.infer<typeof rankedOpportunitySchema>;

export const opportunitiesResponseSchema = z.object({
  updatedAt: z.string().datetime(),
  opportunities: z.array(rankedOpportunitySchema),
});
export type OpportunitiesResponse = z.infer<typeof opportunitiesResponseSchema>;

export const strategyInfoSchema = z.object({
  name: z.string(),
  description: z.string(),
  requiredConditions: z.array(z.string()),
});
export type StrategyInfo = z.infer<typeof strategyInfoSchema>;

export const strategyPerformanceSchema = z.object({
  strategy: z.string(),
  totalTrades: z.number(),
  winRate: z.number().nullable(),
  averageRiskReward: z.number().nullable(),
});
export type StrategyPerformance = z.infer<typeof strategyPerformanceSchema>;
