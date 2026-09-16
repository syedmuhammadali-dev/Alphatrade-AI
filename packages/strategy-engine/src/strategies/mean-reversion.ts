import type { StrategySignal, MarketRegime } from "@alphatrade/shared-types";
import type { StrategyContext, TradingStrategy } from "../types";
import { noTradeSignal } from "../types";
import { computeRiskReward, clampConfidence } from "../utils";

const RSI_OVERSOLD = 30;
const RSI_OVERBOUGHT = 70;
const ATR_STOP_MULTIPLIER = 1;

/** Fades extremes back toward the mean (Bollinger middle band) — only in non-trending markets. */
export class MeanReversionStrategy implements TradingStrategy {
  name = "MeanReversionStrategy";
  description = "Fades RSI extremes at the Bollinger bands back toward the mean — only in non-trending markets.";

  getRequiredMarketConditions(): MarketRegime[] {
    return ["RANGING", "LOW_VOLATILITY"];
  }

  analyze(context: StrategyContext): StrategySignal {
    const { analysis } = context;
    const { rsi, bollinger, atr, lastPrice } = analysis;

    if (rsi === null || bollinger.middle === null || bollinger.lower === null || bollinger.upper === null || atr === null) {
      return noTradeSignal(this.name, "Not enough RSI/Bollinger history yet to assess mean reversion.");
    }

    const oversoldAtLowerBand = rsi < RSI_OVERSOLD && lastPrice <= bollinger.lower;
    const overboughtAtUpperBand = rsi > RSI_OVERBOUGHT && lastPrice >= bollinger.upper;

    if (!oversoldAtLowerBand && !overboughtAtUpperBand) {
      return noTradeSignal(this.name, "Price is not at a Bollinger extreme with a confirming RSI reading.");
    }

    const side = oversoldAtLowerBand ? "LONG" : "SHORT";
    const entry = lastPrice;
    const stopLoss = side === "LONG" ? entry - atr * ATR_STOP_MULTIPLIER : entry + atr * ATR_STOP_MULTIPLIER;
    const takeProfit = bollinger.middle;
    const riskReward = computeRiskReward(entry, stopLoss, takeProfit, side);

    if (riskReward === null) {
      return noTradeSignal(this.name, "Reversion target offers no positive risk/reward from here.");
    }

    const extremeRsi = side === "LONG" ? RSI_OVERSOLD - rsi : rsi - RSI_OVERBOUGHT;
    const confidence = 50 + extremeRsi * 2;

    return {
      strategyName: this.name,
      action: side,
      confidence: clampConfidence(confidence),
      entryZone: [entry, entry],
      stopLoss,
      takeProfit,
      riskReward,
      reasoning: `RSI ${rsi.toFixed(1)} ${side === "LONG" ? "oversold" : "overbought"} at the Bollinger ${side === "LONG" ? "lower" : "upper"} band — targeting reversion to the middle band.`,
    };
  }
}
