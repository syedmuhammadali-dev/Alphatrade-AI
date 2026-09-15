import type { Candle } from "@alphatrade/shared-types";
import { trueRange } from "./atr";

/**
 * Average Directional Index (Wilder). Measures trend strength (not
 * direction) on a 0-100 scale — conventionally >25 is "trending",
 * <20 is "non-trending"/ranging.
 *
 * Needs roughly `2 * period` candles before the first non-null value: one
 * `period` window to seed the smoothed +DM/-DM/TR, and another `period`
 * window of DX values to average into the first ADX reading.
 */
export function adx(candles: Candle[], period = 14): Array<number | null> {
  const result: Array<number | null> = new Array(candles.length).fill(null);
  if (candles.length <= period * 2) return result;

  const tr = trueRange(candles);
  const plusDM: number[] = new Array(candles.length).fill(0);
  const minusDM: number[] = new Array(candles.length).fill(0);

  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i]!.high - candles[i - 1]!.high;
    const downMove = candles[i - 1]!.low - candles[i]!.low;
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;
  for (let i = 1; i <= period; i++) {
    smoothedTR += tr[i]!;
    smoothedPlusDM += plusDM[i]!;
    smoothedMinusDM += minusDM[i]!;
  }

  const dx: Array<number | null> = new Array(candles.length).fill(null);
  dx[period] = computeDx(smoothedPlusDM, smoothedMinusDM, smoothedTR);

  for (let i = period + 1; i < candles.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + tr[i]!;
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i]!;
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i]!;
    dx[i] = computeDx(smoothedPlusDM, smoothedMinusDM, smoothedTR);
  }

  const firstAdxIndex = period * 2 - 1;
  let dxSum = 0;
  for (let i = period; i <= firstAdxIndex; i++) dxSum += dx[i] ?? 0;
  let prevAdx = dxSum / period;
  result[firstAdxIndex] = prevAdx;

  for (let i = firstAdxIndex + 1; i < candles.length; i++) {
    prevAdx = (prevAdx * (period - 1) + (dx[i] ?? 0)) / period;
    result[i] = prevAdx;
  }

  return result;
}

function computeDx(plusDMSum: number, minusDMSum: number, trSum: number): number {
  if (trSum === 0) return 0;
  const plusDI = (100 * plusDMSum) / trSum;
  const minusDI = (100 * minusDMSum) / trSum;
  const diSum = plusDI + minusDI;
  return diSum === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / diSum;
}
