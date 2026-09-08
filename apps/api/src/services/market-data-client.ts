import { loadEnv } from "@alphatrade/shared-config";
import type { ScannerResponse, SymbolDetailResponse } from "@alphatrade/shared-types";

export class MarketDataUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Market data service is unavailable.");
    this.cause = cause;
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const env = loadEnv();
  let res: Response;
  try {
    res = await fetch(`${env.MARKET_DATA_URL}${path}`);
  } catch (err) {
    throw new MarketDataUnavailableError(err);
  }
  if (!res.ok) {
    throw new MarketDataUnavailableError(`Upstream returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export function getScanner(params: { limit?: number; quote?: string }): Promise<ScannerResponse> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.quote) query.set("quote", params.quote);
  const qs = query.toString();
  return fetchJson<ScannerResponse>(`/internal/scanner${qs ? `?${qs}` : ""}`);
}

export function getSymbolDetail(symbol: string): Promise<SymbolDetailResponse> {
  return fetchJson<SymbolDetailResponse>(`/internal/symbol/${encodeURIComponent(symbol)}`);
}
