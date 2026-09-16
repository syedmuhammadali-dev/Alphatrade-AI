import type { AnalysisResult, MarketStructure, MarketRegime, StrategySignal } from "@alphatrade/shared-types";

export interface StrategyContext {
  symbol: string;
  analysis: AnalysisResult;
  structure: MarketStructure;
  regime: MarketRegime;
}

/** Per the target architecture's strategy contract — every strategy is an independent, swappable module. */
export interface TradingStrategy {
  name: string;
  description: string;
  /** Market conditions (regimes) this strategy is designed for — used to skip it entirely outside those conditions. */
  getRequiredMarketConditions(): MarketRegime[];
  analyze(context: StrategyContext): StrategySignal;
}

export function noTradeSignal(strategyName: string, reasoning: string): StrategySignal {
  return {
    strategyName,
    action: "NO_TRADE",
    confidence: 0,
    entryZone: null,
    stopLoss: null,
    takeProfit: null,
    riskReward: null,
    reasoning,
  };
}
