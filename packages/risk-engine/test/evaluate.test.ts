import { describe, it, expect } from "vitest";
import { evaluateProposal } from "../src/evaluate";
import { DEFAULT_RISK_CONFIG, DEFAULT_ACCOUNT_STATE } from "@alphatrade/shared-types";
import { makeProposal } from "./fixtures";

describe("evaluateProposal", () => {
  it("APPROVEs a strong proposal against an empty portfolio with default config", () => {
    const result = evaluateProposal(makeProposal({ confidence: 85, riskReward: 3 }));
    expect(result.decision).toBe("APPROVED");
    expect(result.positionSize).not.toBeNull();
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("REJECTs when confidence is below the configured minimum, reporting that reason", () => {
    const result = evaluateProposal(makeProposal({ confidence: 40 }));
    expect(result.decision).toBe("REJECTED");
    expect(result.reasons.some((r) => r.toLowerCase().includes("confidence"))).toBe(true);
  });

  it("reports every failing rule, not just the first one", () => {
    const proposal = makeProposal({ confidence: 10, riskReward: 0.5 });
    const config = { ...DEFAULT_RISK_CONFIG, minimumConfidence: 75, minimumRiskReward: 2 };
    const accountState = { ...DEFAULT_ACCOUNT_STATE, openPositionsCount: 3, maxOpenPositions: 3 };

    const result = evaluateProposal(proposal, { ...config, maxOpenPositions: 3 }, { ...accountState, openPositionsCount: 3 });

    expect(result.decision).toBe("REJECTED");
    const failingReasonText = result.reasons.join(" ").toLowerCase();
    expect(failingReasonText).toContain("confidence");
    expect(failingReasonText.includes("risk:reward") || failingReasonText.includes("risk reward")).toBe(true);
  });

  it("uses default config and empty account state when none are provided", () => {
    const result = evaluateProposal(makeProposal({ confidence: 90, riskReward: 3 }));
    expect(result.decision).toBe("APPROVED");
  });
});
