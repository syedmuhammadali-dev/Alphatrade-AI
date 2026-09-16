import type { StrategySignal, MarketRegime } from "@alphatrade/shared-types";
import type { StrategyContext, TradingStrategy } from "../types";
import { noTradeSignal } from "../types";
import { computeRiskReward, clampConfidence } from "../utils";

const ATR_STOP_MULTIPLIER = 1.5;
const TARGET_RISK_REWARD = 2;

/** Trades in the direction of a confirmed trend once EMA20/50/200 are fully aligned. */
export class TrendFollowingStrategy implements TradingStrategy {
  name = "TrendFollowingStrategy";
  description = "Trades in the direction of a confirmed trend once EMA20/50/200 are fully aligned with price.";

  getRequiredMarketConditions(): MarketRegime[] {
    return ["TRENDING_BULLISH", "TRENDING_BEARISH"];
  }

  analyze(context: StrategyContext): StrategySignal {
    const { analysis } = context;
    const { ema20, ema50, ema200, atr, lastPrice } = analysis;

    if (ema20 === null || ema50 === null || ema200 === null || atr === null) {
      return noTradeSignal(this.name, "Not enough EMA/ATR history yet to assess trend alignment.");
    }

    const bullishAligned = ema20 > ema50 && ema50 > ema200 && lastPrice > ema20;
    const bearishAligned = ema20 < ema50 && ema50 < ema200 && lastPrice < ema20;

    if (!bullishAligned && !bearishAligned) {
      return noTradeSignal(this.name, "EMA20/50/200 are not fully aligned with price — no confirmed trend to follow.");
    }

    const side = bullishAligned ? "LONG" : "SHORT";
    const entry = lastPrice;
    const stopLoss = side === "LONG" ? entry - atr * ATR_STOP_MULTIPLIER : entry + atr * ATR_STOP_MULTIPLIER;
    const risk = Math.abs(entry - stopLoss);
    const takeProfit = side === "LONG" ? entry + risk * TARGET_RISK_REWARD : entry - risk * TARGET_RISK_REWARD;
    const riskReward = computeRiskReward(entry, stopLoss, takeProfit, side);

    if (riskReward === null) {
      return noTradeSignal(this.name, "Computed risk/reward was invalid.");
    }

    const adxConfidence = analysis.adx !== null ? Math.min(100, analysis.adx * 2) : 50;

    return {
      strategyName: this.name,
      action: side,
      confidence: clampConfidence(adxConfidence),
      entryZone: [entry, entry],
      stopLoss,
      takeProfit,
      riskReward,
      reasoning: `EMA20/50/200 fully ${side === "LONG" ? "bullish" : "bearish"}-aligned with price, ADX ${analysis.adx?.toFixed(1) ?? "n/a"} confirming trend strength.`,
    };
  }
}
