import type { Candle } from "@alphatrade/shared-types";

export function trueRange(candles: Candle[]): number[] {
  return candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prevClose = candles[i - 1]!.close;
    return Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose));
  });
}

/** Average True Range using Wilder's smoothing. Returns `null` until `period` candles are available. */
export function atr(candles: Candle[], period = 14): Array<number | null> {
  const result: Array<number | null> = new Array(candles.length).fill(null);
  if (candles.length <= period) return result;

  const tr = trueRange(candles);

  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i]!;
  let prevAtr = sum / period;
  result[period] = prevAtr;

  for (let i = period + 1; i < candles.length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]!) / period;
    result[i] = prevAtr;
  }

  return result;
}
