import { describe, it, expect } from "vitest";
import { computeGrossPnl, computeRealizedPnl, computeUnrealizedPnl, checkExitTrigger } from "../src/pnl";

describe("computeGrossPnl", () => {
  it("is positive for a LONG when price rises", () => {
    expect(computeGrossPnl("LONG", 100, 110, 10)).toBeCloseTo(100, 10);
  });

  it("is negative for a LONG when price falls", () => {
    expect(computeGrossPnl("LONG", 100, 90, 10)).toBeCloseTo(-100, 10);
  });

  it("is positive for a SHORT when price falls", () => {
    expect(computeGrossPnl("SHORT", 100, 90, 10)).toBeCloseTo(100, 10);
  });

  it("is negative for a SHORT when price rises", () => {
    expect(computeGrossPnl("SHORT", 100, 110, 10)).toBeCloseTo(-100, 10);
  });
});

describe("computeRealizedPnl", () => {
  it("subtracts both entry and exit fees from the gross P&L", () => {
    expect(computeRealizedPnl("LONG", 100, 110, 10, 2, 2.2)).toBeCloseTo(95.8, 10);
  });
});

describe("computeUnrealizedPnl", () => {
  it("matches gross P&L (no fees yet)", () => {
    expect(computeUnrealizedPnl("LONG", 100, 110, 10)).toBeCloseTo(100, 10);
  });
});

describe("checkExitTrigger", () => {
  it("detects a LONG stop-loss hit", () => {
    expect(checkExitTrigger("LONG", 94, 95, 110)).toBe("STOP_LOSS");
  });

  it("detects a LONG take-profit hit", () => {
    expect(checkExitTrigger("LONG", 111, 95, 110)).toBe("TAKE_PROFIT");
  });

  it("returns null for a LONG still between its stop and target", () => {
    expect(checkExitTrigger("LONG", 100, 95, 110)).toBeNull();
  });

  it("detects a SHORT stop-loss hit (price rose against the short)", () => {
    expect(checkExitTrigger("SHORT", 106, 105, 90)).toBe("STOP_LOSS");
  });

  it("detects a SHORT take-profit hit (price fell in the short's favor)", () => {
    expect(checkExitTrigger("SHORT", 89, 105, 90)).toBe("TAKE_PROFIT");
  });

  it("returns null for a SHORT still between its stop and target", () => {
    expect(checkExitTrigger("SHORT", 95, 105, 90)).toBeNull();
  });
});
