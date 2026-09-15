/** Simple Moving Average. Returns `null` for indices before `period` values are available. */
export function sma(values: number[], period: number): Array<number | null> {
  const result: Array<number | null> = new Array(values.length).fill(null);
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) result[i] = sum / period;
  }

  return result;
}
