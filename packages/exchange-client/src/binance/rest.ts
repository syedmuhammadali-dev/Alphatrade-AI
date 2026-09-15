import type { Candle } from "@alphatrade/shared-types";

/**
 * Raw REST kline row shape:
 * [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
 */
type RawRestKlineRow = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

/**
 * Fetches recent historical candles via Binance's REST klines endpoint so a
 * freshly started service doesn't have to wait for `limit` minutes of live
 * WS updates to accumulate before indicators become meaningful.
 */
export async function fetchHistoricalKlines(
  restBaseUrl: string,
  symbol: string,
  interval: string,
  limit: number,
): Promise<Candle[]> {
  const url = `${restBaseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Binance klines request failed for ${symbol}: ${res.status}`);
  }
  const rows = (await res.json()) as RawRestKlineRow[];

  return rows.map((row) => ({
    symbol,
    interval,
    openTime: row[0],
    closeTime: row[6],
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}
