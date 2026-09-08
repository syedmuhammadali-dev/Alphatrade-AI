import { z } from "zod";

/** 24hr rolling ticker snapshot for one symbol, refreshed continuously from the exchange stream. */
export const tickerSnapshotSchema = z.object({
  symbol: z.string(),
  lastPrice: z.number(),
  priceChangePercent: z.number(),
  highPrice: z.number(),
  lowPrice: z.number(),
  quoteVolume: z.number(),
  updatedAt: z.string().datetime(),
});
export type TickerSnapshot = z.infer<typeof tickerSnapshotSchema>;

export const candleSchema = z.object({
  symbol: z.string(),
  interval: z.string(),
  openTime: z.number(),
  closeTime: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});
export type Candle = z.infer<typeof candleSchema>;

export const scannerEntrySchema = tickerSnapshotSchema.extend({
  rank: z.number(),
});
export type ScannerEntry = z.infer<typeof scannerEntrySchema>;

export const scannerResponseSchema = z.object({
  updatedAt: z.string().datetime(),
  count: z.number(),
  entries: z.array(scannerEntrySchema),
});
export type ScannerResponse = z.infer<typeof scannerResponseSchema>;

export const symbolDetailResponseSchema = z.object({
  ticker: tickerSnapshotSchema.nullable(),
  candles: z.array(candleSchema),
});
export type SymbolDetailResponse = z.infer<typeof symbolDetailResponseSchema>;

/**
 * Normalized market-data events, per the target architecture's
 * MARKET_TICK / CANDLE_CLOSED contract. VOLUME_SPIKE, VOLATILITY_CHANGE and
 * ORDERBOOK_IMBALANCE are analysis-derived (Phase 3+) and not emitted here.
 */
export const marketTickEventSchema = z.object({
  type: z.literal("MARKET_TICK"),
  payload: tickerSnapshotSchema,
});
export type MarketTickEvent = z.infer<typeof marketTickEventSchema>;

export const candleClosedEventSchema = z.object({
  type: z.literal("CANDLE_CLOSED"),
  payload: candleSchema,
});
export type CandleClosedEvent = z.infer<typeof candleClosedEventSchema>;

export const marketEventSchema = z.discriminatedUnion("type", [
  marketTickEventSchema,
  candleClosedEventSchema,
]);
export type MarketEvent = z.infer<typeof marketEventSchema>;
