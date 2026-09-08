import { EventEmitter } from "node:events";

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export interface ReconnectingSocketEvents {
  open: [];
  message: [unknown];
  close: [];
  error: [Error];
}

/**
 * Thin wrapper around the platform WebSocket with exponential-backoff
 * auto-reconnect. Binance's public streams periodically close idle or
 * stale connections, so reconnect is required for continuous operation.
 */
export class ReconnectingSocket extends EventEmitter<ReconnectingSocketEvents> {
  private socket: WebSocket | undefined;
  private backoffMs = INITIAL_BACKOFF_MS;
  private closedByUser = false;
  private reconnectTimer: NodeJS.Timeout | undefined;

  constructor(private readonly url: string) {
    super();
  }

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }

  private open(): void {
    const socket = new WebSocket(this.url);
    this.socket = socket;

    socket.addEventListener("open", () => {
      this.backoffMs = INITIAL_BACKOFF_MS;
      this.emit("open");
    });

    socket.addEventListener("message", (event: MessageEvent) => {
      try {
        this.emit("message", JSON.parse(event.data as string));
      } catch {
        // Ignore malformed frames rather than crashing the ingest process.
      }
    });

    socket.addEventListener("error", () => {
      this.emit("error", new Error(`WebSocket error on ${this.url}`));
    });

    socket.addEventListener("close", () => {
      this.emit("close");
      if (!this.closedByUser) this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      this.open();
    }, this.backoffMs);
  }
}
