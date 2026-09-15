import {
  AllMarketTickerStream,
  KlineStream,
  normalizeMiniTicker,
  normalizeKline,
  fetchHistoricalKlines,
} from "@alphatrade/exchange-client";
import type { Logger } from "@alphatrade/shared-config";
import type { MarketDataStore } from "./store";

export interface IngestHandle {
  stop: () => void;
}

const CANDLE_HISTORY_LIMIT = 200;

/**
 * Wires the Binance public streams into the store. This is the MARKET_DATA
 * stage of the pipeline: connect -> normalize -> maintain recent state.
 * Only closed klines become CANDLE_CLOSED updates; in-progress candles are
 * ignored to keep the candle history free of partial bars.
 *
 * Watchlist symbols are backfilled with recent 1m history via REST first —
 * otherwise indicators like EMA200 would need ~200 minutes of live streaming
 * before producing a value.
 */
export async function startIngest(
  store: MarketDataStore,
  options: { baseWsUrl: string; restBaseUrl: string; watchlist: string[]; logger: Logger },
): Promise<IngestHandle> {
  const { baseWsUrl, restBaseUrl, watchlist, logger } = options;

  await Promise.all(
    watchlist.map(async (symbol) => {
      try {
        const candles = await fetchHistoricalKlines(restBaseUrl, symbol, "1m", CANDLE_HISTORY_LIMIT);
        for (const candle of candles) store.appendCandle(candle);
        logger.info({ symbol, count: candles.length }, "Backfilled candle history via REST");
      } catch (err) {
        logger.warn({ symbol, err }, "Failed to backfill candle history; will rely on live stream only");
      }
    }),
  );

  const tickerStream = new AllMarketTickerStream(baseWsUrl);
  tickerStream.on("tickers", (rawTickers) => {
    for (const raw of rawTickers) {
      store.upsertTicker(normalizeMiniTicker(raw));
    }
  });
  tickerStream.start();
  logger.info("Connecting to Binance all-market mini-ticker stream (!miniTicker@arr)");

  let klineStream: KlineStream | undefined;
  if (watchlist.length > 0) {
    klineStream = new KlineStream(baseWsUrl, watchlist, "1m");
    klineStream.on("kline", (event) => {
      if (event.k.x) {
        store.appendCandle(normalizeKline(event.k));
      }
    });
    klineStream.start();
    logger.info({ watchlist }, "Connecting to Binance kline streams for watchlist");
  }

  return {
    stop: () => {
      tickerStream.stop();
      klineStream?.stop();
    },
  };
}
