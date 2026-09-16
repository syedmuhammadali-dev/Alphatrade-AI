import { loadEnv } from "@alphatrade/shared-config";
import type { DecisionResponse, OpportunitiesResponse } from "@alphatrade/shared-types";

export class TradingEngineUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Trading engine is unavailable.");
    this.cause = cause;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new TradingEngineUnavailableError(err);
  }
  if (!res.ok) {
    throw new TradingEngineUnavailableError(`Upstream returned ${res.status}`);
  }
  return (await res.json()) as T;
}

function strategiesParam(enabledStrategies: string[]): string {
  return `enabledStrategies=${encodeURIComponent(enabledStrategies.join(","))}`;
}

export function getDecision(symbol: string, enabledStrategies: string[]): Promise<DecisionResponse> {
  const env = loadEnv();
  return fetchJson(
    `${env.TRADING_ENGINE_URL}/internal/decision/${encodeURIComponent(symbol)}?${strategiesParam(enabledStrategies)}`,
  );
}

export function getOpportunities(symbols: string[], enabledStrategies: string[]): Promise<OpportunitiesResponse> {
  const env = loadEnv();
  const symbolsParam = `symbols=${encodeURIComponent(symbols.join(","))}`;
  return fetchJson(`${env.TRADING_ENGINE_URL}/internal/opportunities?${symbolsParam}&${strategiesParam(enabledStrategies)}`);
}
