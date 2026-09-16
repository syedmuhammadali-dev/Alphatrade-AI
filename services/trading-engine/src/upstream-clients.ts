import type { SymbolAnalysisResponse, ScannerResponse } from "@alphatrade/shared-types";

export class UpstreamUnavailableError extends Error {
  constructor(service: string, cause?: unknown) {
    super(`${service} is unavailable.`);
    this.cause = cause;
  }
}

async function fetchJson<T>(url: string, service: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new UpstreamUnavailableError(service, err);
  }
  if (!res.ok) {
    throw new UpstreamUnavailableError(service, `Upstream returned ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchAnalysis(analysisEngineUrl: string, symbol: string): Promise<SymbolAnalysisResponse> {
  return fetchJson(`${analysisEngineUrl}/internal/analysis/${encodeURIComponent(symbol)}`, "analysis-engine");
}

export function fetchScanner(marketDataUrl: string): Promise<ScannerResponse> {
  return fetchJson(`${marketDataUrl}/internal/scanner?limit=500`, "market-data");
}
