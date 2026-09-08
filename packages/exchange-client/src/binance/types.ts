/** Raw Binance WebSocket payload shapes (only the fields we actually consume). */

/**
 * One entry of the `!miniTicker@arr` all-market rolling ticker stream.
 * Used over the full `!ticker@arr` stream deliberately: it carries every
 * field the scanner needs (price, high/low, quote volume) at a fraction of
 * the payload size across ~2000+ symbols, which is both lighter on the wire
 * and friendlier to any intermediary with WS frame-size limits.
 */
export interface RawBinanceMiniTicker {
  e: "24hrMiniTicker";
  E: number;
  s: string; // symbol
  c: string; // close (last) price
  o: string; // open price
  h: string; // high price
  l: string; // low price
  v: string; // base asset volume
  q: string; // quote asset volume
}

export interface RawBinanceKline {
  t: number; // kline open time
  T: number; // kline close time
  s: string; // symbol
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // base asset volume
  x: boolean; // is this kline closed?
}

export interface RawBinanceKlineEvent {
  e: "kline";
  E: number;
  s: string;
  k: RawBinanceKline;
}

/** Envelope used by the combined-stream endpoint (`/stream?streams=...`). */
export interface RawBinanceCombinedMessage<T> {
  stream: string;
  data: T;
}
