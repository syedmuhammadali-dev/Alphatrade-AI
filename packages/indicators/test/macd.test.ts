import { describe, it, expect } from "vitest";
import { macd } from "../src/macd";

describe("macd", () => {
  it("matches a hand-computed sequence (fast=2, slow=3, signal=2)", () => {
    const result = macd([1, 2, 3, 4, 5, 6], 2, 3, 2);

    expect(result.macd[2]).toBeCloseTo(0.5, 10);
    expect(result.macd[3]).toBeCloseTo(0.5, 10);
    expect(result.macd[4]).toBeCloseTo(0.5, 10);
    expect(result.macd[5]).toBeCloseTo(0.5, 10);

    expect(result.signal[2]).toBeNull();
    expect(result.signal[3]).toBeCloseTo(0.5, 10);
    expect(result.signal[5]).toBeCloseTo(0.5, 10);

    expect(result.histogram[3]).toBeCloseTo(0, 10);
    expect(result.histogram[5]).toBeCloseTo(0, 10);
  });

  it("returns all nulls before the slow EMA has enough data", () => {
    const result = macd([1, 2], 12, 26, 9);
    expect(result.macd.every((v) => v === null)).toBe(true);
    expect(result.signal.every((v) => v === null)).toBe(true);
  });
});
