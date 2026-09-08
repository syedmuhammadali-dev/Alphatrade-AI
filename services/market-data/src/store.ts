import type { TickerSnapshot, Candle } from "@alphatrade/shared-types";

const MAX_CANDLES_PER_SYMBOL = 200;

/**
 * In-process "recent market state" store. Deliberately not persisted to
 * Postgres (ticks/candles are ephemeral market state, not application
 * state) and deliberately not the generic packages/shared-config Cache —
 * that's a plain key/value abstraction, while a scanner needs to iterate
 * and sort every symbol at once, so a small typed store fits better here.
 */
export class MarketDataStore {
  private readonly tickers = new Map<string, TickerSnapshot>();
  private readonly candles = new Map<string, Candle[]>();

  upsertTicker(ticker: TickerSnapshot): void {
    this.tickers.set(ticker.symbol, ticker);
  }

  getTicker(symbol: string): TickerSnapshot | undefined {
    return this.tickers.get(symbol.toUpperCase());
  }

  listTickers(): TickerSnapshot[] {
    return Array.from(this.tickers.values());
  }

  appendCandle(candle: Candle): void {
    const key = `${candle.symbol}:${candle.interval}`;
    const existing = this.candles.get(key) ?? [];
    const withoutSameOpenTime = existing.filter((c) => c.openTime !== candle.openTime);
    const updated = [...withoutSameOpenTime, candle].sort((a, b) => a.openTime - b.openTime);
    this.candles.set(key, updated.slice(-MAX_CANDLES_PER_SYMBOL));
  }

  getCandles(symbol: string, interval = "1m"): Candle[] {
    return this.candles.get(`${symbol.toUpperCase()}:${interval}`) ?? [];
  }
}
