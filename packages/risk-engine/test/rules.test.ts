import { describe, it, expect } from "vitest";
import { evaluateRules } from "../src/rules";
import { computePositionSize } from "../src/position-sizing";
import { DEFAULT_RISK_CONFIG, DEFAULT_ACCOUNT_STATE } from "@alphatrade/shared-types";
import { makeProposal } from "./fixtures";

function getRule(checks: ReturnType<typeof evaluateRules>, rule: string) {
  const found = checks.find((c) => c.rule === rule);
  if (!found) throw new Error(`rule ${rule} not found`);
  return found;
}

describe("evaluateRules", () => {
  it("passes every rule for a proposal comfortably within a default-config, empty-portfolio state", () => {
    const proposal = makeProposal({ confidence: 90, riskReward: 3 });
    const positionSize = computePositionSize(proposal.entryPrice, proposal.stopLoss, DEFAULT_RISK_CONFIG);
    const checks = evaluateRules(proposal, DEFAULT_RISK_CONFIG, DEFAULT_ACCOUNT_STATE, positionSize);

    expect(checks.every((c) => c.pass)).toBe(true);
  });

  it("fails minimumConfidence when the proposal is below the configured bar", () => {
    const proposal = makeProposal({ confidence: 50 });
    const config = { ...DEFAULT_RISK_CONFIG, minimumConfidence: 75 };
    const checks = evaluateRules(proposal, config, DEFAULT_ACCOUNT_STATE, null);
    expect(getRule(checks, "minimumConfidence").pass).toBe(false);
  });

  it("fails minimumRiskReward when the proposal is below the configured bar", () => {
    const proposal = makeProposal({ riskReward: 1 });
    const config = { ...DEFAULT_RISK_CONFIG, minimumRiskReward: 2 };
    const checks = evaluateRules(proposal, config, DEFAULT_ACCOUNT_STATE, null);
    expect(getRule(checks, "minimumRiskReward").pass).toBe(false);
  });

  it("fails maxOpenPositions when already at the cap", () => {
    const config = { ...DEFAULT_RISK_CONFIG, maxOpenPositions: 3 };
    const accountState = { ...DEFAULT_ACCOUNT_STATE, openPositionsCount: 3 };
    const checks = evaluateRules(makeProposal(), config, accountState, null);
    expect(getRule(checks, "maxOpenPositions").pass).toBe(false);
  });

  it("fails maxDailyLoss when today's P&L has already breached the cap", () => {
    const config = { ...DEFAULT_RISK_CONFIG, maxDailyLossPercent: 3 };
    const accountState = { ...DEFAULT_ACCOUNT_STATE, dailyPnlPercent: -3.5 };
    const checks = evaluateRules(makeProposal(), config, accountState, null);
    expect(getRule(checks, "maxDailyLoss").pass).toBe(false);
  });

  it("passes maxDailyLoss when today's loss is within the cap", () => {
    const config = { ...DEFAULT_RISK_CONFIG, maxDailyLossPercent: 3 };
    const accountState = { ...DEFAULT_ACCOUNT_STATE, dailyPnlPercent: -1 };
    const checks = evaluateRules(makeProposal(), config, accountState, null);
    expect(getRule(checks, "maxDailyLoss").pass).toBe(true);
  });

  it("fails maxLosingStreak when at or beyond the configured max", () => {
    const config = { ...DEFAULT_RISK_CONFIG, maxLosingStreak: 5 };
    const accountState = { ...DEFAULT_ACCOUNT_STATE, currentLosingStreak: 5 };
    const checks = evaluateRules(makeProposal(), config, accountState, null);
    expect(getRule(checks, "maxLosingStreak").pass).toBe(false);
  });

  it("fails maxPortfolioExposure when this position would push exposure over the cap", () => {
    const config = { ...DEFAULT_RISK_CONFIG, accountBalanceUsd: 10_000, maxPortfolioExposurePercent: 25 };
    const proposal = makeProposal({ entryPrice: 100, stopLoss: 95 });
    const positionSize = computePositionSize(100, 95, config); // notional 2000 -> 20% of balance
    const accountState = { ...DEFAULT_ACCOUNT_STATE, currentExposurePercent: 10 }; // 10% + 20% = 30% > 25% cap
    const checks = evaluateRules(proposal, config, accountState, positionSize);
    expect(getRule(checks, "maxPortfolioExposure").pass).toBe(false);
  });

  it("fails maxPortfolioExposure when positionSize is null (degenerate stop)", () => {
    const proposal = makeProposal({ entryPrice: 100, stopLoss: 100 });
    const checks = evaluateRules(proposal, DEFAULT_RISK_CONFIG, DEFAULT_ACCOUNT_STATE, null);
    expect(getRule(checks, "maxPortfolioExposure").pass).toBe(false);
  });
});
