import { ema } from "./ema";

export interface MacdResult {
  macd: Array<number | null>;
  signal: Array<number | null>;
  histogram: Array<number | null>;
}

/** MACD line = fastEMA - slowEMA; signal = EMA(macd, signalPeriod); histogram = macd - signal. */
export function macd(closes: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdResult {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const macdLine: Array<number | null> = closes.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f != null && s != null ? f - s : null;
  });

  const firstValidIndex = macdLine.findIndex((v) => v !== null);
  const signalLine: Array<number | null> = new Array(closes.length).fill(null);
  const histogram: Array<number | null> = new Array(closes.length).fill(null);

  if (firstValidIndex !== -1) {
    const macdValues = macdLine.slice(firstValidIndex).map((v) => v as number);
    const signalOnValid = ema(macdValues, signalPeriod);
    for (let i = 0; i < signalOnValid.length; i++) {
      const value = signalOnValid[i] ?? null;
      signalLine[firstValidIndex + i] = value;
      if (value != null) {
        histogram[firstValidIndex + i] = (macdLine[firstValidIndex + i] as number) - value;
      }
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}
