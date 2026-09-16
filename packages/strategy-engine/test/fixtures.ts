import type { AnalysisResult, MarketStructure, MarketRegime } from "@alphatrade/shared-types";
import type { StrategyContext } from "../src/types";

export function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    symbol: "BTCUSDT",
    timeframe: "1m",
    lastPrice: 100,
    rsi: 50,
    macd: { value: 0, signal: 0, histogram: 0 },
    ema20: null,
    ema50: null,
    ema200: null,
    atr: 2,
    vwap: 100,
    adx: 30,
    bollinger: { upper: 110, middle: 100, lower: 90 },
    volumeRatio: 1,
    trend: "neutral",
    candleCount: 200,
    ...overrides,
  };
}

export function makeStructure(overrides: Partial<MarketStructure> = {}): MarketStructure {
  return {
    pattern: "INSUFFICIENT_DATA",
    bias: "RANGE",
    swingHighs: [],
    swingLows: [],
    support: null,
    resistance: null,
    breakout: false,
    breakdown: false,
    ...overrides,
  };
}

export function makeContext(overrides: {
  analysis?: Partial<AnalysisResult>;
  structure?: Partial<MarketStructure>;
  regime?: MarketRegime;
  symbol?: string;
} = {}): StrategyContext {
  return {
    symbol: overrides.symbol ?? "BTCUSDT",
    analysis: makeAnalysis(overrides.analysis),
    structure: makeStructure(overrides.structure),
    regime: overrides.regime ?? "UNCERTAIN",
  };
}
