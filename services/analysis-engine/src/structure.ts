import type { Candle, MarketStructure, StructurePattern, StructureBias } from "@alphatrade/shared-types";

interface SwingPoint {
  index: number;
  price: number;
}

/**
 * Fractal swing detection: a bar is a swing high/low if its high/low is the
 * most extreme within `strength` bars on either side. This is the standard,
 * simplest definition of a market-structure pivot.
 */
function findSwingPoints(candles: Candle[], strength: number): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];

  for (let i = strength; i < candles.length - strength; i++) {
    const window = candles.slice(i - strength, i + strength + 1);
    const candle = candles[i]!;

    if (window.every((c) => c.high <= candle.high)) {
      highs.push({ index: i, price: candle.high });
    }
    if (window.every((c) => c.low >= candle.low)) {
      lows.push({ index: i, price: candle.low });
    }
  }

  return { highs, lows };
}

/**
 * Detects HH/HL/LH/LL structure, support/resistance from the most recent
 * swing points, and breakout/breakdown against them.
 */
export function detectStructure(candles: Candle[], strength = 3): MarketStructure {
  const { highs, lows } = findSwingPoints(candles, strength);

  const lastTwoHighs = highs.slice(-2);
  const lastTwoLows = lows.slice(-2);

  let pattern: StructurePattern = "INSUFFICIENT_DATA";
  let bias: StructureBias = "RANGE";

  if (lastTwoHighs.length === 2 && lastTwoLows.length === 2) {
    const higherHigh = lastTwoHighs[1]!.price > lastTwoHighs[0]!.price;
    const higherLow = lastTwoLows[1]!.price > lastTwoLows[0]!.price;

    if (higherHigh && higherLow) {
      pattern = "HH_HL";
      bias = "BULLISH_STRUCTURE";
    } else if (!higherHigh && !higherLow) {
      pattern = "LH_LL";
      bias = "BEARISH_STRUCTURE";
    } else {
      pattern = "MIXED";
      bias = "RANGE";
    }
  }

  const resistance = highs.length > 0 ? highs[highs.length - 1]!.price : null;
  const support = lows.length > 0 ? lows[lows.length - 1]!.price : null;
  const lastClose = candles.length > 0 ? candles[candles.length - 1]!.close : null;

  return {
    pattern,
    bias,
    swingHighs: highs.slice(-3).map((h) => h.price),
    swingLows: lows.slice(-3).map((l) => l.price),
    support,
    resistance,
    breakout: resistance !== null && lastClose !== null && lastClose > resistance,
    breakdown: support !== null && lastClose !== null && lastClose < support,
  };
}
