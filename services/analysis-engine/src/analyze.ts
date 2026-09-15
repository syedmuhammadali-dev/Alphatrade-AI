import type { Candle } from "@alphatrade/shared-types";
import type { AnalysisResult, Trend } from "@alphatrade/shared-types";
import { rsi, macd, ema, atr, vwap, adx, sma, last } from "@alphatrade/indicators";

const VOLUME_BASELINE_PERIOD = 20;

/** Computes the normalized technical analysis object for one symbol's candle history. */
export function analyze(symbol: string, timeframe: string, candles: Candle[]): AnalysisResult {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  const rsiValue = last(rsi(closes, 14)) ?? null;
  const macdResult = macd(closes, 12, 26, 9);
  const ema20 = last(ema(closes, 20)) ?? null;
  const ema50 = last(ema(closes, 50)) ?? null;
  const ema200 = last(ema(closes, 200)) ?? null;
  const atrValue = last(atr(candles, 14)) ?? null;
  const vwapValue = candles.length > 0 ? (last(vwap(candles)) ?? null) : null;
  const adxValue = last(adx(candles, 14)) ?? null;

  const volumeBaseline = last(sma(volumes, VOLUME_BASELINE_PERIOD)) ?? null;
  const currentVolume = last(volumes) ?? null;
  const volumeRatio =
    volumeBaseline && volumeBaseline > 0 && currentVolume !== null ? currentVolume / volumeBaseline : null;

  return {
    symbol,
    timeframe,
    rsi: rsiValue,
    macd: {
      value: last(macdResult.macd) ?? null,
      signal: last(macdResult.signal) ?? null,
      histogram: last(macdResult.histogram) ?? null,
    },
    ema20,
    ema50,
    ema200,
    atr: atrValue,
    vwap: vwapValue,
    adx: adxValue,
    volumeRatio,
    trend: deriveTrend(closes, ema20, ema50),
    candleCount: candles.length,
  };
}

/** Simple directional label from price vs its short/medium EMAs — distinct from the fuller MarketRegime classification. */
function deriveTrend(closes: number[], ema20: number | null, ema50: number | null): Trend {
  const price = last(closes);
  if (price === undefined || ema20 === null || ema50 === null) return "neutral";
  if (price > ema20 && ema20 > ema50) return "bullish";
  if (price < ema20 && ema20 < ema50) return "bearish";
  return "neutral";
}
