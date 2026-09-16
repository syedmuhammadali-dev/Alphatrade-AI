import type { TradeProposal, RiskConfig, AccountState } from "@alphatrade/shared-types";
import type { PositionSize } from "@alphatrade/shared-types";

export interface RuleCheck {
  rule: string;
  pass: boolean;
  reason: string;
}

/**
 * The configurable, deterministic rule set. Every rule is evaluated (not
 * short-circuited) so a REJECTED decision always reports every reason, not
 * just the first failure.
 */
export function evaluateRules(
  proposal: TradeProposal,
  config: RiskConfig,
  accountState: AccountState,
  positionSize: PositionSize | null,
): RuleCheck[] {
  return [
    {
      rule: "minimumConfidence",
      pass: proposal.confidence >= config.minimumConfidence,
      reason: `Confidence ${proposal.confidence}% ${proposal.confidence >= config.minimumConfidence ? "meets" : "is below"} the minimum of ${config.minimumConfidence}%.`,
    },
    {
      rule: "minimumRiskReward",
      pass: proposal.riskReward >= config.minimumRiskReward,
      reason: `Risk:reward ${proposal.riskReward.toFixed(2)}:1 ${proposal.riskReward >= config.minimumRiskReward ? "meets" : "is below"} the minimum of ${config.minimumRiskReward}:1.`,
    },
    {
      rule: "maxOpenPositions",
      pass: accountState.openPositionsCount < config.maxOpenPositions,
      reason: `${accountState.openPositionsCount} of ${config.maxOpenPositions} max concurrent positions are open.`,
    },
    {
      rule: "maxDailyLoss",
      pass: accountState.dailyPnlPercent > -config.maxDailyLossPercent,
      reason: `Today's P&L is ${accountState.dailyPnlPercent.toFixed(2)}%, ${accountState.dailyPnlPercent > -config.maxDailyLossPercent ? "within" : "at or beyond"} the ${config.maxDailyLossPercent}% daily loss cap.`,
    },
    {
      rule: "maxLosingStreak",
      pass: accountState.currentLosingStreak < config.maxLosingStreak,
      reason: `Current losing streak is ${accountState.currentLosingStreak}, ${accountState.currentLosingStreak < config.maxLosingStreak ? "within" : "at or beyond"} the max of ${config.maxLosingStreak}.`,
    },
    {
      rule: "maxPortfolioExposure",
      pass:
        positionSize !== null &&
        accountState.currentExposurePercent +
          (positionSize.notionalValueUsd / config.accountBalanceUsd) * 100 <=
          config.maxPortfolioExposurePercent,
      reason:
        positionSize === null
          ? "Could not size the position (degenerate stop distance)."
          : `This position would bring total exposure to ${(
              accountState.currentExposurePercent + (positionSize.notionalValueUsd / config.accountBalanceUsd) * 100
            ).toFixed(1)}%, against a ${config.maxPortfolioExposurePercent}% cap.`,
    },
  ];
}
