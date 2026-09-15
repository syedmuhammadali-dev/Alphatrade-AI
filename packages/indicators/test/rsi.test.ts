import { describe, it, expect } from "vitest";
import { rsi } from "../src/rsi";

describe("rsi", () => {
  it("matches a hand-computed Wilder RSI sequence (period=2)", () => {
    const result = rsi([1, 2, 1, 2, 3], 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBeCloseTo(50, 10);
    expect(result[3]).toBeCloseTo(75, 10);
    expect(result[4]).toBeCloseTo(87.5, 10);
  });

  it("returns 100 for a series that only ever gains", () => {
    const result = rsi([1, 2, 3, 4, 5], 2);
    expect(result[2]).toBe(100);
    expect(result[4]).toBe(100);
  });

  it("returns 0 for a series that only ever loses", () => {
    const result = rsi([5, 4, 3, 2, 1], 2);
    expect(result[2]).toBe(0);
    expect(result[4]).toBe(0);
  });

  it("stays within [0, 100] for a mixed random-ish series", () => {
    const closes = [10, 12, 9, 15, 14, 16, 13, 18, 17, 20, 19, 22, 21, 25, 24];
    const result = rsi(closes, 14);
    for (const value of result) {
      if (value !== null) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});
