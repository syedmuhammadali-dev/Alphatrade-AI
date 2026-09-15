import type { Candle } from "@alphatrade/shared-types";

/**
 * Volume-Weighted Average Price, cumulative across the provided candle
 * series (typical price = (high+low+close)/3). A real trading session VWAP
 * resets at a session boundary; we don't track sessions yet, so this is a
 * rolling VWAP over whatever candle history is available.
 */
export function vwap(candles: Candle[]): number[] {
  const result: number[] = new Array(candles.length);
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!;
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativePV += typicalPrice * c.volume;
    cumulativeVolume += c.volume;
    result[i] = cumulativeVolume === 0 ? typicalPrice : cumulativePV / cumulativeVolume;
  }

  return result;
}
