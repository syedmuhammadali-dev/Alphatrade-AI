import { sma } from "./sma";

export interface BollingerBand {
  upper: number | null;
  middle: number | null;
  lower: number | null;
}

export function bollingerBands(closes: number[], period = 20, stdDevMultiplier = 2): BollingerBand[] {
  const middle = sma(closes, period);

  return closes.map((_, i) => {
    const m = middle[i];
    if (m == null) return { upper: null, middle: null, lower: null };

    const window = closes.slice(i - period + 1, i + 1);
    const variance = window.reduce((sum, v) => sum + (v - m) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: m + stdDevMultiplier * stdDev,
      middle: m,
      lower: m - stdDevMultiplier * stdDev,
    };
  });
}
