import type { AnalysisResult, MarketStructure, MarketRegime, StrategySignal, RankedOpportunity } from "@alphatrade/shared-types";
import { buildProposal } from "./proposal";

export interface RankerInput {
  symbol: string;
  /** Null when there isn't enough candle history yet — always paired with a NO_TRADE bestSignal in that case. */
  analysis: AnalysisResult | null;
  structure: MarketStructure | null;
  regime: MarketRegime;
  /** 24hr quote volume from the ticker, if available — used as a liquidity factor. */
  quoteVolume: number | null;
  bestSignal: StrategySignal;
}

const WEIGHTS = {
  confidence: 0.3,
  riskReward: 0.2,
  trendStrength: 0.15,
  structure: 0.15,
  liquidity: 0.1,
  volume: 0.1,
};

function scoreStructureAlignment(structure: MarketStructure, side: "LONG" | "SHORT"): number {
  const favorable = side === "LONG" ? "BULLISH_STRUCTURE" : "BEARISH_STRUCTURE";
  const opposing = side === "LONG" ? "BEARISH_STRUCTURE" : "BULLISH_STRUCTURE";
  if (structure.bias === favorable) return 100;
  if (structure.bias === opposing) return 0;
  return 50;
}

function scoreLiquidity(quoteVolume: number | null): number {
  if (quoteVolume === null || quoteVolume <= 0) return 0;
  // Quote volume spans many orders of magnitude across symbols — a log scale
  // keeps a single illiquid outlier from swamping the linear factors.
  return Math.max(0, Math.min(100, (Math.log10(quoteVolume + 1) / 9) * 100));
}

/**
 * Scores one opportunity across trend strength, volume, market structure,
 * risk/reward, liquidity, and strategy confidence — a straightforward
 * multi-factor scan, not itself a trading strategy. NO_TRADE opportunities
 * always score 0 so they naturally sink to the bottom of the ranking while
 * still being visible for transparency.
 */
export function scoreOpportunity(input: RankerInput): RankedOpportunity {
  const { symbol, analysis, structure, bestSignal, quoteVolume } = input;

  if (bestSignal.action === "NO_TRADE" || analysis === null || structure === null) {
    return {
      symbol,
      totalScore: 0,
      rank: 0,
      recommendedStrategy: null,
      confidence: 0,
      action: "NO_TRADE",
      proposal: null,
    };
  }

  const confidenceScore = bestSignal.confidence;
  const riskRewardScore = bestSignal.riskReward !== null ? Math.min(100, bestSignal.riskReward * 33) : 0;
  const trendStrengthScore = analysis.adx !== null ? Math.min(100, analysis.adx * 2) : 50;
  const structureScore = scoreStructureAlignment(structure, bestSignal.action);
  const liquidityScore = scoreLiquidity(quoteVolume);
  const volumeScore = analysis.volumeRatio !== null ? Math.min(100, analysis.volumeRatio * 50) : 50;

  const totalScore =
    confidenceScore * WEIGHTS.confidence +
    riskRewardScore * WEIGHTS.riskReward +
    trendStrengthScore * WEIGHTS.trendStrength +
    structureScore * WEIGHTS.structure +
    liquidityScore * WEIGHTS.liquidity +
    volumeScore * WEIGHTS.volume;

  const proposal = buildProposal(symbol, bestSignal, input.regime);

  return {
    symbol,
    totalScore: Math.round(totalScore * 100) / 100,
    rank: 0,
    recommendedStrategy: bestSignal.strategyName,
    confidence: bestSignal.confidence,
    action: bestSignal.action,
    proposal,
  };
}

/** Ranks opportunities highest-score-first and assigns 1-based ranks. NO_TRADE entries stay in the list (score 0) for transparency. */
export function rankOpportunities(inputs: RankerInput[]): RankedOpportunity[] {
  const scored = inputs.map(scoreOpportunity).sort((a, b) => b.totalScore - a.totalScore);
  return scored.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
