import { EventEmitter } from "node:events";
import { ReconnectingSocket } from "./reconnecting-socket";
import type { RawBinanceMiniTicker, RawBinanceKlineEvent, RawBinanceCombinedMessage } from "./types";

export interface AllMarketTickerStreamEvents {
  tickers: [RawBinanceMiniTicker[]];
}

/**
 * Subscribes to Binance's `!miniTicker@arr` stream: one message per second
 * containing a fresh rolling snapshot for every symbol on the exchange.
 * This single stream is what powers the market scanner (no per-symbol
 * subscriptions needed to cover hundreds of pairs).
 */
export class AllMarketTickerStream extends EventEmitter<AllMarketTickerStreamEvents> {
  private readonly socket: ReconnectingSocket;

  constructor(baseWsUrl: string) {
    super();
    this.socket = new ReconnectingSocket(`${baseWsUrl}/ws/!miniTicker@arr`);
    this.socket.on("message", (data) => {
      if (Array.isArray(data)) {
        this.emit("tickers", data as RawBinanceMiniTicker[]);
      }
    });
  }

  start(): void {
    this.socket.connect();
  }

  stop(): void {
    this.socket.close();
  }
}

export interface KlineStreamEvents {
  kline: [RawBinanceKlineEvent];
}

/**
 * Subscribes to 1m kline streams for a configured watchlist of symbols via
 * Binance's combined-stream endpoint. Emits every update (including
 * in-progress candles); consumers should check `k.x` for candle close.
 */
export class KlineStream extends EventEmitter<KlineStreamEvents> {
  private readonly socket: ReconnectingSocket;

  constructor(baseWsUrl: string, symbols: string[], interval = "1m") {
    super();
    const streams = symbols.map((s) => `${s.toLowerCase()}@kline_${interval}`).join("/");
    this.socket = new ReconnectingSocket(`${baseWsUrl}/stream?streams=${streams}`);
    this.socket.on("message", (data) => {
      const message = data as RawBinanceCombinedMessage<RawBinanceKlineEvent>;
      if (message?.data?.e === "kline") {
        this.emit("kline", message.data);
      }
    });
  }

  start(): void {
    this.socket.connect();
  }

  stop(): void {
    this.socket.close();
  }
}
