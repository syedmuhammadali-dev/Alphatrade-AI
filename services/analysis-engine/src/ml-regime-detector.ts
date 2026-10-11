import type { Candle, MarketRegime } from "@alphatrade/shared-types";
import type { RegimeDetector, RegimeInput } from "@alphatrade/market-analysis";

/** Below this confidence, the prediction is too weak to act on — UNCERTAIN, not a fabricated guess. */
const CONFIDENCE_FLOOR = 0.5;

interface PredictResponse {
  predicted: "BULLISH" | "BEARISH" | "NEUTRAL";
  probabilities: Record<string, number>;
}

function toCandlePayload(candles: Candle[]) {
  return candles.map((c) => ({ open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume }));
}

/**
 * The ML-based swap-in for RegimeDetector (Phase 11), calling out to
 * services/ml-service's 3-class (bullish/bearish/neutral) classifier. It
 * can only ever produce TRENDING_BULLISH/BEARISH, RANGING, or UNCERTAIN —
 * the model has no notion of HIGH/LOW_VOLATILITY, so those two regime
 * values are never returned in "ml" mode. That's a stated scope limit, not
 * a bug: volatility-regime strategies simply won't fire under this mode.
 * Any failure (service down, model not trained, not enough candles) fails
 * open to UNCERTAIN rather than throwing — a bad regime guess is worse
 * than an honest "don't know".
 */
export class MlRegimeDetector implements RegimeDetector {
  constructor(private readonly mlServiceUrl: string) {}

  async detect({ candles }: RegimeInput): Promise<MarketRegime> {
    try {
      const res = await fetch(`${this.mlServiceUrl}/predict`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candles: toCandlePayload(candles) }),
      });
      if (!res.ok) return "UNCERTAIN";

      const body = (await res.json()) as PredictResponse;
      const confidence = body.probabilities[body.predicted] ?? 0;
      if (confidence < CONFIDENCE_FLOOR) return "UNCERTAIN";

      if (body.predicted === "BULLISH") return "TRENDING_BULLISH";
      if (body.predicted === "BEARISH") return "TRENDING_BEARISH";
      return "RANGING";
    } catch {
      return "UNCERTAIN";
    }
  }
}
