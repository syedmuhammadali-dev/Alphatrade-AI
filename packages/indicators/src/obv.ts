import type { Candle } from "@alphatrade/shared-types";

/** On-Balance Volume: cumulative volume, added on up-closes and subtracted on down-closes. */
export function obv(candles: Candle[]): number[] {
  const result: number[] = new Array(candles.length);
  let cumulative = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i > 0) {
      const prevClose = candles[i - 1]!.close;
      const close = candles[i]!.close;
      if (close > prevClose) cumulative += candles[i]!.volume;
      else if (close < prevClose) cumulative -= candles[i]!.volume;
    }
    result[i] = cumulative;
  }

  return result;
}
