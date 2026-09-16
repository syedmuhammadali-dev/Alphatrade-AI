import { loadEnv } from "@alphatrade/shared-config";
import type { TradeProposal, RiskConfig, AccountState, RiskCheckResult } from "@alphatrade/shared-types";

export class RiskEngineUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Risk engine is unavailable.");
    this.cause = cause;
  }
}

/**
 * accountState defaults to an empty portfolio (no open positions, no
 * losses) since paper/live trading (Phase 6/9) don't exist yet to supply a
 * real one — the risk engine itself never fetches this; the caller always
 * provides it.
 */
export async function checkProposal(
  proposal: TradeProposal,
  config: RiskConfig,
  accountState: Partial<AccountState> = {},
): Promise<RiskCheckResult> {
  const env = loadEnv();
  let res: Response;
  try {
    res = await fetch(`${env.RISK_ENGINE_URL}/internal/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proposal, config, accountState }),
    });
  } catch (err) {
    throw new RiskEngineUnavailableError(err);
  }
  if (!res.ok) {
    throw new RiskEngineUnavailableError(`Upstream returned ${res.status}`);
  }
  return (await res.json()) as RiskCheckResult;
}
