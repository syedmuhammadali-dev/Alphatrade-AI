import type { RiskConfig, PositionSize } from "@alphatrade/shared-types";

/**
 * Computes the largest position that keeps risk (entry-to-stop distance)
 * at or below `riskPerTradePercent` of the account balance, then caps it by
 * `maxPositionSizePercent` of the balance if that risk-based size would be
 * larger. Returns null for a degenerate stop (entry == stopLoss).
 */
export function computePositionSize(
  entryPrice: number,
  stopLoss: number,
  config: RiskConfig,
): PositionSize | null {
  const perUnitRisk = Math.abs(entryPrice - stopLoss);
  if (perUnitRisk <= 0) return null;

  const riskAmountUsd = config.accountBalanceUsd * (config.riskPerTradePercent / 100);
  const rawUnits = riskAmountUsd / perUnitRisk;
  const rawNotional = rawUnits * entryPrice;

  const maxNotional = config.accountBalanceUsd * (config.maxPositionSizePercent / 100);
  const cappedByMaxPositionSize = rawNotional > maxNotional;
  const notionalValueUsd = cappedByMaxPositionSize ? maxNotional : rawNotional;
  const units = notionalValueUsd / entryPrice;
  const actualRiskAmountUsd = units * perUnitRisk;

  return {
    units,
    notionalValueUsd,
    riskAmountUsd: actualRiskAmountUsd,
    cappedByMaxPositionSize,
  };
}
