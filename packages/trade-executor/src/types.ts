export type PositionSide = "LONG" | "SHORT";

export interface OpenPositionParams {
  userId: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  strategy: string;
}

export interface PositionRecord {
  id: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  feesUsd: number;
  openedAt: string;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  position?: PositionRecord;
}

/**
 * Implemented by both PaperTradingExecutor (Phase 6) and, later,
 * LiveTradingExecutor (Phase 9) — the Decision Engine and Risk Engine work
 * identically against either. No implementation of this interface is
 * itself allowed to skip the risk check; callers must only invoke
 * openPosition() with an already-APPROVED proposal.
 */
export interface TradeExecutor {
  name: string;
  openPosition(params: OpenPositionParams): Promise<ExecutionResult>;
  closePosition(userId: string, positionId: string, reason: "MANUAL" | "STOP_LOSS" | "TAKE_PROFIT"): Promise<ExecutionResult>;
}
