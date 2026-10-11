import { describe, it, expect } from "vitest";
import { extractSymbol } from "../lib/symbol";

describe("extractSymbol", () => {
  it("extracts and uppercases the symbol from a Binance trade URL", () => {
    expect(extractSymbol("https://www.binance.com/en/trade/BTC_USDT")).toBe("BTCUSDT");
  });

  it("is case-insensitive on the input", () => {
    expect(extractSymbol("https://www.binance.com/en/trade/btc_usdt?type=spot")).toBe("BTCUSDT");
  });

  it("returns null for a non-trade page", () => {
    expect(extractSymbol("https://www.binance.com/en/markets/overview")).toBeNull();
  });

  it("returns null for a malformed trade path", () => {
    expect(extractSymbol("https://www.binance.com/en/trade/BTCUSDT")).toBeNull();
  });
});
