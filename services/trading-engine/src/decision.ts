import type { DecisionResponse, StrategySignal } from "@alphatrade/shared-types";
import { STRATEGIES, runAllStrategies, selectBestSignal, buildProposal, type StrategyContext } from "@alphatrade/strategy-engine";
import { fetchAnalysis } from "./upstream-clients";
import { applyThresholds, DEFAULT_THRESHOLDS, type Thresholds } from "./thresholds";

export interface DecisionOptions extends Thresholds {
  enabledStrategies?: string[];
}

/** Coordinates analysis -> strategy selection -> a single symbol's TradeProposal (or NO_TRADE). Never executes anything. */
export async function computeDecision(
  analysisEngineUrl: string,
  symbol: string,
  options: DecisionOptions = DEFAULT_THRESHOLDS,
): Promise<DecisionResponse> {
  const { analysis, structure, regime } = await fetchAnalysis(analysisEngineUrl, symbol);

  if (analysis === null || structure === null) {
    return {
      symbol,
      action: "NO_TRADE",
      proposal: null,
      signals: [],
    };
  }

  const context: StrategyContext = { symbol, analysis, structure, regime };
  const strategies = options.enabledStrategies
    ? STRATEGIES.filter((s) => options.enabledStrategies!.includes(s.name))
    : STRATEGIES;

  const signals: StrategySignal[] = runAllStrategies(context, strategies);
  const best = applyThresholds(selectBestSignal(signals), options);
  const proposal = buildProposal(symbol, best, regime);

  return {
    symbol,
    action: best.action,
    proposal,
    signals,
  };
}
