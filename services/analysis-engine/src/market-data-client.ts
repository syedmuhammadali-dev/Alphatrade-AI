import type { SymbolDetailResponse } from "@alphatrade/shared-types";

export class MarketDataUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Market data service is unavailable.");
    this.cause = cause;
  }
}

export async function fetchCandles(marketDataUrl: string, symbol: string) {
  let res: Response;
  try {
    res = await fetch(`${marketDataUrl}/internal/symbol/${encodeURIComponent(symbol)}`);
  } catch (err) {
    throw new MarketDataUnavailableError(err);
  }
  if (!res.ok) {
    throw new MarketDataUnavailableError(`Upstream returned ${res.status}`);
  }
  const body = (await res.json()) as SymbolDetailResponse;
  return body.candles;
}
