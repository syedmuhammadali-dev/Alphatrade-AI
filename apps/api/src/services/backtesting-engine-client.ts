import { loadEnv } from "@alphatrade/shared-config";
import type { BacktestRequest, BacktestResult } from "@alphatrade/shared-types";

export class BacktestingEngineUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Backtesting engine is unavailable.");
    this.cause = cause;
  }
}

/** Thrown for a well-formed-but-invalid request the engine itself rejected (bad date range, unknown symbol, too many candles). */
export class BacktestRunError extends Error {}

export async function runBacktest(request: BacktestRequest): Promise<BacktestResult> {
  const env = loadEnv();
  let res: Response;
  try {
    res = await fetch(`${env.BACKTESTING_ENGINE_URL}/internal/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch (err) {
    throw new BacktestingEngineUnavailableError(err);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new BacktestRunError(body.error ?? `Upstream returned ${res.status}`);
  }

  return (await res.json()) as BacktestResult;
}
