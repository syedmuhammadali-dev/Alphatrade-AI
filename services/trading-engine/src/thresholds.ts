import type { StrategySignal } from "@alphatrade/shared-types";
import { noTradeSignal } from "@alphatrade/strategy-engine";

export interface Thresholds {
  minConfidence: number;
  minRiskReward: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { minConfidence: 60, minRiskReward: 1.5 };

/** Downgrades a signal to NO_TRADE if it doesn't clear the user's configured confidence/risk-reward bar. */
export function applyThresholds(signal: StrategySignal, thresholds: Thresholds): StrategySignal {
  if (signal.action === "NO_TRADE") return signal;

  if (signal.confidence < thresholds.minConfidence) {
    return noTradeSignal(
      signal.strategyName,
      `${signal.strategyName} signaled ${signal.action} at ${signal.confidence}% confidence, below the configured minimum of ${thresholds.minConfidence}%.`,
    );
  }

  if (signal.riskReward !== null && signal.riskReward < thresholds.minRiskReward) {
    return noTradeSignal(
      signal.strategyName,
      `${signal.strategyName} signaled ${signal.action} with ${signal.riskReward.toFixed(2)}:1 risk/reward, below the configured minimum of ${thresholds.minRiskReward}:1.`,
    );
  }

  return signal;
}
