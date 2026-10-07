import { loadEnv } from "@alphatrade/shared-config";
import type { AccountInfo, MarketOrderResult } from "@alphatrade/exchange-client";

export class ExecutionEngineUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Execution engine is unavailable.");
    this.cause = cause;
  }
}

/** The exchange itself rejected the request (insufficient balance, invalid symbol, permissions, etc). */
export class ExchangeRejectedError extends Error {}

interface Connection {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const env = loadEnv();
  let res: Response;
  try {
    res = await fetch(`${env.EXECUTION_ENGINE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new ExecutionEngineUnavailableError(err);
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 502) {
      throw new ExchangeRejectedError(errBody.error ?? "The exchange rejected the request.");
    }
    throw new ExecutionEngineUnavailableError(errBody.error ?? `Upstream returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function verifyConnection(connection: Connection): Promise<AccountInfo> {
  return post<AccountInfo>("/internal/account", connection);
}

export async function placeLiveMarketOrder(
  connection: Connection,
  order: { symbol: string; side: "BUY" | "SELL"; quantity: number; clientOrderId: string },
): Promise<MarketOrderResult> {
  return post<MarketOrderResult>("/internal/orders", { ...connection, ...order });
}
