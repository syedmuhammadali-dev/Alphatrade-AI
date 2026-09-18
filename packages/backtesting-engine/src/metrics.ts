import type { BacktestMetrics, BacktestTrade } from "@alphatrade/shared-types";

/**
 * Sharpe here is a simplified reward-to-variability ratio over the trade
 * sequence's per-trade returns (not annualized — a backtest's interval and
 * date range are user-chosen, so there's no single "periods per year" to
 * annualize against). It's a relative measure for comparing backtests run
 * with the same interval, not a textbook annualized Sharpe.
 */
function computeSharpe(equityCurve: number[]): number | null {
  if (equityCurve.length < 3) return null;

  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1]!;
    if (prev === 0) continue;
    returns.push((equityCurve[i]! - prev) / prev);
  }
  if (returns.length < 2) return null;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return null;

  return (mean / stdDev) * Math.sqrt(returns.length);
}

function computeMaxDrawdownPercent(equityCurve: number[]): number {
  let peak = equityCurve[0] ?? 0;
  let maxDrawdown = 0;

  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const drawdown = ((peak - equity) / peak) * 100;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }
  return maxDrawdown;
}

export function computeMetrics(
  trades: BacktestTrade[],
  initialBalanceUsd: number,
  finalBalanceUsd: number,
): BacktestMetrics {
  const equityCurve = [initialBalanceUsd, ...trades.map((_, i) => {
    const realized = trades.slice(0, i + 1).reduce((sum, t) => sum + t.realizedPnlUsd, 0);
    return initialBalanceUsd + realized;
  })];

  const wins = trades.filter((t) => t.realizedPnlUsd > 0).length;
  const losses = trades.filter((t) => t.realizedPnlUsd <= 0).length;
  const grossProfit = trades.filter((t) => t.realizedPnlUsd > 0).reduce((sum, t) => sum + t.realizedPnlUsd, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.realizedPnlUsd < 0).reduce((sum, t) => sum + t.realizedPnlUsd, 0));

  const riskRewards = trades.map((t) => t.realizedRiskReward).filter((r): r is number => r !== null);

  return {
    initialBalanceUsd,
    finalBalanceUsd,
    totalReturnPercent: ((finalBalanceUsd - initialBalanceUsd) / initialBalanceUsd) * 100,
    tradeCount: trades.length,
    wins,
    losses,
    winRate: trades.length > 0 ? (wins / trades.length) * 100 : null,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
    sharpeRatio: computeSharpe(equityCurve),
    maxDrawdownPercent: computeMaxDrawdownPercent(equityCurve),
    averageRiskReward: riskRewards.length > 0 ? riskRewards.reduce((sum, r) => sum + r, 0) / riskRewards.length : null,
  };
}
