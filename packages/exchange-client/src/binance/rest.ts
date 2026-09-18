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

function parseKlineRows(symbol: string, interval: string, rows: RawRestKlineRow[]): Candle[] {
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

async function fetchKlinePage(
  restBaseUrl: string,
  symbol: string,
  interval: string,
  params: { limit?: number; startTime?: number; endTime?: number },
): Promise<Candle[]> {
  const query = new URLSearchParams({ symbol, interval });
  if (params.limit) query.set("limit", String(params.limit));
  if (params.startTime !== undefined) query.set("startTime", String(params.startTime));
  if (params.endTime !== undefined) query.set("endTime", String(params.endTime));

  const res = await fetch(`${restBaseUrl}/api/v3/klines?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Binance klines request failed for ${symbol}: ${res.status}`);
  }
  const rows = (await res.json()) as RawRestKlineRow[];
  return parseKlineRows(symbol, interval, rows);
}

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
  return fetchKlinePage(restBaseUrl, symbol, interval, { limit });
}

const KLINE_PAGE_LIMIT = 1000;
/** Backtests are capped at this many candles to keep a single request bounded and fast. */
export const MAX_BACKTEST_CANDLES = 10_000;

/**
 * Fetches every candle between startTime and endTime (both epoch ms),
 * paginating past Binance's 1000-candles-per-request cap. Used by
 * backtesting, which needs an arbitrary date range rather than "the last N".
 */
export async function fetchKlineRange(
  restBaseUrl: string,
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<Candle[]> {
  const candles: Candle[] = [];
  let cursor = startTime;

  while (cursor < endTime) {
    const page = await fetchKlinePage(restBaseUrl, symbol, interval, {
      limit: KLINE_PAGE_LIMIT,
      startTime: cursor,
      endTime,
    });
    if (page.length === 0) break;

    candles.push(...page);
    if (candles.length > MAX_BACKTEST_CANDLES) {
      throw new Error(
        `Requested range would fetch more than ${MAX_BACKTEST_CANDLES} candles — choose a shorter date range or a larger interval.`,
      );
    }

    const lastCloseTime = page[page.length - 1]!.closeTime;
    if (lastCloseTime <= cursor) break; // safety: avoid an infinite loop if the API ever stalls
    cursor = lastCloseTime + 1;

    if (page.length < KLINE_PAGE_LIMIT) break;
  }

  return candles;
}
