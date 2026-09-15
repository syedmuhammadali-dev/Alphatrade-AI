import { loadEnv } from "@alphatrade/shared-config";
import type { SymbolAnalysisResponse } from "@alphatrade/shared-types";

export class AnalysisEngineUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Analysis engine is unavailable.");
    this.cause = cause;
  }
}

export async function getSymbolAnalysis(symbol: string): Promise<SymbolAnalysisResponse> {
  const env = loadEnv();
  let res: Response;
  try {
    res = await fetch(`${env.ANALYSIS_ENGINE_URL}/internal/analysis/${encodeURIComponent(symbol)}`);
  } catch (err) {
    throw new AnalysisEngineUnavailableError(err);
  }
  if (!res.ok) {
    throw new AnalysisEngineUnavailableError(`Upstream returned ${res.status}`);
  }
  return (await res.json()) as SymbolAnalysisResponse;
}
