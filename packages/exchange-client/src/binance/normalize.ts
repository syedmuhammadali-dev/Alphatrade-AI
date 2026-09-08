import type { TickerSnapshot, Candle } from "@alphatrade/shared-types";
import type { RawBinanceMiniTicker, RawBinanceKline } from "./types";

export function normalizeMiniTicker(raw: RawBinanceMiniTicker, now: Date = new Date()): TickerSnapshot {
  const open = Number(raw.o);
  const last = Number(raw.c);
  const priceChangePercent = open === 0 ? 0 : ((last - open) / open) * 100;

  return {
    symbol: raw.s,
    lastPrice: last,
    priceChangePercent,
    highPrice: Number(raw.h),
    lowPrice: Number(raw.l),
    quoteVolume: Number(raw.q),
    updatedAt: now.toISOString(),
  };
}

export function normalizeKline(raw: RawBinanceKline): Candle {
  return {
    symbol: raw.s,
    interval: raw.i,
    openTime: raw.t,
    closeTime: raw.T,
    open: Number(raw.o),
    high: Number(raw.h),
    low: Number(raw.l),
    close: Number(raw.c),
    volume: Number(raw.v),
  };
}
