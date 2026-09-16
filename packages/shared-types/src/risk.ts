import { z } from "zod";

/**
 * Configurable, deterministic risk rules — independent of the strategy/AI
 * decision layer. accountBalanceUsd is a user-set reference balance used for
 * position sizing until Phase 6 (paper trading) provides a real one; it's an
 * explicit assumption, not a fabricated "current balance".
 */
export const riskConfigSchema = z.object({
  riskPerTradePercent: z.number().min(0.01).max(100).default(1),
  maxDailyLossPercent: z.number().min(0.01).max(100).default(3),
  maxOpenPositions: z.number().int().min(1).max(50).default(3),
  maxLosingStreak: z.number().int().min(1).max(50).default(5),
  maxPortfolioExposurePercent: z.number().min(1).max(100).default(50),
  minimumRiskReward: z.number().min(0).default(2),
  minimumConfidence: z.number().min(0).max(100).default(75),
  maxPositionSizePercent: z.number().min(1).max(100).default(20),
  accountBalanceUsd: z.number().min(0).default(10_000),
});
export type RiskConfig = z.infer<typeof riskConfigSchema>;

export const DEFAULT_RISK_CONFIG: RiskConfig = riskConfigSchema.parse({});

/** Current portfolio state, supplied by the caller — the risk engine never fetches this itself. Defaults to a safe empty-portfolio state. */
export const accountStateSchema = z.object({
  openPositionsCount: z.number().int().min(0).default(0),
  dailyPnlPercent: z.number().default(0),
  currentExposurePercent: z.number().min(0).default(0),
  currentLosingStreak: z.number().int().min(0).default(0),
});
export type AccountState = z.infer<typeof accountStateSchema>;
export const DEFAULT_ACCOUNT_STATE: AccountState = accountStateSchema.parse({});

export const positionSizeSchema = z.object({
  units: z.number(),
  notionalValueUsd: z.number(),
  riskAmountUsd: z.number(),
  cappedByMaxPositionSize: z.boolean(),
});
export type PositionSize = z.infer<typeof positionSizeSchema>;

export const riskCheckResultSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reasons: z.array(z.string()),
  positionSize: positionSizeSchema.nullable(),
});
export type RiskCheckResult = z.infer<typeof riskCheckResultSchema>;
