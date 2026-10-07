import { createHmac } from "node:crypto";

/** Binance's default public testnet — no real funds, used unless a connection explicitly opts into mainnet. */
export const BINANCE_TESTNET_REST_BASE_URL = "https://testnet.binance.vision";

export class ExchangeApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
  }
}

function sign(apiSecret: string, query: string): string {
  return createHmac("sha256", apiSecret).update(query).digest("hex");
}

async function signedRequest<T>(
  baseUrl: string,
  apiKey: string,
  apiSecret: string,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const query = new URLSearchParams({ ...params, timestamp: String(Date.now()), recvWindow: "5000" });
  query.set("signature", sign(apiSecret, query.toString()));

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}?${query.toString()}`, {
      method,
      headers: { "X-MBX-APIKEY": apiKey },
    });
  } catch (err) {
    throw new ExchangeApiError(err instanceof Error ? err.message : "Network error contacting the exchange.");
  }

  const body = (await res.json().catch(() => ({}))) as { msg?: string; code?: number };
  if (!res.ok) {
    throw new ExchangeApiError(body.msg ?? `Exchange returned ${res.status}`, body.code);
  }
  return body as T;
}

export interface AccountBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface AccountInfo {
  canTrade: boolean;
  canWithdraw: boolean;
  balances: AccountBalance[];
}

/** Used to verify a connection is live and has trading permission, without placing any order. */
export async function getAccountInfo(baseUrl: string, apiKey: string, apiSecret: string): Promise<AccountInfo> {
  return signedRequest<AccountInfo>(baseUrl, apiKey, apiSecret, "GET", "/api/v3/account", {});
}

export interface MarketOrderResult {
  symbol: string;
  orderId: number;
  clientOrderId: string;
  status: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  fills: Array<{ price: string; qty: string; commission: string; commissionAsset: string }>;
}

/**
 * Places a MARKET order. `clientOrderId` is the idempotency key — Binance
 * rejects a duplicate within its retention window, so a caller can safely
 * retry a request that timed out without risking a double-fill.
 */
export async function placeMarketOrder(
  baseUrl: string,
  apiKey: string,
  apiSecret: string,
  params: { symbol: string; side: "BUY" | "SELL"; quantity: number; clientOrderId: string },
): Promise<MarketOrderResult> {
  return signedRequest<MarketOrderResult>(baseUrl, apiKey, apiSecret, "POST", "/api/v3/order", {
    symbol: params.symbol,
    side: params.side,
    type: "MARKET",
    quantity: String(params.quantity),
    newClientOrderId: params.clientOrderId,
  });
}
