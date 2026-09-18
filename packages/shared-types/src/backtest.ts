import { z } from "zod";

/**
 * Backtests replay historical candles independently of the live market-data
 * stream (which only holds 1m data), so a wider set of intervals is
 * supported here via Binance's REST klines endpoint directly.
 */
export const backtestIntervalSchema = z.enum(["15m", "1h", "4h", "1d"]);
export type BacktestInterval = z.infer<typeof backtestIntervalSchema>;

export const backtestRequestSchema = z.object({
  symbol: z.string().min(1),
  interval: backtestIntervalSchema.default("1h"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  strategies: z.array(z.string()).optional(),
  initialBalanceUsd: z.number().min(100).max(10_000_000).default(10_000),
  minConfidence: z.number().min(0).max(100).default(60),
  minRiskReward: z.number().min(0).default(1.5),
});
export type BacktestRequest = z.infer<typeof backtestRequestSchema>;

export const backtestCloseReasonSchema = z.enum(["TAKE_PROFIT", "STOP_LOSS", "END_OF_BACKTEST"]);
export type BacktestCloseReason = z.infer<typeof backtestCloseReasonSchema>;

export const backtestTradeSchema = z.object({
  symbol: z.string(),
  side: z.literal("LONG"),
  strategy: z.string(),
  entryTime: z.string().datetime(),
  entryPrice: z.number(),
  exitTime: z.string().datetime(),
  exitPrice: z.number(),
  quantity: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  closeReason: backtestCloseReasonSchema,
  entryFeeUsd: z.number(),
  exitFeeUsd: z.number(),
  realizedPnlUsd: z.number(),
  realizedRiskReward: z.number().nullable(),
});
export type BacktestTrade = z.infer<typeof backtestTradeSchema>;

export const backtestMetricsSchema = z.object({
  initialBalanceUsd: z.number(),
  finalBalanceUsd: z.number(),
  totalReturnPercent: z.number(),
  tradeCount: z.number().int(),
  wins: z.number().int(),
  losses: z.number().int(),
  winRate: z.number().nullable(),
  profitFactor: z.number().nullable(),
  sharpeRatio: z.number().nullable(),
  maxDrawdownPercent: z.number(),
  averageRiskReward: z.number().nullable(),
});
export type BacktestMetrics = z.infer<typeof backtestMetricsSchema>;

export const backtestResultSchema = z.object({
  metrics: backtestMetricsSchema,
  trades: z.array(backtestTradeSchema),
});
export type BacktestResult = z.infer<typeof backtestResultSchema>;

export const backtestStatusSchema = z.enum(["COMPLETED", "FAILED"]);
export type BacktestStatus = z.infer<typeof backtestStatusSchema>;

export const backtestSummarySchema = z.object({
  id: z.string(),
  symbol: z.string(),
  interval: backtestIntervalSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: backtestStatusSchema,
  errorMessage: z.string().nullable(),
  totalReturnPercent: z.number().nullable(),
  winRate: z.number().nullable(),
  tradeCount: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});
export type BacktestSummary = z.infer<typeof backtestSummarySchema>;

export const backtestDetailSchema = backtestSummarySchema.extend({
  request: backtestRequestSchema,
  metrics: backtestMetricsSchema.nullable(),
  trades: z.array(backtestTradeSchema),
});
export type BacktestDetail = z.infer<typeof backtestDetailSchema>;
