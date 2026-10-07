import { z } from "zod";
import { positionStatusSchema, closeReasonSchema } from "./paper-trading";

/** Mirrors paper-trading's shapes — same LONG-only, one-position-per-symbol scope, now against a real exchange connection. */
export const livePositionSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
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
  entryOrderId: z.string(),
  exitOrderId: z.string().nullable(),
});
export type LivePosition = z.infer<typeof livePositionSchema>;

export const executeLiveTradeResultSchema = z.object({
  executed: z.boolean(),
  reason: z.string(),
  position: livePositionSchema.nullable(),
});
export type ExecuteLiveTradeResult = z.infer<typeof executeLiveTradeResultSchema>;
