/**
 * Exponential Moving Average. Seeds with the SMA of the first `period`
 * values (the standard convention), then applies the EMA recurrence.
 * Returns `null` for indices before `period` values are available.
 */
export function ema(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return result;

  const multiplier = 2 / (period + 1);
  let seedSum = 0;
  for (let i = 0; i < period; i++) seedSum += values[i]!;
  let prevEma = seedSum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < values.length; i++) {
    prevEma = (values[i]! - prevEma) * multiplier + prevEma;
    result[i] = prevEma;
  }

  return result;
}
