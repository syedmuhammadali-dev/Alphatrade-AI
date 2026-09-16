import { describe, it, expect } from "vitest";
import { computeFee, TAKER_FEE_RATE } from "../src/fees";

describe("computeFee", () => {
  it("applies the default taker fee rate", () => {
    expect(computeFee(2000)).toBeCloseTo(2000 * TAKER_FEE_RATE, 10);
    expect(computeFee(2000)).toBeCloseTo(2, 10);
  });

  it("applies a custom fee rate when given", () => {
    expect(computeFee(2000, 0.002)).toBeCloseTo(4, 10);
  });
});
