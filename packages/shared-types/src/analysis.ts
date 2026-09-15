import { z } from "zod";

export const trendSchema = z.enum(["bullish", "bearish", "neutral"]);
export type Trend = z.infer<typeof trendSchema>;

/** Normalized technical analysis object, per the target architecture's analysis-engine contract. */
export const analysisResultSchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  rsi: z.number().nullable(),
  macd: z.object({
    value: z.number().nullable(),
    signal: z.number().nullable(),
    histogram: z.number().nullable(),
  }),
  ema20: z.number().nullable(),
  ema50: z.number().nullable(),
  ema200: z.number().nullable(),
  atr: z.number().nullable(),
  vwap: z.number().nullable(),
  adx: z.number().nullable(),
  volumeRatio: z.number().nullable(),
  trend: trendSchema,
  candleCount: z.number(),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const structureBiasSchema = z.enum(["BULLISH_STRUCTURE", "BEARISH_STRUCTURE", "RANGE"]);
export type StructureBias = z.infer<typeof structureBiasSchema>;

export const structurePatternSchema = z.enum(["HH_HL", "LH_LL", "MIXED", "INSUFFICIENT_DATA"]);
export type StructurePattern = z.infer<typeof structurePatternSchema>;

export const marketStructureSchema = z.object({
  pattern: structurePatternSchema,
  bias: structureBiasSchema,
  swingHighs: z.array(z.number()),
  swingLows: z.array(z.number()),
  support: z.number().nullable(),
  resistance: z.number().nullable(),
  breakout: z.boolean(),
  breakdown: z.boolean(),
});
export type MarketStructure = z.infer<typeof marketStructureSchema>;

export const marketRegimeSchema = z.enum([
  "TRENDING_BULLISH",
  "TRENDING_BEARISH",
  "RANGING",
  "HIGH_VOLATILITY",
  "LOW_VOLATILITY",
  "UNCERTAIN",
]);
export type MarketRegime = z.infer<typeof marketRegimeSchema>;

export const symbolAnalysisResponseSchema = z.object({
  analysis: analysisResultSchema.nullable(),
  structure: marketStructureSchema.nullable(),
  regime: marketRegimeSchema,
});
export type SymbolAnalysisResponse = z.infer<typeof symbolAnalysisResponseSchema>;
