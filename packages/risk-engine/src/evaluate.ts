import type { TradeProposal, RiskConfig, AccountState, RiskCheckResult } from "@alphatrade/shared-types";
import { DEFAULT_RISK_CONFIG, DEFAULT_ACCOUNT_STATE } from "@alphatrade/shared-types";
import { computePositionSize } from "./position-sizing";
import { evaluateRules } from "./rules";

/**
 * The Independent Risk Engine's entry point. Deliberately isolated from the
 * strategy/AI decision layer — it only ever sees a plain TradeProposal, not
 * exchange clients or strategy internals, and never executes anything
 * itself. Every configured rule is checked; APPROVED requires all of them
 * to pass.
 */
export function evaluateProposal(
  proposal: TradeProposal,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  accountState: AccountState = DEFAULT_ACCOUNT_STATE,
): RiskCheckResult {
  const positionSize = computePositionSize(proposal.entryPrice, proposal.stopLoss, config);
  const checks = evaluateRules(proposal, config, accountState, positionSize);
  const failed = checks.filter((c) => !c.pass);

  return {
    decision: failed.length === 0 ? "APPROVED" : "REJECTED",
    reasons: checks.map((c) => c.reason),
    positionSize,
  };
}
