/** Risk:reward as a positive ratio, or null if the levels don't make sense (e.g. zero risk). */
export function computeRiskReward(entry: number, stopLoss: number, takeProfit: number, side: "LONG" | "SHORT"): number | null {
  const risk = side === "LONG" ? entry - stopLoss : stopLoss - entry;
  const reward = side === "LONG" ? takeProfit - entry : entry - takeProfit;
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
