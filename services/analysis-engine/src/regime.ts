import type { Candle, MarketRegime } from "@alphatrade/shared-types";
import { adx, atr, ema, last } from "@alphatrade/indicators";

export interface RegimeInput {
  candles: Candle[];
}

/** Swappable so a later phase can plug in an ML-based detector behind the same contract. */
export interface RegimeDetector {
  detect(input: RegimeInput): MarketRegime;
}

const ADX_TRENDING_THRESHOLD = 25;
const ADX_RANGING_THRESHOLD = 20;
const VOLATILITY_LOOKBACK = 50;

/**
 * Deterministic regime classifier:
 * - ADX above the trending threshold => TRENDING_BULLISH/BEARISH (direction
 *   from EMA20 vs EMA50).
 * - ADX below the ranging threshold => compare current ATR against its own
 *   recent history to flag HIGH/LOW_VOLATILITY, otherwise RANGING.
 * - Otherwise (ADX in the 20-25 gray zone, or not enough data yet) => UNCERTAIN.
 */
export class DeterministicRegimeDetector implements RegimeDetector {
  detect({ candles }: RegimeInput): MarketRegime {
    const closes = candles.map((c) => c.close);
    const adxValue = last(adx(candles, 14));
    const ema20Value = last(ema(closes, 20));
    const ema50Value = last(ema(closes, 50));

    if (adxValue != null) {
      if (adxValue > ADX_TRENDING_THRESHOLD) {
        if (ema20Value != null && ema50Value != null) {
          return ema20Value >= ema50Value ? "TRENDING_BULLISH" : "TRENDING_BEARISH";
        }
        return "UNCERTAIN";
      }

      if (adxValue < ADX_RANGING_THRESHOLD) {
        return this.classifyVolatility(candles);
      }
    }

    return "UNCERTAIN";
  }

  private classifyVolatility(candles: Candle[]): MarketRegime {
    const atrSeries = atr(candles, 14).filter((v): v is number => v !== null);
    if (atrSeries.length < 2) return "UNCERTAIN";

    const recent = atrSeries.slice(-VOLATILITY_LOOKBACK);
    const current = recent[recent.length - 1]!;
    const mean = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    if (mean === 0) return "RANGING";

    const ratio = current / mean;
    if (ratio >= 1.5) return "HIGH_VOLATILITY";
    if (ratio <= 0.6) return "LOW_VOLATILITY";
    return "RANGING";
  }
}
