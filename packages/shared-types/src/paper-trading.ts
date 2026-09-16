import { z } from "zod";

export const positionStatusSchema = z.enum(["OPEN", "CLOSED"]);
export type PositionStatus = z.infer<typeof positionStatusSchema>;

export const closeReasonSchema = z.enum(["TAKE_PROFIT", "STOP_LOSS", "MANUAL"]);
export type CloseReason = z.infer<typeof closeReasonSchema>;

export const paperAccountSchema = z.object({
  balanceUsd: z.number(),
  startingBalanceUsd: z.number(),
  equityUsd: z.number(),
  openPositionsCount: z.number(),
  createdAt: z.string().datetime(),
});
export type PaperAccount = z.infer<typeof paperAccountSchema>;

export const paperPositionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  side: z.literal("LONG"),
  entryPrice: z.number(),
  quantity: z.number(),
  stopLoss: z.number(),
  takeProfit: z.number(),
  status: positionStatusSchema,
  strategy: z.string(),
  currentPrice: z.number().nullable(),
  unrealizedPnlUsd: z.number().nullable(),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  closePrice: z.number().nullable(),
  closeReason: closeReasonSchema.nullable(),
  realizedPnlUsd: z.number().nullable(),
  feesUsd: z.number(),
});
export type PaperPosition = z.infer<typeof paperPositionSchema>;

export const paperPerformanceSchema = z.object({
  totalTrades: z.number(),
  wins: z.number(),
  losses: z.number(),
  winRate: z.number().nullable(),
  totalPnlUsd: z.number(),
  totalFeesUsd: z.number(),
  profitFactor: z.number().nullable(),
});
export type PaperPerformance = z.infer<typeof paperPerformanceSchema>;

export const executePaperTradeResultSchema = z.object({
  executed: z.boolean(),
  reason: z.string(),
  position: paperPositionSchema.nullable(),
});
export type ExecutePaperTradeResult = z.infer<typeof executePaperTradeResultSchema>;
