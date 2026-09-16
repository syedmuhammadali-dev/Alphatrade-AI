import type { StrategySignal, MarketRegime } from "@alphatrade/shared-types";
import type { StrategyContext, TradingStrategy } from "../types";
import { noTradeSignal } from "../types";
import { computeRiskReward, clampConfidence } from "../utils";

const MIN_VOLUME_CONFIRMATION = 1.2;
const TARGET_RISK_REWARD = 2;

/** Trades a confirmed break of recent support/resistance, requiring above-average volume as confirmation. */
export class BreakoutStrategy implements TradingStrategy {
  name = "BreakoutStrategy";
  description = "Trades a confirmed break of recent support/resistance, requiring above-average volume as confirmation.";

  getRequiredMarketConditions(): MarketRegime[] {
    return ["TRENDING_BULLISH", "TRENDING_BEARISH", "HIGH_VOLATILITY"];
  }

  analyze(context: StrategyContext): StrategySignal {
    const { analysis, structure } = context;
    const { atr, lastPrice, volumeRatio } = analysis;

    if (atr === null) {
      return noTradeSignal(this.name, "Not enough ATR history yet to size a breakout trade.");
    }

    const hasVolumeConfirmation = volumeRatio !== null && volumeRatio >= MIN_VOLUME_CONFIRMATION;

    if (structure.breakout && structure.resistance !== null) {
      if (!hasVolumeConfirmation) {
        return noTradeSignal(this.name, "Price broke resistance but volume did not confirm the move.");
      }
      return this.buildSignal("LONG", lastPrice, structure.resistance, atr, volumeRatio!);
    }

    if (structure.breakdown && structure.support !== null) {
      if (!hasVolumeConfirmation) {
        return noTradeSignal(this.name, "Price broke support but volume did not confirm the move.");
      }
      return this.buildSignal("SHORT", lastPrice, structure.support, atr, volumeRatio!);
    }

    return noTradeSignal(this.name, "No confirmed breakout or breakdown against recent structure.");
  }

  private buildSignal(
    side: "LONG" | "SHORT",
    entry: number,
    brokenLevel: number,
    atr: number,
    volumeRatio: number,
  ): StrategySignal {
    // The broken level becomes the new stop reference (former resistance -> support, or vice versa).
    const stopLoss = side === "LONG" ? Math.min(brokenLevel, entry - atr) : Math.max(brokenLevel, entry + atr);
    const risk = Math.abs(entry - stopLoss);
    const takeProfit = side === "LONG" ? entry + risk * TARGET_RISK_REWARD : entry - risk * TARGET_RISK_REWARD;
    const riskReward = computeRiskReward(entry, stopLoss, takeProfit, side);

    if (riskReward === null) {
      return noTradeSignal(this.name, "Computed risk/reward was invalid.");
    }

    return {
      strategyName: this.name,
      action: side,
      confidence: clampConfidence(50 + (volumeRatio - MIN_VOLUME_CONFIRMATION) * 20),
      entryZone: [entry, entry],
      stopLoss,
      takeProfit,
      riskReward,
      reasoning: `Confirmed ${side === "LONG" ? "breakout above resistance" : "breakdown below support"} at ${brokenLevel.toFixed(4)} with ${volumeRatio.toFixed(2)}x average volume.`,
    };
  }
}
