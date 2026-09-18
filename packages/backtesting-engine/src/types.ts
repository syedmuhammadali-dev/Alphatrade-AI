import type { RiskConfig } from "@alphatrade/shared-types";

export interface BacktestSimConfig {
  symbol: string;
  interval: string;
  strategies?: string[];
  minConfidence: number;
  minRiskReward: number;
  initialBalanceUsd: number;
  riskConfig?: Partial<RiskConfig>;
}

export interface OpenSimPosition {
  strategy: string;
  entryTime: string;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  entryFeeUsd: number;
}
