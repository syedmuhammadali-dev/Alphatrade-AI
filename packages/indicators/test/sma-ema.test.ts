import { describe, it, expect } from "vitest";
import { sma } from "../src/sma";
import { ema } from "../src/ema";

describe("sma", () => {
  it("computes a simple moving average with nulls before the window fills", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("returns the constant value for a flat series once seeded", () => {
    expect(sma([5, 5, 5, 5], 2)).toEqual([null, 5, 5, 5]);
  });
});

describe("ema", () => {
  it("seeds with the SMA and applies the EMA recurrence (hand-computed)", () => {
    const result = ema([1, 2, 3, 4, 5], 3);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(2, 10);
    expect(result[3]).toBeCloseTo(3, 10);
    expect(result[4]).toBeCloseTo(4, 10);
  });

  it("returns the constant value for a flat series once seeded", () => {
    const result = ema([5, 5, 5, 5, 5], 3);
    expect(result[2]).toBeCloseTo(5, 10);
    expect(result[4]).toBeCloseTo(5, 10);
  });

  it("returns all nulls when there isn't enough data for the period", () => {
    expect(ema([1, 2], 5)).toEqual([null, null]);
  });
});
