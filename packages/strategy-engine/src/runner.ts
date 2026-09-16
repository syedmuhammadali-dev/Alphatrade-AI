import type { StrategySignal } from "@alphatrade/shared-types";
import type { StrategyContext, TradingStrategy } from "./types";
import { noTradeSignal } from "./types";
import { STRATEGIES } from "./strategies";

/** Gates a strategy on its required market regime before letting it analyze at all. */
export function runStrategy(strategy: TradingStrategy, context: StrategyContext): StrategySignal {
  const requiredConditions = strategy.getRequiredMarketConditions();
  if (!requiredConditions.includes(context.regime)) {
    return noTradeSignal(
      strategy.name,
      `Regime ${context.regime} is not one of this strategy's required conditions (${requiredConditions.join(", ")}).`,
    );
  }
  return strategy.analyze(context);
}

export function runAllStrategies(context: StrategyContext, strategies: TradingStrategy[] = STRATEGIES): StrategySignal[] {
  return strategies.map((strategy) => runStrategy(strategy, context));
}

/** Highest-confidence actionable signal, or a NO_TRADE signal if none of the strategies found a trade. */
export function selectBestSignal(signals: StrategySignal[]): StrategySignal {
  const actionable = signals.filter((s) => s.action !== "NO_TRADE");
  if (actionable.length === 0) {
    return noTradeSignal("none", "No strategy produced an actionable signal for the current market conditions.");
  }
  return actionable.reduce((best, current) => (current.confidence > best.confidence ? current : best));
}
