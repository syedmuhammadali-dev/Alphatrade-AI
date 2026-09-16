import type { PositionSide } from "./types";

export function computeGrossPnl(side: PositionSide, entryPrice: number, exitPrice: number, quantity: number): number {
  const direction = side === "LONG" ? 1 : -1;
  return (exitPrice - entryPrice) * quantity * direction;
}

/** Net realized P&L after both the entry and exit fees. */
export function computeRealizedPnl(
  side: PositionSide,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  entryFeeUsd: number,
  exitFeeUsd: number,
): number {
  return computeGrossPnl(side, entryPrice, exitPrice, quantity) - entryFeeUsd - exitFeeUsd;
}

/** Mark-to-market unrealized P&L for a still-open position (fees not yet incurred on exit). */
export function computeUnrealizedPnl(side: PositionSide, entryPrice: number, currentPrice: number, quantity: number): number {
  return computeGrossPnl(side, entryPrice, currentPrice, quantity);
}

/** Whether the current price has crossed this position's stop-loss or take-profit level. */
export function checkExitTrigger(
  side: PositionSide,
  currentPrice: number,
  stopLoss: number,
  takeProfit: number,
): "STOP_LOSS" | "TAKE_PROFIT" | null {
  if (side === "LONG") {
    if (currentPrice <= stopLoss) return "STOP_LOSS";
    if (currentPrice >= takeProfit) return "TAKE_PROFIT";
    return null;
  }
  if (currentPrice >= stopLoss) return "STOP_LOSS";
  if (currentPrice <= takeProfit) return "TAKE_PROFIT";
  return null;
}
