import { describe, it, expect } from "vitest";
import { bollingerBands } from "../src/bollinger";

describe("bollingerBands", () => {
  it("matches a hand-computed band (period=3, multiplier=2)", () => {
    const result = bollingerBands([1, 2, 3, 4, 5], 3, 2);

    expect(result[0]).toEqual({ upper: null, middle: null, lower: null });
    expect(result[1]).toEqual({ upper: null, middle: null, lower: null });

    const stdDev = Math.sqrt(((1 - 2) ** 2 + (2 - 2) ** 2 + (3 - 2) ** 2) / 3);
    expect(result[2]!.middle).toBeCloseTo(2, 10);
    expect(result[2]!.upper).toBeCloseTo(2 + 2 * stdDev, 10);
    expect(result[2]!.lower).toBeCloseTo(2 - 2 * stdDev, 10);
  });

  it("keeps upper >= middle >= lower for every valid index", () => {
    const result = bollingerBands([5, 3, 8, 2, 9, 1, 7, 4, 6], 4, 2);
    for (const band of result) {
      if (band.middle !== null) {
        expect(band.upper!).toBeGreaterThanOrEqual(band.middle);
        expect(band.middle).toBeGreaterThanOrEqual(band.lower!);
      }
    }
  });
});
