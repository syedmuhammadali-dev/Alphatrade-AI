import type { StrategySignal, MarketRegime } from "@alphatrade/shared-types";
import type { StrategyContext, TradingStrategy } from "../types";
import { noTradeSignal } from "../types";
import { computeRiskReward, clampConfidence } from "../utils";

const ATR_STOP_MULTIPLIER = 1.2;
const TARGET_RISK_REWARD = 1.5;

/** Trades continuation in the direction of confirmed momentum (MACD histogram + RSI not yet extreme). */
export class MomentumStrategy implements TradingStrategy {
  name = "MomentumStrategy";
  description = "Trades continuation in the direction of confirmed momentum (MACD histogram + RSI not yet extreme).";

  getRequiredMarketConditions(): MarketRegime[] {
    return ["TRENDING_BULLISH", "TRENDING_BEARISH", "HIGH_VOLATILITY"];
  }

  analyze(context: StrategyContext): StrategySignal {
    const { analysis } = context;
    const { rsi, macd, atr, lastPrice } = analysis;

    if (rsi === null || macd.histogram === null || atr === null) {
      return noTradeSignal(this.name, "Not enough RSI/MACD history yet to assess momentum.");
    }

    const bullishMomentum = macd.histogram > 0 && rsi > 50 && rsi < 70;
    const bearishMomentum = macd.histogram < 0 && rsi < 50 && rsi > 30;

    if (!bullishMomentum && !bearishMomentum) {
      return noTradeSignal(
        this.name,
        "MACD histogram and RSI are not both confirming fresh momentum (or RSI is already at an extreme).",
      );
    }

    const side = bullishMomentum ? "LONG" : "SHORT";
    const entry = lastPrice;
    const stopLoss = side === "LONG" ? entry - atr * ATR_STOP_MULTIPLIER : entry + atr * ATR_STOP_MULTIPLIER;
    const risk = Math.abs(entry - stopLoss);
    const takeProfit = side === "LONG" ? entry + risk * TARGET_RISK_REWARD : entry - risk * TARGET_RISK_REWARD;
    const riskReward = computeRiskReward(entry, stopLoss, takeProfit, side);

    if (riskReward === null) {
      return noTradeSignal(this.name, "Computed risk/reward was invalid.");
    }

    const rsiDistanceFrom50 = Math.abs(rsi - 50);
    const confidence = 40 + rsiDistanceFrom50 * 1.5 + Math.min(20, Math.abs(macd.histogram) * 10);

    return {
      strategyName: this.name,
      action: side,
      confidence: clampConfidence(confidence),
      entryZone: [entry, entry],
      stopLoss,
      takeProfit,
      riskReward,
      reasoning: `MACD histogram ${macd.histogram > 0 ? "positive" : "negative"} (${macd.histogram.toFixed(4)}) with RSI ${rsi.toFixed(1)} confirming ${side === "LONG" ? "bullish" : "bearish"} momentum without being overextended.`,
    };
  }
}
