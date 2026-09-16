import { describe, it, expect } from "vitest";
import { computePositionSize } from "../src/position-sizing";
import { DEFAULT_RISK_CONFIG } from "@alphatrade/shared-types";

describe("computePositionSize", () => {
  it("sizes to exactly the risk-per-trade amount when under the max position cap", () => {
    // balance=10000, riskPerTrade=1% -> riskAmountUsd=100; stop distance=5 -> units=20, notional=2000 (== 20% cap, not over)
    const result = computePositionSize(100, 95, {
      ...DEFAULT_RISK_CONFIG,
      accountBalanceUsd: 10_000,
      riskPerTradePercent: 1,
      maxPositionSizePercent: 20,
    });

    expect(result).not.toBeNull();
    expect(result!.units).toBeCloseTo(20, 10);
    expect(result!.notionalValueUsd).toBeCloseTo(2000, 10);
    expect(result!.riskAmountUsd).toBeCloseTo(100, 10);
    expect(result!.cappedByMaxPositionSize).toBe(false);
  });

  it("caps notional at maxPositionSizePercent when the risk-based size would exceed it", () => {
    // balance=10000, riskPerTrade=1% -> riskAmountUsd=100; stop distance=1 -> raw units=100, raw notional=10000
    // maxPositionSizePercent=20% -> maxNotional=2000, so capped: units=20, actual risk=20*1=20
    const result = computePositionSize(100, 99, {
      ...DEFAULT_RISK_CONFIG,
      accountBalanceUsd: 10_000,
      riskPerTradePercent: 1,
      maxPositionSizePercent: 20,
    });

    expect(result).not.toBeNull();
    expect(result!.cappedByMaxPositionSize).toBe(true);
    expect(result!.notionalValueUsd).toBeCloseTo(2000, 10);
    expect(result!.units).toBeCloseTo(20, 10);
    expect(result!.riskAmountUsd).toBeCloseTo(20, 10); // less than the 100 target, because it was capped
  });

  it("returns null for a degenerate stop distance (entry == stopLoss)", () => {
    const result = computePositionSize(100, 100, DEFAULT_RISK_CONFIG);
    expect(result).toBeNull();
  });

  it("works symmetrically for a SHORT-style stop above entry", () => {
    const result = computePositionSize(100, 105, {
      ...DEFAULT_RISK_CONFIG,
      accountBalanceUsd: 10_000,
      riskPerTradePercent: 1,
      maxPositionSizePercent: 50,
    });
    expect(result).not.toBeNull();
    expect(result!.units).toBeCloseTo(20, 10); // riskAmount 100 / perUnitRisk 5
  });
});
