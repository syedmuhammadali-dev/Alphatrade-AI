import { AllMarketTickerStream, KlineStream, normalizeMiniTicker, normalizeKline } from "@alphatrade/exchange-client";
import type { Logger } from "@alphatrade/shared-config";
import type { MarketDataStore } from "./store";

export interface IngestHandle {
  stop: () => void;
}

/**
 * Wires the Binance public streams into the store. This is the MARKET_DATA
 * stage of the pipeline: connect -> normalize -> maintain recent state.
 * Only closed klines become CANDLE_CLOSED updates; in-progress candles are
 * ignored to keep the candle history free of partial bars.
 */
export function startIngest(
  store: MarketDataStore,
  options: { baseWsUrl: string; watchlist: string[]; logger: Logger },
): IngestHandle {
  const { baseWsUrl, watchlist, logger } = options;

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
